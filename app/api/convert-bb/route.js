import { admin, getUserFromRequest } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const bb = Math.floor(Number(body.bb));
    if (!Number.isFinite(bb) || bb <= 0) return Response.json({ error: 'Enter a whole number of BB' }, { status: 400 });
    const { data, error } = await admin.rpc('convert_bb', { p_user: user.id, p_bb: bb });
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json(data);
  } catch (e) {
    console.error('convert-bb failed', e);
    return Response.json({ error: 'Conversion failed' }, { status: 500 });
  }
}