import { NextResponse } from 'next/server';
import { admin, getUserFromRequest } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

const fail = (msg, status = 400) => NextResponse.json({ error: msg }, { status });
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const clean = (v) => String(v ?? '').trim();
const likeEsc = (s) => s.replace(/[\\%_]/g, (m) => '\\' + m);
const natural = (a, b) => String(a.class_name).localeCompare(String(b.class_name), undefined, { numeric: true });

async function getSchool(req) {
  const user = await getUserFromRequest(req);
  if (!user) return { error: fail('Please log in again', 401) };
  const { data: me } = await admin
    .from('profiles')
    .select('id, role, school_id, verification_status')
    .eq('id', user.id)
    .maybeSingle();
  if (!me) return { error: fail('Account not found.', 403) };

  if (me.role === 'school_admin') {
    const { data: school } = await admin
      .from('schools')
      .select('id, name, code, student_count')
      .eq('admin_user_id', user.id)
      .limit(1)
      .maybeSingle();
    if (!school || !school.code) return { error: fail('No school is linked to your account.', 403) };
    return { user, school };
  }

  if (me.role === 'teacher') {
    if (['pending', 'rejected'].includes(me.verification_status)) {
      return { error: fail('Your account is waiting for approval.', 403) };
    }
    if (!me.school_id) return { error: fail('No school is linked to your account.', 403) };
    const { data: school } = await admin
      .from('schools')
      .select('id, name, code, student_count')
      .eq('code', me.school_id)
      .maybeSingle();
    if (!school || !school.code) return { error: fail('No school is linked to your account.', 403) };
    return { user, school: { ...school, scopeTeacherId: user.id } };
  }

  return { error: fail('Not allowed.', 403) };
}

async function buildPayload(school) {
  const [classesRes, studentsRes, invitesRes, teachersRes] = await Promise.all([
    admin
      .from('school_classes')
      .select('id, class_name, assigned_teacher_id, teacher_name, teacher_email')
      .eq('school_code', school.code),
    admin
      .from('profiles')
      .select('id, name, email, specific_class_id')
      .eq('school_id', school.code)
      .eq('role', 'student'),
    admin
      .from('school_invites')
      .select('id, class_id, role, name, email')
      .eq('school_code', school.code)
      .is('claimed_at', null),
    admin
      .from('profiles')
      .select('id, name, email, verification_status')
      .eq('school_id', school.code)
      .eq('role', 'teacher'),
  ]);

  const allClasses = classesRes.data || [];
  const students = studentsRes.data || [];
  const invites = invitesRes.data || [];
  const teachers = teachersRes.data || [];
  const teacherById = Object.fromEntries(teachers.map((t) => [t.id, t]));

  const hidden = new Set(allClasses.filter((c) => /^unassigned/i.test(c.class_name)).map((c) => String(c.id)));
  const classes = allClasses.filter((c) => !hidden.has(String(c.id))).sort(natural)
    .filter((c) => !school.scopeTeacherId || String(c.assigned_teacher_id) === String(school.scopeTeacherId));
  const visibleIds = new Set(classes.map((c) => String(c.id)));

  const out = classes.map((c) => {
    const t = c.assigned_teacher_id ? teacherById[c.assigned_teacher_id] : null;
    let status = 'none';
    if (c.assigned_teacher_id) status = t && t.verification_status === 'pending' ? 'pending' : 'registered';
    else if (c.teacher_email) status = 'invited';
    return {
      id: c.id,
      class_name: c.class_name,
      teacher: {
        name: (t && t.name) || c.teacher_name || '',
        email: (t && t.email) || c.teacher_email || '',
        status,
      },
      students: students
        .filter((s) => String(s.specific_class_id) === String(c.id))
        .map((s) => ({ id: s.id, name: s.name, email: s.email })),
      invites: invites
        .filter((i) => i.role === 'student' && String(i.class_id) === String(c.id))
        .map((i) => ({ id: i.id, name: i.name, email: i.email })),
    };
  });

  const unassigned = (school.scopeTeacherId ? [] : students)
    .filter((s) => !s.specific_class_id || !visibleIds.has(String(s.specific_class_id)))
    .map((s) => ({ id: s.id, name: s.name, email: s.email }));

  return {
    school: { name: school.name, code: school.code, student_count: school.student_count },
    seatsUsed: students.length,
    canCreate: !school.scopeTeacherId,
    classes: out,
    unassigned,
  };
}

async function ownClass(school, id) {
  if (id === undefined || id === null || id === '') return null;
  const { data } = await admin
    .from('school_classes')
    .select('id, class_name, assigned_teacher_id')
    .eq('id', id)
    .eq('school_code', school.code)
    .maybeSingle();
  if (data && school.scopeTeacherId && String(data.assigned_teacher_id) !== String(school.scopeTeacherId)) return null;
  return data || null;
}

export async function GET(req) {
  const ctx = await getSchool(req);
  if (ctx.error) return ctx.error;
  try {
    return NextResponse.json(await buildPayload(ctx.school));
  } catch (e) {
    return fail(e.message || 'Could not load classes.', 500);
  }
}

