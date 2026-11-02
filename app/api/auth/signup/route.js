import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Server is missing Supabase environment variables.');
  return createClient(url, key);
}

export async function POST(request) {
  try {
    const supabase = getSupabase();
    const { name, email, password, role, schoolCode, specificClassId, documentUrl } = await request.json();

    // 1. Check if student is signing up with a valid classroom token in 'school_classes'
    if (role === 'student') {
      if (!schoolCode) {
        return NextResponse.json({ error: 'School code is required for student accounts.' }, { status: 400 });
      }

      const { data: codeCheck, error: codeErr } = await supabase
        .from('school_classes')
        .select('school_code')
        .eq('school_code', schoolCode.toUpperCase())
        .limit(1);

      if (codeErr || !codeCheck || codeCheck.length === 0) {
        return NextResponse.json({ error: 'Invalid classroom clearance token.' }, { status: 400 });
      }
    }

    // 2. Register the user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) throw authError;
    if (!authData?.user) throw new Error('Authentication node drop exception.');

    const userId = authData.user.id;

    // 3. Define balance and approval defaults
    const initialBalance = 50000;
    const isTeacherPending = (role === 'teacher') ? 'pending' : 'approved';
    const isStudentApproved = true; 

    // 4. Save EXACT role, school_code, and specific_class_id into 'profiles'
    const { error: profileError } = await supabase.from('profiles').insert([{
      id: userId,
      name,
      email,
      role: role || 'personal', // Saves 'student' or 'teacher' instead of defaulting to personal
      wallet_balance: initialBalance,
      net_worth: initialBalance,
      school_code: schoolCode ? schoolCode.toUpperCase() : null,
      school_id: schoolCode ? schoolCode.toUpperCase() : null,
      specific_class_id: specificClassId ? String(specificClassId) : null,
      verification_status: isTeacherPending,
      verification_document_url: documentUrl,
      student_approved: isStudentApproved
    }]);

    if (profileError) throw profileError;

    return NextResponse.json({ success: true, user: userId });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}