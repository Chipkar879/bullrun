import { admin } from '@/lib/supabaseAdmin';

// Change the numbers here to make the rules softer or stricter
export const DAILY_CAP = 20;
export const AMOUNT = { idle: 10, quiz: 5, trade: 5 };
export const GRACE_DAYS = 3;

export const istDay = (offset = 0) => new Date(Date.now() + 19800000 - offset * 86400000).toISOString().slice(0, 10);
export const isSunday = (day) => new Date(day + 'T00:00:00Z').getUTCDay() === 0;
export const inGrace = (createdAt) => !createdAt || Date.now() - new Date(createdAt).getTime() < GRACE_DAYS * 86400000;

// Adds one penalty, respecting Sundays, the new-account grace period and the daily cap.
export async function penalise({ userId, amount, reason, day, ref }) {
  if (isSunday(day)) return { applied: false };
  const { data: prof } = await admin.from('profiles').select('created_at').eq('id', userId).maybeSingle();
  if (inGrace(prof && prof.created_at)) return { applied: false };
  const { data: rows, error } = await admin.from('xp_penalties').select('amount').eq('user_id', userId).eq('day', day);
  if (error) return { applied: false };
  const used = (rows || []).reduce((a, r) => a + r.amount, 0);
  const amt = Math.min(amount, DAILY_CAP - used);
  if (amt <= 0) return { applied: false };
  const { error: insError } = await admin.from('xp_penalties').insert({ user_id: userId, amount: amt, reason, day, ref });
  if (insError) return { applied: false };
  return { applied: true, amount: amt };
}
