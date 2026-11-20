import { NextResponse } from 'next/server';
import { adminClient, userFromRequest } from '@/lib/supabaseServer';
import { ORDER } from '@/lib/moduleData';
import { importablePrefix } from '@/lib/progressLogic';

export const dynamic = 'force-dynamic';

async function load(req) {
  let admin;
  try { admin = adminClient(); } catch (e) {
    console.error(e.message);
    return { error: NextResponse.json({ error: 'Server not configured' }, { status: 500 }) };
  }
  const user = await userFromRequest(req, admin);
  if (!user) return { error: NextResponse.json({ error: 'Please log in again' }, { status: 401 }) };
  const { data, error } = await admin.from('module_progress').select('submodule_id').eq('user_id', user.id);
  if (error) {
    console.error('progress read failed', error.message);
    return { error: NextResponse.json({ error: 'Could not read progress' }, { status: 500 }) };
  }
  return { admin, user, done: (data || []).map((r) => r.submodule_id) };
}

// GET: this student's completed lessons
export async function GET(req) {
  const ctx = await load(req);
  if (ctx.error) return ctx.error;
  return NextResponse.json({ done: ctx.done });
}

// POST: same as GET, plus a ONE-TIME import of the progress this browser saved before syncing existed.
// Only the unbroken run starting at lesson 1 is accepted, and only if the account has no saved progress yet.
export async function POST(req) {
  const ctx = await load(req);
  if (ctx.error) return ctx.error;

  let body = {};
  try { body = await req.json(); } catch (e) { body = {}; }

  let done = ctx.done;
  if (done.length === 0 && Array.isArray(body.importLocal) && body.importLocal.length > 0) {
    const take = importablePrefix(ORDER, body.importLocal, done);
    if (take.length > 0) {
      const rows = take.map((id) => ({ user_id: ctx.user.id, submodule_id: id, source: 'import' }));
      const { error } = await ctx.admin
        .from('module_progress')
        .upsert(rows, { onConflict: 'user_id,submodule_id', ignoreDuplicates: true });
      if (error) console.error('progress import failed', error.message);
      else done = take;
    }
  }
  return NextResponse.json({ done });
}
