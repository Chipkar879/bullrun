import { NextResponse } from 'next/server';
import { admin, getUserFromRequest } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';
const fail = (msg, status = 400) => NextResponse.json({ error: msg }, { status });

export async function GET(req) {
  const user = await getUserFromRequest(req);
  if (!user) return fail('Please log in again', 401);

  const id = new URL(req.url).searchParams.get('id') || '';
  if (!/^[0-9a-f-]{36}$/i.test(id)) return fail('Invalid student');

  const { data: me } = await admin
    .from('profiles')
    .select('id, role, school_id, verification_status')
    .eq('id', user.id)
    .maybeSingle();
  if (!me) return fail('No profile found', 403);

  const { data: st } = await admin
    .from('profiles')
    .select('id, name, email, role, school_id, specific_class_id, net_worth, wallet_balance, is_frozen, quiz_points')
    .eq('id', id)
    .maybeSingle();
  if (!st || st.role !== 'student' || !st.school_id) return fail('Student not found', 404);

  let allowed = false;
  if (me.role === 'school_admin') {
    const { data: sch } = await admin.from('schools').select('code').eq('admin_user_id', user.id).limit(1).maybeSingle();
    allowed = !!sch?.code && sch.code === st.school_id;
  } else if (me.role === 'teacher' && me.verification_status === 'approved' && me.school_id === st.school_id) {
    const { data: cls } = await admin
      .from('school_classes')
      .select('id')
      .eq('school_code', st.school_id)
      .eq('assigned_teacher_id', user.id);
    allowed = (cls || []).some((c) => String(c.id) === String(st.specific_class_id));
  }
  if (!allowed) return fail('You do not have access to this student', 403);

  const cutoff = new Date(Date.now() + 5.5 * 3600 * 1000 - 13 * 86400 * 1000).toISOString().slice(0, 10);
  const [h, t, q, o, a, c] = await Promise.all([
    admin.from('user_holdings').select('sym, shares, avg_price, updated_at').eq('user_id', id).order('sym'),
    admin.from('trade_history').select('id, sym, side, qty, price, gross, fees_total, created_at').eq('user_id', id).order('created_at', { ascending: false }).limit(50),
    admin.from('quiz_history').select('id, quiz_date, score, total, points, time_spent').eq('user_id', id).order('quiz_date', { ascending: false }).limit(30),
    admin.from('pending_orders').select('id, sym, kind, qty, trigger_price, status, created_at').eq('user_id', id).order('created_at', { ascending: false }).limit(20),
    admin.from('user_activity').select('day, seconds, last_seen').eq('user_id', id).gte('day', cutoff).order('day', { ascending: false }),
    st.specific_class_id
      ? admin.from('school_classes').select('class_name').eq('id', st.specific_class_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return NextResponse.json({
    student: { ...st, class_name: c.data?.class_name || null },
    holdings: h.data || [],
    trades: t.data || [],
    quizzes: q.data || [],
    orders: o.data || [],
    activity: a.data || [],
  });
}