export async function POST(req) {
  const ctx = await getSchool(req);
  if (ctx.error) return ctx.error;
  const { school } = ctx;
  const body = await req.json().catch(() => ({}));

  try {
    // ------------------------------------------------------------ create class
    if (body.action === 'create_class') {
      if (school.scopeTeacherId) return fail('Only the school admin can create classes.', 403);
      const class_name = clean(body.class_name);
      const teacher_name = clean(body.teacher_name);
      const teacher_email = clean(body.teacher_email).toLowerCase();
      if (!class_name) return fail('Enter a class name.');
      if (class_name.length > 40) return fail('Class name is too long (40 characters max).');
      if (!teacher_name) return fail('Enter the class teacher name.');
      if (!EMAIL_RE.test(teacher_email)) return fail('Enter a valid class teacher email.');

      const { data: same } = await admin
        .from('school_classes')
        .select('id')
        .eq('school_code', school.code)
        .ilike('class_name', likeEsc(class_name))
        .limit(1);
      if (same && same.length) return fail('A class with this name already exists.');

      const { data: created, error } = await admin
        .from('school_classes')
        .insert({ school_code: school.code, school_id: school.id, class_name, teacher_name, teacher_email })
        .select('id')
        .single();
      if (error) return fail('Could not create the class. Did you run the SQL script first? ' + error.message, 500);

      const { data: t } = await admin
        .from('profiles')
        .select('id')
        .eq('school_id', school.code)
        .eq('role', 'teacher')
        .ilike('email', likeEsc(teacher_email))
        .limit(1)
        .maybeSingle();

      if (t) {
        await admin.from('school_classes').update({ assigned_teacher_id: t.id }).eq('id', created.id);
      } else {
        const { error: invErr } = await admin.from('school_invites').insert({
          school_code: school.code,
          class_id: created.id,
          role: 'teacher',
          name: teacher_name,
          email: teacher_email,
        });
        if (invErr) return fail('Class created, but the teacher invite failed: ' + invErr.message, 500);
      }

      return NextResponse.json({
        ...(await buildPayload(school)),
        created_id: created.id,
        message: class_name + ' is ready. Now add its students.',
      });
    }

    // ------------------------------------------------------------ add student
    if (body.action === 'add_student') {
      const name = clean(body.name);
      const email = clean(body.email).toLowerCase();
      if (!name) return fail('Enter the student name.');
      if (!EMAIL_RE.test(email)) return fail('Enter a valid student email.');
      const cls = await ownClass(school, body.class_id);
      if (!cls) return fail('Class not found.', 404);

      const { data: reg } = await admin
        .from('profiles')
        .select('id, specific_class_id')
        .eq('school_id', school.code)
        .eq('role', 'student')
        .ilike('email', likeEsc(email))
        .limit(1)
        .maybeSingle();

      if (reg) {
        if (String(reg.specific_class_id) === String(cls.id)) return fail('That student is already in this class.');
        if (school.scopeTeacherId && reg.specific_class_id) return fail('That student is already in another class. Ask the school admin to move them.');
        const { error } = await admin.from('profiles').update({ specific_class_id: cls.id }).eq('id', reg.id);
        if (error) return fail(error.message, 500);
        return NextResponse.json({
          ...(await buildPayload(school)),
          message: name + ' has already registered, so they were moved into ' + cls.class_name + '.',
        });
      }

      const { data: dup } = await admin
        .from('school_invites')
        .select('id, class_id')
        .eq('school_code', school.code)
        .eq('role', 'student')
        .is('claimed_at', null)
        .ilike('email', likeEsc(email))
        .limit(1)
        .maybeSingle();
      if (dup) {
        return fail(
          String(dup.class_id) === String(cls.id)
            ? 'That email is already invited to this class.'
            : 'That email is already invited to another class. Remove that invite first.'
        );
      }

      const { error } = await admin
        .from('school_invites')
        .insert({ school_code: school.code, class_id: cls.id, role: 'student', name, email });
      if (error) return fail(error.message, 500);

      return NextResponse.json({
        ...(await buildPayload(school)),
        message: name + ' is invited. They join ' + cls.class_name + ' when they register with ' + email + '.',
      });
    }

    // ------------------------------------------------------------ remove invite
    if (body.action === 'remove_invite') {
      if (school.scopeTeacherId) {
        const { data: iv } = await admin.from('school_invites').select('class_id').eq('id', body.invite_id).maybeSingle();
        if (!iv || !(await ownClass(school, iv.class_id))) return fail('Invite not found.', 404);
      }
      const { error } = await admin
        .from('school_invites')
        .delete()
        .eq('id', body.invite_id)
        .eq('school_code', school.code)
        .is('claimed_at', null);
      if (error) return fail(error.message, 500);
      return NextResponse.json({ ...(await buildPayload(school)), message: 'Invite removed.' });
    }

    // ------------------------------------------------------------ assign unassigned student
    if (body.action === 'assign') {
      if (school.scopeTeacherId) return fail('Only the school admin can move students.', 403);
      const cls = await ownClass(school, body.class_id);
      if (!cls) return fail('Class not found.', 404);
      const { data: st } = await admin
        .from('profiles')
        .select('id, name')
        .eq('id', body.student_id)
        .eq('school_id', school.code)
        .eq('role', 'student')
        .maybeSingle();
      if (!st) return fail('Student not found.', 404);
      const { error } = await admin.from('profiles').update({ specific_class_id: cls.id }).eq('id', st.id);
      if (error) return fail(error.message, 500);
      return NextResponse.json({
        ...(await buildPayload(school)),
        message: st.name + ' moved into ' + cls.class_name + '.',
      });
    }

    return fail('Unknown action.');
  } catch (e) {
    return fail(e.message || 'Something went wrong.', 500);
  }
}