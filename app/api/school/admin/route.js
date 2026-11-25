import { NextResponse } from 'next/server';
import { admin, getUserFromRequest } from '@/lib/supabaseAdmin';
import { TOTALS } from '@/lib/moduleData';

export const dynamic = 'force-dynamic';

const SUPER_ADMIN_EMAIL = 'verymystery18@gmail.com';
const OPEN = ['approved_unpaid', 'active', 'grace'];
const fail = (msg, status = 400) => NextResponse.json({ error: msg }, { status });

// The school always comes from the logged-in admin's own account, never from the request.
async function getContext(req) {
  const user = await getUserFromRequest(req);
  if (!user) return { res: fail('Please log in again', 401) };
  const { data: me } = await admin.from('profiles').select('id, role').eq('id', user.id).maybeSingle();
  if (!me || me.role !== 'school_admin') return { res: fail('This area is for school admins.', 403) };
  const { data: school } = await admin
    .from('schools')
    .select('id, name, code, status, student_count')
    .eq('admin_user_id', user.id)
    .limit(1)
    .maybeSingle();
  if (!school || !school.code) return { res: fail('No school is linked to your account.', 403) };
  return { user, school };
}

export async function GET(req) {
  const { school, res } = await getContext(req);
  if (res) return res;

  const { data: all, error } = await admin.from('profiles').select('*').eq('school_id', school.code);
  if (error) return fail(error.message, 500);
  const profiles = (all || []).filter((p) => String(p.email || '').toLowerCase() !== SUPER_ADMIN_EMAIL && p.role !== 'school_admin');
  const ids = profiles.map((p) => p.id);
  const idSet = new Set(ids);

  const cutoff = new Date(Date.now() + 5.5 * 3600 * 1000 - 6 * 86400 * 1000).toISOString().slice(0, 10);
  let activityRows = [];
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    let r = await admin.from('user_activity').select('user_id, day, seconds, last_seen').in('user_id', chunk).gte('day', cutoff);
    if (r.error) r = await admin.from('user_activity').select('user_id, day, seconds').in('user_id', chunk).gte('day', cutoff);
    if (!r.error) activityRows = activityRows.concat(r.data || []);
  }

  // admin_module_progress returns data for every user on the site, so keep only this school's.
  let users = {};
  const { data: prog } = await admin.rpc('admin_module_progress');
  if (Array.isArray(prog)) {
    users = prog.filter((row) => idSet.has(row.user_id));
  } else if (prog && typeof prog === 'object') {
    users = Object.fromEntries(Object.entries(prog).filter(([k]) => idSet.has(k)));
  }

  return NextResponse.json({
    school: { id: school.id, name: school.name, code: school.code, status: school.status, student_count: school.student_count },
    canWrite: OPEN.includes(school.status),
    profiles,
    activityRows,
    progress: { totals: TOTALS, users },
  });
}

export async function POST(req) {
  const { user, school, res } = await getContext(req);
  if (res) return res;
  if (!OPEN.includes(school.status)) return fail('Your school is not open for changes.');

  let b;
  try { b = await req.json(); } catch { return fail('Invalid request'); }

  const wanted = b.action === 'bulk_freeze' ? (Array.isArray(b.ids) ? b.ids.slice(0, 500) : []) : [b.id];
  if (!wanted.length || wanted.some((x) => typeof x !== 'string')) return fail('Nothing selected');

  const { data: found } = await admin
    .from('profiles')
    .select('id, role, email, school_id')
    .in('id', wanted)
    .eq('school_id', school.code)
    .in('role', ['student', 'teacher']);
  const targets = (found || []).filter((p) => String(p.email || '').toLowerCase() !== SUPER_ADMIN_EMAIL);
  if (!targets.length) return fail('That account does not belong to your school.');
  const targetIds = targets.map((t) => t.id);

  const audit = async (action, details) => {
    try {
      await admin.from('audit_log').insert({
        actor_id: user.id, actor_email: user.email, action, school_id: school.id, details,
      });
    } catch (e) { /* never block an action on logging */ }
  };

  if (b.action === 'teacher_status') {
    if (!['approved', 'rejected'].includes(b.status)) return fail('Invalid status');
    if (targets[0].role !== 'teacher') return fail('That account is not a teacher.');
    const { error } = await admin.from('profiles').update({ verification_status: b.status }).eq('id', targets[0].id);
    if (error) return fail(error.message, 500);
    await audit('school_admin_teacher_' + b.status, { teacher_id: targets[0].id });
    return NextResponse.json({ ok: true });
  }

  if (b.action === 'freeze' || b.action === 'bulk_freeze') {
    const freezing = b.action === 'bulk_freeze' ? true : b.freeze === true;
    if (!freezing && school.status === 'approved_unpaid' && targets.some((t) => t.role === 'student')) {
      return fail('Students can be unfrozen after your school plan is paid.');
    }
    const fields = freezing
      ? { is_frozen: true, is_premium: false, access_expires_at: new Date(0).toISOString() }
      : { is_frozen: false, is_premium: true, access_expires_at: null };
    const { error } = await admin.from('profiles').update(fields).in('id', targetIds);
    if (error) return fail(error.message, 500);
    await audit(freezing ? 'school_admin_freeze' : 'school_admin_unfreeze', { ids: targetIds });
    return NextResponse.json({ ok: true, count: targetIds.length });
  }

  return fail('Unknown action');
}
