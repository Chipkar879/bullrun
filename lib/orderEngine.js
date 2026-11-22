// lib/orderEngine.js
// Server-side order filling. Used by the orders route (when you open the page or place an order)
// and by the daily cron job. SERVER ONLY.
//
// How a fill works: prices are a pure function of (asset, time), so we ask the price route to
// replay the price series from the moment the order was placed and tell us the FIRST time the
// price met the trigger. The order fills at that price (plus slippage and charges), even if it
// happened while the user was away. Orders live for 24 hours.

import { admin } from './supabaseAdmin';
import { getServerPrices, recomputeNetWorth } from './serverMarket';
import { ASSET_BY_SYM } from './catalog';
import {
  assetClassOf,
  applySlippage,
  usesDeliveryRules,
  computeBuyCosts,
  computeSellCosts,
  intradayQtyFor,
  istDayStartMs,
} from './costs';

export const ORDER_KINDS = ['LIMIT_BUY', 'LIMIT_SELL', 'STOP_LOSS', 'TAKE_PROFIT'];
export const ORDER_LIFE_MS = 24 * 60 * 60 * 1000;
export const SELL_KINDS = ['LIMIT_SELL', 'STOP_LOSS', 'TAKE_PROFIT'];

// 'below' = triggers when the price falls to the level; 'above' = when it rises to it.
export const DIR_BY_KIND = {
  LIMIT_BUY: 'below',
  STOP_LOSS: 'below',
  LIMIT_SELL: 'above',
  TAKE_PROFIT: 'above',
};

const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

async function fillOne(order, marketPrice, hitMs) {
  const userId = order.user_id;
  const sym = order.sym;
  const side = SELL_KINDS.includes(order.kind) ? 'SELL' : 'BUY';
  let qty = Number(order.qty);
  const cls = assetClassOf(sym);

  const { data: profile, error: pErr } = await admin
    .from('profiles').select('wallet_balance').eq('id', userId).single();
  if (pErr) throw pErr;

  let avgCost = 0;
  if (side === 'SELL') {
    const { data: holding, error: hErr } = await admin
      .from('user_holdings').select('shares, avg_price').eq('user_id', userId).eq('sym', sym).maybeSingle();
    if (hErr) throw hErr;
    const owned = Number(holding?.shares || 0);
    if (owned <= 0) throw new Error('No units left to sell');
    qty = Math.min(qty, owned);
    avgCost = Number(holding.avg_price);
  }

  const slip = applySlippage({ side, price: marketPrice, qty, liq: ASSET_BY_SYM[sym]?.liq });
  const price = slip.fillPrice;
  const gross = r2(price * qty);

  let costs;
  let intradayQty = 0;
  if (side === 'BUY') {
    costs = computeBuyCosts({ cls, price, qty });
    const need = r2(gross + costs.total);
    if (Number(profile.wallet_balance) < need) throw new Error('Not enough cash when the order triggered');
  } else {
    if (usesDeliveryRules(cls)) {
      const since = new Date(istDayStartMs(hitMs)).toISOString();
      const { data: today } = await admin
        .from('trade_history').select('side, qty').eq('user_id', userId).eq('sym', sym).gte('created_at', since);
      let b = 0;
      let s = 0;
      (today || []).forEach((row) => {
        if (row.side === 'BUY') b += Number(row.qty);
        if (row.side === 'SELL') s += Number(row.qty);
      });
      intradayQty = intradayQtyFor({ boughtToday: b, soldToday: s, qty });
    }
    costs = computeSellCosts({ cls, price, qty, intradayQty, avgCost });
    if (r2(gross - costs.total) <= 0) throw new Error('Sale too small to cover its charges');
  }

  const args = {
    p_user: userId,
    p_sym: sym,
    p_side: side,
    p_qty: qty,
    p_price: price,
    p_fees: {
      total: costs.total,
      lines: costs.lines,
      class: cls,
      slippage: slip.amount,
      market_price: marketPrice,
    },
    p_intraday_qty: intradayQty,
  };

  let res = await admin.rpc('execute_trade_v2', { ...args, p_kind: order.kind });
  if (res.error) res = await admin.rpc('execute_trade_v2', { ...args, p_kind: 'MARKET' });
  if (res.error) throw new Error(res.error.message);

  // Show the trade at the moment the price actually met the trigger (chart markers, history).
  const historyId = res.data?.history_id;
  if (historyId) {
    await admin.from('trade_history').update({ created_at: new Date(hitMs).toISOString() }).eq('id', historyId);
  }

  return { side, qty, price };
}

