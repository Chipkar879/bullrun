import { admin, getUserFromRequest } from '@/lib/supabaseAdmin';
import { getServerPrices, recomputeNetWorth } from '@/lib/serverMarket';

export const dynamic = 'force-dynamic';

// Annual dividend yield (%) for each asset. Change a number here to change its payout.
// Each real day pays one "simulated month": annual yield / 12.
const YIELDS = {
  GOLDVLT: 0,
  SILVRVLT: 0,
  IRONWORKS: 2.4,
  ALUMINA: 0.55,
  TERRAMIN: 6.5,
  CARBONIA: 5.2,
  PRIMEBANK: 1.66,
  UNITYBANK: 0.85,
  NATBANK: 1.7,
  CREDITO: 0.35,
  INFOSPHR: 4.55,
  TECHNOVA: 2.33,
  SKYLINK: 0.6,
  ENERGIA: 0.61,
  PETROFLD: 2.8,
  VOLTARA: 2.1,
  HARBORLN: 0.5,
  VITACURE: 0.8,
  AURUM: 0.35,
  CONSUMEX: 3.1,
  BUILDCRP: 0.8,
  MOTORIA: 1.0,
};

export async function POST(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const prices = await getServerPrices(new URL(req.url).origin);

    const { data, error } = await admin.rpc('claim_dividends', {
      p_user: user.id,
      p_prices: prices,
      p_yields: YIELDS,
    });

    if (error) return Response.json({ error: error.message }, { status: 400 });

    const paid = Number(data?.paid || 0);
    if (paid > 0) await recomputeNetWorth(user.id, prices);

    return Response.json({ paid, count: Number(data?.count || 0) });
  } catch (e) {
    console.error('dividends failed', e);
    return Response.json({ error: 'Dividend check failed' }, { status: 500 });
  }
}
