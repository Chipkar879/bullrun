import { NextResponse } from 'next/server';
import { admin, getUserFromRequest } from '@/lib/supabaseAdmin';
import { calcSchoolPrice } from '@/lib/pricing';

export const dynamic = 'force-dynamic';
const SUPER_ADMIN_EMAIL = 'verymystery18@gmail.com';

const fail = (msg, status = 400) => NextResponse.json({ error: msg }, { status });

async function requireSuper(req) {
  const user = await getUserFromRequest(req);
  if (!user) return { res: fail('Please log in again', 401) };
  if (user.email !== SUPER_ADMIN_EMAIL) return { res: fail('Not allowed', 403) };
  return { user };
}

export async function GET(req) {
  const { user, res } = await requireSuper(req);
  if (res) return res;

  const { data: schools, error } = await admin.from('schools').select('*').order('created_at', { ascending: false });
  if (error) return fail(error.message, 500);

  const paths = schools.filter((s) => s.letter_path).map((s) => s.letter_path);
  const urlByPath = {};
  if (paths.length) {
    const { data: signed } = await admin.storage.from('school-letters').createSignedUrls(paths, 3600);
    (signed || []).forEach((x) => { if (x.path && x.signedUrl) urlByPath[x.path] = x.signedUrl; });
  }
  const seats = await Promise.all(
    schools.map(async (s) => {
      if (!s.code) return 0;
      const { data } = await admin.rpc('school_seat_count', { p_code: s.code });
      return typeof data === 'number' ? data : 0;
    })
  );
  const out = schools.map((s, i) => ({ ...s, letter_url: urlByPath[s.letter_path] || null, seats: seats[i] }));

  const { data: payments } = await admin.from('school_payments').select('*').order('submitted_at', { ascending: false }).limit(100);
  return NextResponse.json({ schools: out, payments: payments || [] });
}

export async function POST(req) {
  const { user, res } = await requireSuper(req);
  if (res) return res;

  let b;
  try { b = await req.json(); } catch { return fail('Invalid request'); }
  const actor = { p_actor: user.id, p_actor_email: user.email };
  const run = async (fn, args) => {
    const { data, error } = await admin.rpc(fn, args);
    if (error) return fail(error.message);
    return NextResponse.json({ ok: true, result: data ?? null });
  };

  switch (b.action) {
    case 'approve': {
      const { data: s } = await admin.from('schools').select('student_count').eq('id', b.school_id).maybeSingle();
      if (!s) return fail('School not found');
      const price = Number.isInteger(Number(b.price)) && Number(b.price) > 0 ? Number(b.price) : calcSchoolPrice(s.student_count);
      if (!price) return fail('Enter a valid price');
      return run('approve_school', { p_school: b.school_id, p_code: String(b.code || ''), p_price: price, ...actor });
    }
    case 'reject':
      return run('reject_school', { p_school: b.school_id, p_reason: String(b.reason || ''), ...actor });
    case 'record_payment': {
      const utr = String(b.utr || '').trim().toUpperCase();
      if (!/^[A-Z0-9]{6,30}$/.test(utr)) return fail('Enter a valid UTR (6 to 30 letters or digits)');
      const { data: s } = await admin.from('schools').select('locked_price').eq('id', b.school_id).maybeSingle();
      if (!s || !s.locked_price) return fail('School has no locked price. Approve it first.');
      const { data: pay, error: insErr } = await admin
        .from('school_payments')
        .insert({ school_id: b.school_id, amount: s.locked_price, utr, status: 'submitted' })
        .select('id')
        .single();
      if (insErr) return fail(insErr.message, 500);
      const { data, error } = await admin.rpc('confirm_school_payment', { p_payment: pay.id, ...actor });
      if (error) {
        await admin.from('school_payments').delete().eq('id', pay.id);
        return fail(error.message);
      }
      return NextResponse.json({ ok: true, result: data });
    }
    case 'confirm_payment':
      return run('confirm_school_payment', { p_payment: b.payment_id, ...actor });
    case 'reject_payment':
      return run('reject_school_payment', { p_payment: b.payment_id, p_reason: String(b.reason || ''), ...actor });
    case 'suspend':
      return run('suspend_school', { p_school: b.school_id, p_reason: String(b.reason || 'manual'), ...actor });
    case 'reactivate':
      return run('reactivate_school', { p_school: b.school_id, ...actor });
    case 'restart':
      return run('restart_school', { p_school: b.school_id, ...actor });
    case 'run_states':
      return run('advance_school_states', {});
    default:
      return fail('Unknown action');
  }
}
