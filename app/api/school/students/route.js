import { NextResponse } from 'next/server';
import { admin, getUserFromRequest } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

// Column used for "Bazaar Bucks". Change this if your column has another name.
const BUCKS_COL = 'quiz_points';

const fail = (msg, status = 400) => NextResponse.json({ error: msg }, { status });

export async function GET(req) {
  const user = await getUserFromRequest(req);
  if (!user) return fail('Please log in again', 401);

  const { data: me } = await admin
    .from('profiles').select('id, role, school_id, verification_status').eq('id', user.id).maybeSingle();
  if (!me) return fail('Account not found.', 403);
  let school = null;
  let teacherId = null;
  if (me.role === 'school_admin') {
    const { data: sc } = await admin
      .from('schools').select('code').eq('admin_user_id', user.id).limit(1).maybeSingle();
    school = sc;
  } else if (me.role === 'teacher') {
    if (['pending', 'rejected'].includes(me.verification_status)) return fail('Your account is waiting for approval.', 403);
    teacherId = user.id;
    school = me.school_id ? { code: me.school_id } : null;
  } else {
    return fail('Not allowed.', 403);
  }
  if (!school || !school.code) return fail('No school is linked to your account.', 403);

  const [stRes, clsRes] = await Promise.all([
    admin.from('profiles')
      .select('id, name, email, specific_class_id, net_worth, wallet_balance, last_quiz_date, ' + BUCKS_COL)
      .eq('school_id', school.code)
      .eq('role', 'student'),
    admin.from('school_classes').select('id, class_name, assigned_teacher_id').eq('school_code', school.code),
  ]);
  if (stRes.error) return fail(stRes.error.message, 500);

  let students = stRes.data || [];
  if (teacherId) {
    const mine = new Set((clsRes.data || []).filter((c) => String(c.assigned_teacher_id) === String(teacherId)).map((c) => String(c.id)));
    students = students.filter((x) => x.specific_class_id && mine.has(String(x.specific_class_id)));
  }
  const classById = Object.fromEntries((clsRes.data || []).map((c) => [String(c.id), c.class_name]));

  const IST = 5.5 * 3600 * 1000;
  const days = [];
  for (let i = 6; i >= 0; i--) days.push(new Date(Date.now() + IST - i * 86400000).toISOString().slice(0, 10));

  const perDay = {};
  if (students.length) {
    const { data: rows } = await admin
      .from('user_activity')
      .select('user_id, day, seconds')
      .in('user_id', students.map((s) => s.id))
      .gte('day', days[0]);
    (rows || []).forEach((r) => {
      const key = r.user_id + '|' + String(r.day).slice(0, 10);
      perDay[key] = (perDay[key] || 0) + Number(r.seconds || 0);
    });
  }

  const out = students
    .map((s) => {
      const bars = days.map((d) => ({ day: d, seconds: perDay[s.id + '|' + d] || 0 }));
      const week = bars.reduce((n, b) => n + b.seconds, 0);
      return {
        id: s.id,
        name: s.name,
        email: s.email,
        class_name: s.specific_class_id ? classById[String(s.specific_class_id)] || null : null,
        net_worth: Number(s.net_worth ?? 0),
        wallet_balance: Number(s.wallet_balance ?? 0),
        bucks: Number(s[BUCKS_COL] ?? 0),
        last_quiz_date: s.last_quiz_date || null,
        week_seconds: week,
        avg_seconds: Math.round(week / 7),
        bars,
      };
    })
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));

  return NextResponse.json({ students: out, updated: Date.now() });
}