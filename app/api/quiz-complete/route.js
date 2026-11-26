import { admin, getUserFromRequest } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';
const istToday = () => new Date(Date.now() + 19800000).toISOString().slice(0, 10);
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, Math.floor(Number(n) || 0)));

export async function POST(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const total = clamp(body.total, 1, 15);
    const score = clamp(body.score, 0, total);
    const timeSpent = clamp(body.timeSpent, 0, 300);
    const today = istToday();

    // One row per day. A second attempt hits the unique key and is refused.
    const { error: histError } = await admin.from('quiz_history').insert({
      user_id: user.id, quiz_date: today, score, total, points: score, time_spent: timeSpent,
    });
    if (histError) {
      if (histError.code === '23505') return Response.json({ error: 'Already played today' }, { status: 409 });
      throw histError;
    }

    const { data: prof, error: readError } = await admin.from('profiles').select('quiz_points').eq('id', user.id).single();
    if (readError) throw readError;
    const quizPoints = Number(prof.quiz_points || 0) + score;
    const { error: upError } = await admin.from('profiles').update({ quiz_points: quizPoints, last_quiz_date: today }).eq('id', user.id);
    if (upError) throw upError;

    return Response.json({ ok: true, points: score, quizPoints });
  } catch (e) {
    console.error('quiz-complete failed', e);
    return Response.json({ error: 'Could not save your quiz' }, { status: 500 });
  }
}