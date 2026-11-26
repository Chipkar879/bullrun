import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPER_ADMIN_EMAIL = 'verymystery18@gmail.com';

export async function POST(req) {
  try {
    const token = (req.headers.get('authorization') || '').replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const { data: caller } = await anon.auth.getUser(token);
    if (!caller?.user) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

    const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY);
    let allowed = caller.user.email === SUPER_ADMIN_EMAIL;
    if (!allowed) {
      const { data: me } = await admin.from('profiles').select('role').eq('id', caller.user.id).maybeSingle();
      allowed = me?.role === 'admin';
    }
    if (!allowed) return NextResponse.json({ error: 'Admins only' }, { status: 403 });

    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: 'userId missing' }, { status: 400 });

    const { data: target } = await admin.auth.admin.getUserById(userId);
    if (target?.user?.email === SUPER_ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Cannot delete the super admin' }, { status: 400 });
    }

    const { error: authErr } = await admin.auth.admin.deleteUser(userId);
    if (authErr && !/not found/i.test(authErr.message)) {
      return NextResponse.json({ error: 'Auth delete failed: ' + authErr.message }, { status: 500 });
    }
    const { error: profErr } = await admin.from('profiles').delete().eq('id', userId);
    if (profErr) return NextResponse.json({ error: 'Profile delete failed: ' + profErr.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}
