import { admin, getUserFromRequest } from '@/lib/supabaseAdmin';
import { ORDER } from '@/lib/moduleData';
import { moduleNumber } from '@/lib/progressLogic';
import { ASSET_BY_SYM } from '@/lib/catalog';
import { BADGES, AVATARS, CAP_BB, levelFor } from '@/lib/gamification';
import { getRank } from '@/lib/ranks';

export const dynamic = 'force-dynamic';
const START_BALANCE = 50000;
const istDay = (offset = 0) => new Date(Date.now() + 19800000 - offset * 86400000).toISOString().slice(0, 10);

async function summary(user) {
  const uid = user.id;
  const [prof, lessonsRes, tradesRes, quizRes, badgesRes, convRes, penRes] = await Promise.all([
    admin.from('profiles').select('net_worth, quiz_points, wallet_balance, avatar').eq('id', uid).maybeSingle(),
    admin.from('module_progress').select('submodule_id').eq('user_id', uid),
    admin.from('trade_history').select('sym').eq('user_id', uid).limit(2000),
    admin.from('quiz_history').select('quiz_date, score, total').eq('user_id', uid),
    admin.from('user_badges').select('badge_id, earned_at').eq('user_id', uid),
    admin.from('bb_conversions').select('bb_spent, cash_added, created_at').eq('user_id', uid).order('created_at', { ascending: false }).limit(30),
    admin.from('xp_penalties').select('amount').eq('user_id', uid).limit(5000),
  ]);

  const done = (lessonsRes.data || []).map((r) => r.submodule_id);
  const trades = tradesRes.data || [];
  const quiz = quizRes.data || [];
  const have = new Map((badgesRes.data || []).map((x) => [x.badge_id, x.earned_at]));

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
    ten_lessons: done.length >= 10,
    fifty_lessons: done.length >= 50,
    hundred_lessons: done.length >= 100,
    all_lessons: ORDER.length > 0 && done.length >= ORDER.length,
    first_trade: trades.length >= 1,
    ten_trades: trades.length >= 10,
    fifty_trades: trades.length >= 50,
    hundred_trades: trades.length >= 100,
    diversified: sectors.size >= 3,
    sector_5: sectors.size >= 5,
    in_profit: netWorth > START_BALANCE,
    lakhpati: netWorth >= 100000,
    perfect_quiz: quiz.some((q) => q.total > 0 && q.score === q.total),
    quiz_10: quiz.length >= 10,
    quiz_30: quiz.length >= 30,
    streak_3: streak >= 3,
    streak_7: streak >= 7,
    streak_30: streak >= 30,
    bb_converter: (convRes.data || []).length > 0,
  };
  for (let n = 1; n <= 12; n++) rules['module_' + n] = (totals[n] || 0) > 0 && (doneByModule[n] || 0) >= totals[n];

  const now = new Date().toISOString();
  const fresh = BADGES.filter((x) => rules[x.id] && !have.has(x.id));
  if (fresh.length) {
    await admin.from('user_badges').upsert(fresh.map((x) => ({ user_id: uid, badge_id: x.id })), { onConflict: 'user_id,badge_id', ignoreDuplicates: true });
    fresh.forEach((x) => have.set(x.id, now));
  }

  const quizScore = quiz.reduce((a, q) => a + (q.score || 0), 0);
  const gross = done.length * 100 + Math.min(quizScore * 5 + quiz.length * 20, 3000) + Math.min(trades.length, 300) * 10 + have.size * 50;
  // Penalties lower XP, but never below the start of the rank already reached
  const lostTotal = (penRes.data || []).reduce((a, r) => a + r.amount, 0);
  const xp = Math.max(getRank(gross).rank.min, gross - lostTotal);
  const warnings = [];
  const sunday = new Date(istDay(0) + 'T00:00:00Z').getUTCDay() === 0;
  if (!dates.has(istDay(0)) && !sunday) warnings.push('Play today\'s quiz to protect your XP.');

  const since = Date.now() - 30 * 86400000;
  const used30 = (convRes.data || []).filter((c) => new Date(c.created_at).getTime() > since).reduce((a, c) => a + c.bb_spent, 0);

  return {
    xp,
    level: levelFor(gross),
    penalty: { lost: gross - xp, warnings },
    streak,
    avatar: prof.data?.avatar || 'calf',
    badges: BADGES.map((x) => ({ id: x.id, earned: have.has(x.id), at: have.get(x.id) || null })),
    newlyEarned: fresh.map((x) => x.id),
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
      // Free avatars skip the heavy XP calculation, so switching is fast
      if (av.minLevel > 0) {
        const s = await summary(user);
        if (s.level.index < av.minLevel) return Response.json({ error: 'That avatar is not unlocked yet' }, { status: 403 });
      }
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