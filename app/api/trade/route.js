import { admin, getUserFromRequest } from '@/lib/supabaseAdmin';
import { getServerPrices, recomputeNetWorth } from '@/lib/serverMarket';
import {
  assetClassOf,
  usesDeliveryRules,
  computeBuyCosts,
  computeSellCosts,
  intradayQtyFor,
  istDayStartMs,
} from '@/lib/costs';

export const dynamic = 'force-dynamic';

const bad = (message, status = 400) => Response.json({ error: message }, { status });
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const round4 = (n) => Math.round((n + Number.EPSILON) * 10000) / 10000;

// Works out the price, charges and cash effect. Used for both the preview and the real trade,
// so the number the student sees before confirming is the number the server charges.
async function buildQuote(userId, sym, side, qty, price) {
  const cls = assetClassOf(sym);
  const gross = round2(price * qty);

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('wallet_balance')
    .eq('id', userId)
    .single();
  if (profileError) throw profileError;

  const balance = Number(profile.wallet_balance);
  let costs;
  let avgCost = 0;

  if (side === 'BUY') {
    costs = computeBuyCosts({ cls, price, qty });
  } else {
    const { data: holding, error: holdingError } = await admin
      .from('user_holdings')
      .select('shares, avg_price')
      .eq('user_id', userId)
      .eq('sym', sym)
      .maybeSingle();
    if (holdingError) throw holdingError;
    if (!holding || Number(holding.shares) < qty) {
      return { error: 'Insufficient shares to sell.' };
    }
    avgCost = Number(holding.avg_price);

    let intradayQty = 0;
    if (usesDeliveryRules(cls)) {
      const since = new Date(istDayStartMs()).toISOString();
      const { data: today, error: todayError } = await admin
        .from('trade_history')
        .select('side, qty')
        .eq('user_id', userId)
        .eq('sym', sym)
        .gte('created_at', since);
      if (todayError) throw todayError;

      let boughtToday = 0;
      let soldToday = 0;
      (today || []).forEach((row) => {
        if (row.side === 'BUY') boughtToday += Number(row.qty);
        if (row.side === 'SELL') soldToday += Number(row.qty);
      });
      intradayQty = intradayQtyFor({ boughtToday, soldToday, qty });
    }
    costs = computeSellCosts({ cls, price, qty, intradayQty, avgCost });
  }

  const cashEffect = round2(side === 'BUY' ? gross + costs.total : gross - costs.total);

  if (side === 'SELL' && cashEffect <= 0) {
    return { error: 'This sale is too small to cover its charges. Sell a larger amount.' };
  }

  return {
    quote: {
      sym,
      side,
      qty,
      price,
      assetClass: cls,
      gross,
      fees: { lines: costs.lines, total: costs.total },
      cashEffect,
      balance,
      affordable: side === 'BUY' ? balance >= cashEffect : true,
      intradayQty: costs.intradayQty || 0,
      deliveryQty: side === 'SELL' ? (costs.deliveryQty ?? qty) : 0,
    },
    avgCost,
    costs,
  };
}

export async function POST(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return bad('Unauthorized', 401);

    const body = await req.json().catch(() => ({}));
    const action = body.action === 'quote' ? 'quote' : 'execute';
    const sym = body.sym;
    const side = body.side;
    const qty = round4(Number(body.qty));

    if (typeof sym !== 'string' || !['BUY', 'SELL'].includes(side) ||
        !Number.isFinite(qty) || qty < 0.0001 || qty > 1e6) {
      return bad('Invalid order');
    }

    const prices = await getServerPrices(new URL(req.url).origin);
    const price = prices[sym];
    if (!price) return bad('Price not available');

    const built = await buildQuote(user.id, sym, side, qty, price);
    if (built.error) return bad(built.error);

    if (action === 'quote') {
      if (side === 'BUY' && !built.quote.affordable) {
        return Response.json(
          { ...built.quote, error: 'Insufficient cash balance for this order plus charges.' },
          { status: 200 }
        );
      }
      return Response.json(built.quote);
    }

    const { data, error } = await admin.rpc('execute_trade_v2', {
      p_user: user.id,
      p_sym: sym,
      p_side: side,
      p_qty: qty,
      p_price: price,
      p_fees: {
        total: built.costs.total,
        lines: built.costs.lines,
        class: built.quote.assetClass,
      },
      p_intraday_qty: built.quote.intradayQty,
      p_kind: 'MARKET',
    });
    if (error) return bad(error.message);

    const netWorth = await recomputeNetWorth(user.id, prices);

    return Response.json({
      balance: data.balance,
      price,
      gross: data.gross,
      fees: built.quote.fees,
      cashEffect: built.quote.cashEffect,
      intradayQty: built.quote.intradayQty,
      realizedGross: data.realized_gross,
      historyId: data.history_id,
      netWorth,
    });
  } catch (e) {
    console.error('trade failed', e);
    return bad('Trade failed', 500);
  }
}