import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const ALLOWED_ROLES = ['personal', 'student', 'teacher'];

function bad(message, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function getClients() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey) throw new Error('Missing Supabase URL or anon key.');
  if (!serviceKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY.');
  const opts = { auth: { persistSession: false, autoRefreshToken: false } };
  return {
    anon: createClient(url, anonKey, opts),
    admin: createClient(url, serviceKey, opts),
  };
}

export async function POST(request) {
  try {
    const { anon, admin } = getClients();

    let body;
    try {
      body = await request.json();
    } catch {
      return bad('Invalid request.');
    }

    // 1. Validate inputs. The role is checked against a fixed list, never trusted.
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const role = body.role;
    const schoolCode = typeof body.schoolCode === 'string' ? body.schoolCode.trim().toUpperCase() : '';
    const specificClassId = body.specificClassId ? String(body.specificClassId).slice(0, 64) : null;
    const documentUrl = typeof body.documentUrl === 'string' ? body.documentUrl.trim() : '';

    if (!ALLOWED_ROLES.includes(role)) return bad('Invalid account type.');
    if (!name || name.length > 80) return bad('Please enter your name.');
    if (!email || email.length > 254 || !email.includes('@')) return bad('Please enter a valid email address.');
    if (password.length < 6 || password.length > 72) return bad('Password must be 6 to 72 characters.');
    if (schoolCode.length > 40) return bad('Invalid school code.');

    // 2. Role-specific checks
    if (role === 'student') {
      if (!schoolCode) return bad('School code is required for student accounts.');

      const { data: codeCheck, error: codeErr } = await admin
        .from('school_classes')
        .select('school_code')
        .eq('school_code', schoolCode)
        .limit(1);
      if (codeErr || !codeCheck || codeCheck.length === 0) {
        return bad('Invalid classroom clearance token.');
      }

      if (specificClassId) {
        const { data: classCheck, error: classErr } = await admin
          .from('school_classes')
          .select('id')
          .eq('id', specificClassId)
          .eq('school_code', schoolCode)
          .limit(1);
        if (classErr || !classCheck || classCheck.length === 0) {
          return bad('That classroom does not belong to this school.');
        }
      }
    }

    if (role === 'teacher') {
      if (!schoolCode) return bad('School code is required for admin accounts.');
      if (!documentUrl || documentUrl.length > 500 || !documentUrl.startsWith('https://')) {
        return bad('An appointment letter is required for admin accounts.');
      }
    }

    // 3. Create the auth user
    const { data: authData, error: authError } = await anon.auth.signUp({ email, password });
    if (authError) return bad(authError.message);
    if (!authData?.user) return bad('Could not create the account.', 500);

    // With email confirmation on, an existing email comes back as a user with no identities.
    if (Array.isArray(authData.user.identities) && authData.user.identities.length === 0) {
      return bad('An account with this email already exists.');
    }

    const userId = authData.user.id;

    // 4. Create the profile with the server-only key. Everything privileged is set here.
    const initialBalance = 50000;
    const usesSchool = role !== 'personal';

    const { error: profileError } = await admin.from('profiles').insert([{
      id: userId,
      name,
      email,
      role,
      wallet_balance: initialBalance,
      net_worth: initialBalance,
      school_code: usesSchool ? schoolCode : null,
      school_id: usesSchool ? schoolCode : null,
      specific_class_id: role === 'student' && specificClassId ? specificClassId : null,
      verification_status: role === 'teacher' ? 'pending' : 'approved',
      verification_document_url: role === 'teacher' ? documentUrl : null,
      student_approved: true
    }]);

    if (profileError) {
      console.error('Signup: profile insert failed', profileError);
      // Do not leave an account with no profile behind.
      await admin.auth.admin.deleteUser(userId);
      return bad('Could not finish creating your account. Please try again.', 500);
    }

    return NextResponse.json({ success: true, user: userId });
  } catch (error) {
    console.error('Signup route error', error);
    return bad('Signup is temporarily unavailable. Please try again.', 500);
  }
}