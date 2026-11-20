import { NextResponse } from 'next/server';
import { adminClient, userFromRequest } from '@/lib/supabaseServer';
import { TOTALS } from '@/lib/moduleData';

export const dynamic = 'force-dynamic';

const SUPER_ADMIN_EMAIL = (process.env.SUPER_ADMIN_EMAIL || 'verymystery18@gmail.com').toLowerCase();

// Super admin only: how many lessons each user has completed in each module
export async function GET(req) {
  let admin;
  try { admin = adminClient(); } catch (e) {
    console.error(e.message);
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
  }
  const user = await userFromRequest(req, admin);
  if (!user || String(user.email || '').toLowerCase() !== SUPER_ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
  }
  const { data, error } = await admin.rpc('admin_module_progress');
  if (error) {
    console.error('admin progress failed', error.message);
    return NextResponse.json({ error: 'Could not load progress' }, { status: 500 });
  }
  return NextResponse.json({ totals: TOTALS, users: data || {} });
}
