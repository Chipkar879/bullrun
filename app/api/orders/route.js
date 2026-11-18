import { admin, getUserFromRequest } from '@/lib/supabaseAdmin';
import { getServerPrices, recomputeNetWorth } from '@/lib/serverMarket';

export const dynamic = 'force-dynamic';

const KINDS = ['LIMIT_BUY', 'STOP_LOSS', 'TAKE_PROFIT'];
const MAX_OPEN_ORDERS = 20;

const bad = (message, status = 400) => Response.json({ error: message }, { status });

const inr = (value) =>
  `₹${Number(value).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

// LIMIT_BUY and STOP_LOSS trigger when the price falls to the level.
// TAKE_PROFIT triggers when the price rises to the level.
const isTriggered = (kind, price, trigger) =>
  kind === 'TAKE_PROFIT' ? price >= trigger : price <= trigger;

async function createOrder(user, body, prices) {
  const sym = body.sym;
  const kind = body.kind;
  const qty = Number(body.qty);
  const trigger = Number(Number(body.trigger).toFixed(2));

  if (typeof sym !== 'string' || !KINDS.includes(kind)) return bad('Invalid order');

  if (
    !Number.isFinite(qty) || qty <= 0 || qty > 1e6 ||
    !Number.isFinite(trigger) || trigger <= 0
  ) {
    return bad('Enter a valid quantity and trigger price.');
  }

  const price = prices[sym];
  if (!price) return bad('Price not available for this asset.');

  if (kind === 'LIMIT_BUY' && trigger >= price) {
    return bad(`A limit buy price must be below the current price (${inr(price)}). Use a market order to buy now.`);
  }
  if (kind === 'STOP_LOSS' && trigger >= price) {
    return bad(`A stop-loss price must be below the current price (${inr(price)}).`);
  }
  if (kind === 'TAKE_PROFIT' && trigger <= price) {
    return bad(`A take-profit price must be above the current price (${inr(price)}).`);
  }

  const { count, error: countError } = await admin
    .from('pending_orders')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'OPEN');

  if (countError) throw countError;
  if ((count || 0) >= MAX_OPEN_ORDERS) {
    return bad(`You can have at most ${MAX_OPEN_ORDERS} open orders. Cancel one first.`);
  }

  if (kind !== 'LIMIT_BUY') {
    const { data: holding, error: holdingError } = await admin
      .from('user_holdings')
      .select('shares')
      .eq('user_id', user.id)
      .eq('sym', sym)
      .maybeSingle();

    if (holdingError) throw holdingError;
    if (!holding || Number(holding.shares) < qty) {
      return bad('You do not own enough shares of this asset for that order.');
    }
  }

  const { data, error } = await admin
    .from('pending_orders')
    .insert({ user_id: user.id, sym, kind, qty, trigger_price: trigger })
    .select('id')
    .single();

  if (error) throw error;
  return Response.json({ ok: true, id: data.id });
}

async function cancelOrder(user, body) {
  if (typeof body.id !== 'string') return bad('Invalid order');

  const { data, error } = await admin
    .from('pending_orders')
    .update({ status: 'CANCELLED', closed_at: new Date().toISOString() })
    .eq('id', body.id)
    .eq('user_id', user.id)
    .eq('status', 'OPEN')
    .select('id');

  if (error) throw error;
  if (!data || !data.length) return bad('That order is no longer open.');
  return Response.json({ ok: true });
}

async function checkOrders(user, prices) {
  const { data: orders, error } = await admin
    .from('pending_orders')
    .select('id, sym, kind, qty, trigger_price')
    .eq('user_id', user.id)
    .eq('status', 'OPEN')
    .order('created_at', { ascending: true });

  if (error) throw error;

  const filled = [];
  const failed = [];

  for (const order of orders || []) {
    const price = prices[order.sym];
    const trigger = Number(order.trigger_price);

    if (!price || !isTriggered(order.kind, price, trigger)) continue;

    // Claim the order first so two open tabs can never fill it twice.
    const { data: claimed } = await admin
      .from('pending_orders')
      .update({ status: 'FILLED', fill_price: price, closed_at: new Date().toISOString() })
      .eq('id', order.id)
      .eq('status', 'OPEN')
      .select('id');

    if (!claimed || !claimed.length) continue;

    const side = order.kind === 'LIMIT_BUY' ? 'BUY' : 'SELL';
    let qty = Number(order.qty);

    try {
      if (side === 'SELL') {
        const { data: holding } = await admin
          .from('user_holdings')
          .select('shares')
          .eq('user_id', user.id)
          .eq('sym', order.sym)
          .maybeSingle();

        const owned = Number(holding?.shares || 0);
        if (owned <= 0) throw new Error('No shares left to sell');
        qty = Math.min(qty, owned);
      }

      const { error: tradeError } = await admin.rpc('execute_trade', {
        p_user: user.id,
        p_sym: order.sym,
        p_side: side,
        p_qty: qty,
        p_price: price,
      });

      if (tradeError) throw new Error(tradeError.message);

      filled.push({ sym: order.sym, kind: order.kind, qty, price });

      if (side === 'SELL') {
        const { data: left } = await admin
          .from('user_holdings')
          .select('shares')
          .eq('user_id', user.id)
          .eq('sym', order.sym)
          .maybeSingle();

        if (!left || Number(left.shares) <= 0) {
          await admin
            .from('pending_orders')
            .update({
              status: 'CANCELLED',
              note: 'Position closed',
              closed_at: new Date().toISOString(),
            })
            .eq('user_id', user.id)
            .eq('sym', order.sym)
            .eq('status', 'OPEN')
            .in('kind', ['STOP_LOSS', 'TAKE_PROFIT']);
        }
      }
    } catch (e) {
      const reason = String(e?.message || 'Order failed').slice(0, 200);

      await admin
        .from('pending_orders')
        .update({ status: 'FAILED', fill_price: null, note: reason })
        .eq('id', order.id);

      failed.push({ sym: order.sym, kind: order.kind, reason });
    }
  }

  if (filled.length) await recomputeNetWorth(user.id, prices);

  return { filled, failed };
}

export async function POST(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const prices = await getServerPrices(new URL(req.url).origin);

    if (body.action === 'create') return await createOrder(user, body, prices);
    if (body.action === 'cancel') return await cancelOrder(user, body);
    if (body.action === 'check') return Response.json(await checkOrders(user, prices));

    return bad('Unknown action');
  } catch (e) {
    console.error('orders failed', e);
    return Response.json({ error: 'Order request failed' }, { status: 500 });
  }
}
