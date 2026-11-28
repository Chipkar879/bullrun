import { admin } from '@/lib/supabaseAdmin';
import { scaled, dailyCap, istDay, isSunday, inGrace } from '@/lib/penalties';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Reads every page, because Supabase returns at most 1000 rows per request
async function all(make) {
  const out = [];
  for (let from = 0; from < 50000; from += 1000) {
    const { data, error } = await make(from, from + 999);
    if (error) return { error };
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return { rows: out };
}

// Runs just after midnight IST and looks at the day that just ended.
export async function GET(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== 'Bearer ' + secret) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const day = istDay(1);
    if (isSunday(day)) return Response.json({ day, skipped: 'Sunday is free' });
    const start = new Date(day + 'T00:00:00+05:30').toISOString();
    const end = new Date(new Date(start).getTime() + 86400000).toISOString();

    const profs = await all((a, b) => admin.from('profiles').select('id, role, created_at, xp_gross').range(a, b));
    if (profs.error) throw profs.error;
    const quizzes = await all((a, b) => admin.from('quiz_history').select('user_id').eq('quiz_date', day).range(a, b));
    const trades = await all((a, b) => admin.from('trade_history').select('user_id').gte('created_at', start).lt('created_at', end).range(a, b));
    const lessons = await all((a, b) => admin.from('module_progress').select('user_id').gte('created_at', start).lt('created_at', end).range(a, b));
    const used = await all((a, b) => admin.from('xp_penalties').select('user_id, amount').eq('day', day).range(a, b));
    if (quizzes.error || trades.error || used.error) throw (quizzes.error || trades.error || used.error);
    // If lesson times can't be read, skip the "no activity" penalty rather than punish lesson-only kids
    const lessonsOk = !lessons.error;

    const quizSet = new Set(quizzes.rows.map((r) => r.user_id));
    const active = new Set([...quizSet, ...trades.rows.map((r) => r.user_id), ...(lessonsOk ? lessons.rows.map((r) => r.user_id) : [])]);
    const usedBy = {};
    used.rows.forEach((r) => { usedBy[r.user_id] = (usedBy[r.user_id] || 0) + r.amount; });

    const out = [];
    profs.rows.forEach((p) => {
      if (p.role === 'teacher' || p.role === 'school_admin' || p.role === 'admin') return;
      if (inGrace(p.created_at)) return;
      let room = dailyCap(p.xp_gross) - (usedBy[p.id] || 0);
      const add = (kind, reason) => {
        const amt = Math.min(scaled(p.xp_gross, kind), room);
        if (amt <= 0) return;
        room -= amt;
        out.push({ user_id: p.id, amount: amt, reason, day, ref: kind + ':' + day });
      };
      if (lessonsOk && !active.has(p.id)) add('idle', 'No activity');
      if (!quizSet.has(p.id)) add('quiz', 'Daily quiz missed');
    });

    let saved = 0;
    for (let i = 0; i < out.length; i += 500) {
      const chunk = out.slice(i, i + 500);
      const { error } = await admin.from('xp_penalties').upsert(chunk, { onConflict: 'user_id,ref', ignoreDuplicates: true });
      if (error) throw error;
      saved += chunk.length;
    }
    return Response.json({ day, users: profs.rows.length, penalties: saved, lessonsChecked: lessonsOk });
  } catch (e) {
    console.error('cron penalties failed', e);
    return Response.json({ error: 'Cron failed' }, { status: 500 });
  }
}
