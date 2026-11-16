import { getUserFromRequest } from '@/lib/supabaseAdmin';
import { getServerPrices, recomputeNetWorth } from '@/lib/serverMarket';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const prices = await getServerPrices(new URL(req.url).origin);
    const netWorth = await recomputeNetWorth(user.id, prices);
    return Response.json({ netWorth });
  } catch (e) {
    console.error('sync-networth failed', e);
    return Response.json({ error: 'Sync failed' }, { status: 500 });
  }
}