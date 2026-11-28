import { admin } from '@/lib/supabaseAdmin';

// Penalties are a share of the student's XP: more XP means bigger losses, less XP means smaller ones.
// Change the numbers here to make the rules softer or stricter.
const RATE = { idle: 0.005, quiz: 0.0025, trade: 0.0025 };
const MIN = { idle: 2, quiz: 1, trade: 1 };
const CAP_RATE = 0.01;
const CAP_MIN = 4;
export const GRACE_DAYS = 3;

export const scaled = (xp, kind) => Math.max(MIN[kind], Math.round((Number(xp) || 0) * RATE[kind]));
export const dailyCap = (xp) => Math.max(CAP_MIN, Math.round((Number(xp) || 0) * CAP_RATE));

export const istDay = (offset = 0) => new Date(Date.now() + 19800000 - offset * 86400000).toISOString().slice(0, 10);
export const isSunday = (day) => new Date(day + 'T00:00:00Z').getUTCDay() === 0;
export const inGrace = (createdAt) => !createdAt || Date.now() - new Date(createdAt).getTime() < GRACE_DAYS * 86400000;

// Adds one penalty, respecting Sundays, the new-account grace period and the daily cap.
export async function penalise({ userId, kind, reason, day, ref }) {
  if (isSunday(day)) return { applied: false };
  const { data: prof } = await admin.from('profiles').select('created_at, xp_gross').eq('id', userId).maybeSingle();
  if (inGrace(prof && prof.created_at)) return { applied: false };
  const xp = prof ? prof.xp_gross : 0;
  const { data: rows, error } = await admin.from('xp_penalties').select('amount').eq('user_id', userId).eq('day', day);
  if (error) return { applied: false };
  const used = (rows || []).reduce((a, r) => a + r.amount, 0);
  const amt = Math.min(scaled(xp, kind), dailyCap(xp) - used);
  if (amt <= 0) return { applied: false };
  const { error: insError } = await admin.from('xp_penalties').insert({ user_id: userId, amount: amt, reason, day, ref });
  if (insError) return { applied: false };
  return { applied: true, amount: amt };
}
