import { admin, getUserFromRequest } from '@/lib/supabaseAdmin';
import { getServerPrices } from '@/lib/serverMarket';
import { isTradable } from '@/lib/catalog';
import { ORDER_KINDS, SELL_KINDS, processOrders } from '@/lib/orderEngine';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const MAX_OPEN_ORDERS = 20;
const bad = (message, status = 400) => Response.json({ error: message }, { status });
const rs = (value) => 'Rs ' + Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

async function createOrder(user, body, prices) {
  const sym = body.sym;
  const kind = body.kind;
  const qty = Number(Number(body.qty).toFixed(4));
  const trigger = Number(Number(body.trigger).toFixed(2));

  if (typeof sym !== 'string' || !ORDER_KINDS.includes(kind)) return bad('Invalid order');
  if (!isTradable(sym)) return bad('This asset is view-only and cannot be traded.');
  if (!Number.isFinite(qty) || qty < 0.0001 || qty > 1e6 || !Number.isFinite(trigger) || trigger <= 0) {
    return bad('Enter a valid quantity and trigger price.');
  }

  const price = prices[sym];
  if (!price) return bad('Price not available for this asset.');

  if (kind === 'LIMIT_BUY' && trigger >= price) {
    return bad('A limit buy price must be below the current price (' + rs(price) + '). Use a normal buy to buy now.');
  }
  if (kind === 'STOP_LOSS' && trigger >= price) {
    return bad('A stop-loss price must be below the current price (' + rs(price) + ').');
  }
  if ((kind === 'TAKE_PROFIT' || kind === 'LIMIT_SELL') && trigger <= price) {
    return bad('A sell-at-higher-price must be above the current price (' + rs(price) + ').');
  }

  const { count, error: countError } = await admin
    .from('pending_orders')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'OPEN');
  if (countError) throw countError;
  if ((count || 0) >= MAX_OPEN_ORDERS) return bad('You can have at most ' + MAX_OPEN_ORDERS + ' open orders. Cancel one first.');

  if (SELL_KINDS.includes(kind)) {
    const { data: holding, error: holdingError } = await admin
      .from('user_holdings').select('shares').eq('user_id', user.id).eq('sym', sym).maybeSingle();
    if (holdingError) throw holdingError;
    if (!holding || Number(holding.shares) < qty) return bad('You do not own enough units of this asset for that order.');
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
    .update({ status: 'CANCELLED', note: 'Cancelled by you', closed_at: new Date().toISOString() })
    .eq('id', body.id)
    .eq('user_id', user.id)
    .eq('status', 'OPEN')
    .select('id');
  if (error) throw error;
  if (!data || !data.length) return bad('That order is no longer open.');
  return Response.json({ ok: true });
}

async function listOrders(user) {
  const { data, error } = await admin
    .from('pending_orders')
    .select('id, sym, kind, qty, trigger_price, status, fill_price, note, created_at, closed_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(40);
  if (error) throw error;
  return Response.json({ orders: data || [] });
}

export async function POST(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const origin = new URL(req.url).origin;

    if (body.action === 'create') return await createOrder(user, body, await getServerPrices(origin));
    if (body.action === 'cancel') return await cancelOrder(user, body);
    if (body.action === 'list') return await listOrders(user);
    if (body.action === 'check') return Response.json(await processOrders(origin, user.id));

    return bad('Unknown action');
  } catch (e) {
    console.error('orders failed', e);
    return Response.json({ error: 'Order request failed' }, { status: 500 });
  }
}
