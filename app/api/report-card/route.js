import { admin, getUserFromRequest } from '@/lib/supabaseAdmin';
import { buildReport } from '@/lib/tax';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await admin
      .from('trade_history')
      .select('sym, side, qty, price, fees_total, fees, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(5000);
    if (error) throw error;

    return Response.json(buildReport(data || []));
  } catch (e) {
    console.error('report card failed', e);
    return Response.json({ error: 'Could not build your report card.' }, { status: 500 });
  }
}
