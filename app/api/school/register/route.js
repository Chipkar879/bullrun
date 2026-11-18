import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { MAX_SELF_SERVE_STUDENTS } from '@/lib/pricing';

export const runtime = 'nodejs';

const MAX_FILE = 5 * 1024 * 1024;
const EXT = {
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

function bad(message, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return bad('Server is not configured. Please contact support.', 500);

  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let form;
  try {
    form = await req.formData();
  } catch {
    return bad('Invalid form data.');
  }

  const clean = (k) => String(form.get(k) ?? '').trim();
  const schoolName = clean('school_name');
  const area = clean('area');
  const city = clean('city');
  const pincode = clean('pincode');
  const adminName = clean('admin_name');
  const email = clean('email').toLowerCase();
  const phone = clean('phone').replace(/[\s-]/g, '').replace(/^(\+91|91)(?=\d{10}$)/, '');
  const password = String(form.get('password') ?? '');
  const studentCount = Number(clean('student_count'));
  const letter = form.get('letter');

  if (schoolName.length < 3 || schoolName.length > 120) return bad('Enter the school name.');
  if (area.length < 2 || area.length > 80) return bad('Enter the area.');
  if (city.length < 2 || city.length > 80) return bad('Enter the city.');
  if (!/^[0-9]{6}$/.test(pincode)) return bad('Pin code must be 6 digits.');
  if (adminName.length < 2 || adminName.length > 80) return bad('Enter your name.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return bad('Enter a valid email.');
  if (!/^[6-9][0-9]{9}$/.test(phone)) return bad('Enter a valid 10-digit mobile number.');
  if (password.length < 8) return bad('Password must be at least 8 characters.');
  if (!Number.isInteger(studentCount) || studentCount < 1) return bad('Enter the number of students.');
  if (studentCount > MAX_SELF_SERVE_STUDENTS) {
    return bad('For more than 1000 students we give a custom quote. Please contact us.');
  }
  if (!letter || typeof letter === 'string' || !letter.size) return bad('Upload the appointment letter.');
  if (letter.size > MAX_FILE) return bad('The letter must be under 5 MB.');
  const ext = EXT[letter.type];
  if (!ext) return bad('The letter must be a PDF, PNG, JPG or WEBP file.');

  // 1. create the login
  const { data: created, error: userErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: adminName },
  });
  if (userErr || !created?.user) {
    const msg = String(userErr?.message || '');
    if (/already|registered|exists/i.test(msg)) {
      return bad('This email already has an account. Use a different email for the school admin.', 409);
    }
    return bad('Could not create the account. ' + msg, 500);
  }
  const userId = created.user.id;
  const letterPath = `${userId}/letter-${Date.now()}.${ext}`;

  async function rollback() {
    await admin.storage.from('school-letters').remove([letterPath]).catch(() => {});
    await admin.from('schools').delete().eq('admin_user_id', userId).catch(() => {});
    await admin.from('profiles').delete().eq('id', userId).catch(() => {});
    await admin.auth.admin.deleteUser(userId).catch(() => {});
  }

  // 2. upload the letter to the private bucket
  const bytes = Buffer.from(await letter.arrayBuffer());
  const { error: upErr } = await admin.storage
    .from('school-letters')
    .upload(letterPath, bytes, { contentType: letter.type, upsert: false });
  if (upErr) {
    await rollback();
    return bad('Could not upload the letter. ' + upErr.message, 500);
  }

  // 3. profile for the school admin (permanent access, never frozen by the school clock)
  const { error: profErr } = await admin.from('profiles').upsert(
    {
      id: userId,
      name: adminName,
      email,
      role: 'school_admin',
      is_premium: true,
      is_frozen: false,
      access_expires_at: null,
    },
    { onConflict: 'id' }
  );
  if (profErr) {
    await rollback();
    return bad('Could not create the profile. ' + profErr.message, 500);
  }

  // 4. the school itself: pending_review. Price and code are set only at approval.
  const { error: schErr } = await admin.from('schools').insert({
    name: schoolName,
    area,
    city,
    pincode,
    admin_user_id: userId,
    admin_name: adminName,
    admin_email: email,
    admin_phone: phone,
    student_count: studentCount,
    status: 'pending_review',
    letter_path: letterPath,
  });
  if (schErr) {
    await rollback();
    return bad('Could not save the school. ' + schErr.message, 500);
  }

  await admin.from('audit_log').insert({
    actor_id: userId,
    actor_email: email,
    action: 'school_registered',
    details: { school_name: schoolName, student_count: studentCount },
  });

  return NextResponse.json({ ok: true });
}