// Check open orders. userId = one user (page / order desk) or null = everybody (cron).
export async function processOrders(origin, userId = null) {
  const out = { filled: [], failed: [], expired: [] };

  let query = admin
    .from('pending_orders')
    .select('id, user_id, sym, kind, qty, trigger_price, created_at')
    .eq('status', 'OPEN')
    .order('created_at', { ascending: true })
    .limit(1000);
  if (userId) query = query.eq('user_id', userId);
  const { data: orders, error } = await query;
  if (error) throw error;
  if (!orders || !orders.length) return out;

  const now = Date.now();
  const scan = orders.map((o) => {
    const createdMs = new Date(o.created_at).getTime();
    return {
      id: o.id,
      sym: o.sym,
      dir: DIR_BY_KIND[o.kind] || 'below',
      trigger: Number(o.trigger_price),
      from: createdMs,
      until: Math.min(now, createdMs + ORDER_LIFE_MS),
    };
  });

  const res = await fetch(`${origin}/api/historical-prices`, {
    method: 'POST',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scan }),
  });
  if (!res.ok) throw new Error(`Price scan returned ${res.status}`);
  const hits = (await res.json()).scan || {};

  const touched = new Set();

  for (const order of orders) {
    const hit = hits[order.id];
    const expired = now >= new Date(order.created_at).getTime() + ORDER_LIFE_MS;

    if (!hit) {
      if (expired) {
        const { data: done } = await admin
          .from('pending_orders')
          .update({ status: 'CANCELLED', note: 'Expired after 24 hours', closed_at: new Date().toISOString() })
          .eq('id', order.id).eq('status', 'OPEN').select('id');
        if (done && done.length) out.expired.push({ sym: order.sym, kind: order.kind });
      }
      continue;
    }

    // Claim first, so two open tabs (or the cron job and a tab) can never fill it twice.
    const { data: claimed } = await admin
      .from('pending_orders')
      .update({ status: 'FILLED', fill_price: hit.price, closed_at: new Date(hit.t).toISOString() })
      .eq('id', order.id).eq('status', 'OPEN').select('id');
    if (!claimed || !claimed.length) continue;

    try {
      const done = await fillOne(order, hit.price, hit.t);
      touched.add(order.user_id);
      out.filled.push({ sym: order.sym, kind: order.kind, qty: done.qty, price: done.price });

      if (done.side === 'SELL') {
        const { data: left } = await admin
          .from('user_holdings').select('shares').eq('user_id', order.user_id).eq('sym', order.sym).maybeSingle();
        if (!left || Number(left.shares) <= 0) {
          await admin
            .from('pending_orders')
            .update({ status: 'CANCELLED', note: 'Position closed', closed_at: new Date().toISOString() })
            .eq('user_id', order.user_id).eq('sym', order.sym).eq('status', 'OPEN')
            .in('kind', SELL_KINDS);
        }
      }
    } catch (e) {
      const reason = String(e?.message || 'Order failed').slice(0, 200);
      await admin.from('pending_orders').update({ status: 'FAILED', fill_price: null, note: reason }).eq('id', order.id);
      out.failed.push({ sym: order.sym, kind: order.kind, reason });
    }
  }

  if (touched.size) {
    const prices = await getServerPrices(origin);
    for (const id of touched) {
      try { await recomputeNetWorth(id, prices); } catch (e) { console.error('net worth refresh failed', e); }
    }
  }

  return out;
}
