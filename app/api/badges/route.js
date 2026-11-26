import { admin, getUserFromRequest } from '@/lib/supabaseAdmin';
import { ORDER } from '@/lib/moduleData';
import { moduleNumber } from '@/lib/progressLogic';
import { ASSET_BY_SYM } from '@/lib/catalog';
import { BADGES, AVATARS, CAP_BB, levelFor } from '@/lib/gamification';

export const dynamic = 'force-dynamic';
const START_BALANCE = 50000;
const istDay = (offset = 0) => new Date(Date.now() + 19800000 - offset * 86400000).toISOString().slice(0, 10);

async function summary(user) {
  const uid = user.id;
  const [prof, lessonsRes, tradesRes, quizRes, badgesRes, convRes] = await Promise.all([
    admin.from('profiles').select('net_worth, quiz_points, wallet_balance, avatar').eq('id', uid).maybeSingle(),
    admin.from('module_progress').select('submodule_id').eq('user_id', uid),
    admin.from('trade_history').select('sym').eq('user_id', uid).limit(2000),
    admin.from('quiz_history').select('quiz_date, score, total').eq('user_id', uid),
    admin.from('user_badges').select('badge_id, earned_at').eq('user_id', uid),
    admin.from('bb_conversions').select('bb_spent, cash_added, created_at').eq('user_id', uid).order('created_at', { ascending: false }).limit(30),
  ]);

  const done = (lessonsRes.data || []).map((r) => r.submodule_id);
  const trades = tradesRes.data || [];
  const quiz = quizRes.data || [];
  const have = new Map((badgesRes.data || []).map((b) => [b.badge_id, b.earned_at]));

  const totals = {};
  ORDER.forEach((id) => { const n = moduleNumber(id); if (n) totals[n] = (totals[n] || 0) + 1; });
  const doneByModule = {};
  done.forEach((id) => { const n = moduleNumber(id); if (n) doneByModule[n] = (doneByModule[n] || 0) + 1; });

  const sectors = new Set();
  trades.forEach((t) => { const a = ASSET_BY_SYM[t.sym]; if (a && a.category) sectors.add(a.category); });

  const dates = new Set(quiz.map((q) => q.quiz_date));
  let streak = 0;
  let d = dates.has(istDay(0)) ? 0 : 1;
  while (dates.has(istDay(d))) { streak += 1; d += 1; }

  const netWorth = Number(prof.data?.net_worth || 0);
  const rules = {
    first_lesson: done.length >= 1,
    module_1: totals[1] > 0 && (doneByModule[1] || 0) >= totals[1],
    first_trade: trades.length >= 1,
    ten_trades: trades.length >= 10,
    diversified: sectors.size >= 3,
    in_profit: netWorth > START_BALANCE,
    perfect_quiz: quiz.some((q) => q.total > 0 && q.score === q.total),
    streak_3: streak >= 3,
    streak_7: streak >= 7,
  };

  const now = new Date().toISOString();
  const fresh = BADGES.filter((b) => rules[b.id] && !have.has(b.id));
  if (fresh.length) {
    await admin.from('user_badges').upsert(fresh.map((b) => ({ user_id: uid, badge_id: b.id })), { onConflict: 'user_id,badge_id', ignoreDuplicates: true });
    fresh.forEach((b) => have.set(b.id, now));
  }

  const quizScore = quiz.reduce((a, q) => a + (q.score || 0), 0);
  const xp = done.length * 20 + quizScore * 2 + quiz.length * 10 + Math.min(trades.length, 200) * 3 + have.size * 25;

  const since = Date.now() - 30 * 86400000;
  const used30 = (convRes.data || []).filter((c) => new Date(c.created_at).getTime() > since).reduce((a, c) => a + c.bb_spent, 0);

  return {
    xp,
    level: levelFor(xp),
    streak,
    avatar: prof.data?.avatar || 'calf',
    badges: BADGES.map((b) => ({ id: b.id, earned: have.has(b.id), at: have.get(b.id) || null })),
    newlyEarned: fresh.map((b) => b.id),
    stats: { lessons: done.length, totalLessons: ORDER.length, trades: trades.length, quizDays: quiz.length, sectors: sectors.size },
    bb: { used30, cap: CAP_BB, history: (convRes.data || []).slice(0, 5) },
  };
}

export async function POST(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));

    if (body.action === 'avatar') {
      const av = AVATARS.find((a) => a.id === body.id);
      if (!av) return Response.json({ error: 'Unknown avatar' }, { status: 400 });
      const s = await summary(user);
      if (s.level.index < av.minLevel) return Response.json({ error: 'That avatar is not unlocked yet' }, { status: 403 });
      const { error } = await admin.from('profiles').update({ avatar: av.id }).eq('id', user.id);
      if (error) throw error;
      return Response.json({ ok: true, avatar: av.id });
    }
    return Response.json(await summary(user));
  } catch (e) {
    console.error('badges failed', e);
    return Response.json({ error: 'Could not load your stats' }, { status: 500 });
  }
}