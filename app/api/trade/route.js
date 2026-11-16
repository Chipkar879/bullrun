import { admin, getUserFromRequest } from '@/lib/supabaseAdmin';
import { getServerPrices, recomputeNetWorth } from '@/lib/serverMarket';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { sym, side, qty } = await req.json();
    const quantity = Number(qty);

    if (typeof sym !== 'string' || !['BUY', 'SELL'].includes(side) ||
        !Number.isFinite(quantity) || quantity <= 0 || quantity > 1e6) {
      return Response.json({ error: 'Invalid order' }, { status: 400 });
    }

    const prices = await getServerPrices(new URL(req.url).origin);
    const price = prices[sym];
    if (!price) return Response.json({ error: 'Price not available' }, { status: 400 });

    const { data, error } = await admin.rpc('execute_trade', {
      p_user: user.id, p_sym: sym, p_side: side, p_qty: quantity, p_price: price,
    });
    if (error) return Response.json({ error: error.message }, { status: 400 });

    const netWorth = await recomputeNetWorth(user.id, prices);
    return Response.json({ balance: data.balance, price, netWorth });
  } catch (e) {
    console.error('trade failed', e);
    return Response.json({ error: 'Trade failed' }, { status: 500 });
  }
}