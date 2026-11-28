import { admin, getUserFromRequest } from '@/lib/supabaseAdmin';
import { AVATARS } from '@/lib/gamification';
import { studentSummary } from '@/lib/studentSummary';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));

    if (body.action === 'avatar') {
      const av = AVATARS.find((a) => a.id === body.id);
      if (!av) return Response.json({ error: 'Unknown avatar' }, { status: 400 });
      // Free avatars skip the heavy XP calculation, so switching is fast
      if (av.minLevel > 0) {
        const s = await studentSummary(user);
        if (s.level.index < av.minLevel) return Response.json({ error: 'That avatar is not unlocked yet' }, { status: 403 });
      }
      const { error } = await admin.from('profiles').update({ avatar: av.id }).eq('id', user.id);
      if (error) throw error;
      return Response.json({ ok: true, avatar: av.id });
    }
    return Response.json(await studentSummary(user));
  } catch (e) {
    console.error('badges failed', e);
    return Response.json({ error: 'Could not load your stats' }, { status: 500 });
  }
}
