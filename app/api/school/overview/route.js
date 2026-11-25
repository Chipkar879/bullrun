import { NextResponse } from 'next/server';
import { admin, getUserFromRequest } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';
const fail = (msg, status = 400) => NextResponse.json({ error: msg }, { status });

export async function GET(req) {
  const user = await getUserFromRequest(req);
  if (!user) return fail('Please log in again', 401);

  const { data: me } = await admin
    .from('profiles')
    .select('id, role, school_id, verification_status')
    .eq('id', user.id)
    .maybeSingle();
  if (!me) return fail('No profile found', 403);

  const isAdmin = me.role === 'school_admin';
  let school = null;
  if (isAdmin) {
    const { data } = await admin.from('schools').select('*').eq('admin_user_id', user.id).limit(1).maybeSingle();
    school = data;
  } else if (me.role === 'teacher' && me.verification_status === 'approved' && me.school_id) {
    const { data } = await admin.from('schools').select('*').eq('code', me.school_id).limit(1).maybeSingle();
    school = data;
  } else if (me.role === 'teacher') {
    return fail('Your teacher account is waiting for approval by your school admin.', 403);
  } else {
    return fail('This page is for school admins and teachers.', 403);
  }
  if (!school || !school.code) return fail('No school is linked to your account.', 403);

  let { data: classes } = await admin
    .from('school_classes')
    .select('id, class_name, assigned_teacher_id')
    .eq('school_code', school.code)
    .order('class_name');
  classes = classes || [];
  if (!isAdmin) classes = classes.filter((c) => c.assigned_teacher_id === user.id);
  const classIds = classes.map((c) => String(c.id));

  const { data: allStudents } = await admin
    .from('profiles')
    .select('id, name, email, specific_class_id, net_worth, wallet_balance, is_frozen')
    .eq('school_id', school.code)
    .eq('role', 'student');
  const seatsUsed = (allStudents || []).length;
  const students = (allStudents || []).filter((s) => isAdmin || classIds.includes(String(s.specific_class_id)));

  const cutoff = new Date(Date.now() + 5.5 * 3600 * 1000 - 6 * 86400 * 1000).toISOString().slice(0, 10);
  const weekSeconds = {};
  if (students.length) {
    const { data: rows } = await admin
      .from('user_activity')
      .select('user_id, seconds')
      .in('user_id', students.map((s) => s.id))
      .gte('day', cutoff);
    (rows || []).forEach((r) => { weekSeconds[r.user_id] = (weekSeconds[r.user_id] || 0) + Number(r.seconds || 0); });
  }

  let teachers = [];
  if (isAdmin) {
    const { data } = await admin
      .from('profiles')
      .select('id, name, email, verification_status, verification_document_url')
      .eq('school_id', school.code)
      .eq('role', 'teacher');
    teachers = data || [];
  }

  return NextResponse.json({
    role: me.role,
    school: {
      name: school.name,
      code: school.code,
      status: school.status,
      student_count: school.student_count,
      paid_until: isAdmin ? school.paid_until : null,
      payment_due_at: isAdmin ? school.payment_due_at : null,
      locked_price: isAdmin ? school.locked_price : null,
    },
    seatsUsed,
    classes,
    teachers,
    students: students.map((s) => ({ ...s, week_seconds: weekSeconds[s.id] || 0 })),
  });
}
