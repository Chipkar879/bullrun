import { admin, getUserFromRequest } from '@/lib/supabaseAdmin';
import { ORDER } from '@/lib/moduleData';
import { moduleNumber, lessonXpMap } from '@/lib/progressLogic';
import { ASSET_BY_SYM } from '@/lib/catalog';
import { BADGES, AVATARS, CAP_BB, levelFor } from '@/lib/gamification';
import { getRank } from '@/lib/ranks';

export const dynamic = 'force-dynamic';
const START_BALANCE = 50000;
// XP for each lesson: every module adds up to 1200, with more for the harder lessons at the end
const LESSON_XP = lessonXpMap(ORDER);
// Daily quiz and trade XP are capped per calendar month (India time). The count starts again on the 1st.
const XP_PER_TRADE = 10;
const MONTH_CAP_QUIZ = 3000;
const MONTH_CAP_TRADES = 3000;
const istDay = (offset = 0) => new Date(Date.now() + 19800000 - offset * 86400000).toISOString().slice(0, 10);
const istMonthOf = (iso) => {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 'all' : new Date(t + 19800000).toISOString().slice(0, 7);
};

// Adds up XP month by month. Each month can give at most "cap" XP.
function monthlyXp(items, monthOf, xpOf, cap) {
  const byMonth = {};
  items.forEach((it) => {
    const m = monthOf(it);
    byMonth[m] = (byMonth[m] || 0) + xpOf(it);
  });
  return Object.values(byMonth).reduce((sum, v) => sum + Math.min(v, cap), 0);
}

// Loads every trade with its date. If the table has no created_at column, falls back to the old undated list.
async function loadTrades(uid) {
  const out = [];
  for (let from = 0; from < 20000; from += 1000) {
    const { data, error } = await admin
      .from('trade_history')
      .select('sym, created_at')
      .eq('user_id', uid)
      .order('created_at', { ascending: true })
      .range(from, from + 999);
    if (error) {
      if (from === 0) {
        const old = await admin.from('trade_history').select('sym').eq('user_id', uid).limit(2000);
        return { rows: old.data || [], dated: false };
      }
      break;
    }
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return { rows: out, dated: true };
}

async function summary(user) {
  const uid = user.id;
  const [prof, lessonsRes, tradeData, quizRes, badgesRes, convRes, penRes] = await Promise.all([
    admin.from('profiles').select('net_worth, quiz_points, wallet_balance, avatar').eq('id', uid).maybeSingle(),
    admin.from('module_progress').select('submodule_id').eq('user_id', uid),
    loadTrades(uid),
    admin.from('quiz_history').select('quiz_date, score, total').eq('user_id', uid),
    admin.from('user_badges').select('badge_id, earned_at').eq('user_id', uid),
    admin.from('bb_conversions').select('bb_spent, cash_added, created_at').eq('user_id', uid).order('created_at', { ascending: false }).limit(30),
    admin.from('xp_penalties').select('amount').eq('user_id', uid).limit(5000),
  ]);

  const done = (lessonsRes.data || []).map((r) => r.submodule_id);
  const trades = tradeData.rows;
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

  const lessonXp = done.reduce((a, id) => a + (LESSON_XP[id] || 0), 0);
  const quizXp = monthlyXp(
    quiz,
    (q) => String(q.quiz_date || '').slice(0, 7) || 'all',
    (q) => (q.score || 0) * 5 + 20,
    MONTH_CAP_QUIZ
  );
  const tradeXp = monthlyXp(
    trades,
    (t) => (tradeData.dated && t.created_at ? istMonthOf(t.created_at) : 'all'),
    () => XP_PER_TRADE,
    MONTH_CAP_TRADES
  );
  const gross = lessonXp + quizXp + tradeXp + have.size * 50;
  // Penalties lower XP, but never below the start of the rank already reached
  const lostTotal = (penRes.data || []).reduce((a, r) => a + r.amount, 0);
  const xp = Math.max(getRank(gross).rank.min, gross - lostTotal);
  // Saved so penalties can be a share of the student's XP
  await admin.from('profiles').update({ xp_gross: xp }).eq('id', uid);
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