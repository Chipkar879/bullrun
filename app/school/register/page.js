'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { calcSchoolPrice, formatINR, MAX_SELF_SERVE_STUDENTS } from '@/lib/pricing';

const inputCls =
  'w-full rounded-lg border border-bull-line bg-bull-raised px-3 py-2 text-bull-ink outline-none focus:border-bull-lime';
const labelCls = 'mb-1 block text-sm text-bull-ink';

function RegisterForm() {
  const params = useSearchParams();
  const startCount = parseInt(params.get('students') || '', 10);

  const [form, setForm] = useState({
    school_name: '',
    area: '',
    city: '',
    pincode: '',
    admin_name: '',
    email: '',
    phone: '',
    student_count: Number.isInteger(startCount) && startCount > 0 ? String(startCount) : '',
    password: '',
  });
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const count = parseInt(form.student_count, 10);
  const estimate = calcSchoolPrice(count);

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!file) return setError('Please upload the appointment letter.');
    if (file.size > 5 * 1024 * 1024) return setError('The letter must be under 5 MB.');
    setBusy(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      fd.append('letter', file);
      const res = await fetch('/api/school/register', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.');
        setBusy(false);
        return;
      }
      await supabase.auth.signInWithPassword({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
      setDone(true);
    } catch {
      setError('Network error. Please try again.');
    }
    setBusy(false);
  }

  if (done) {
    return (
      <main className="min-h-screen bg-bull-bg px-4 py-16 text-bull-ink">
        <div className="mx-auto max-w-lg rounded-2xl border border-bull-line bg-bull-surface p-8 text-center">
          <h1 className="text-2xl font-bold text-bull-lime">Request received</h1>
          <p className="mt-3">
            Thank you. We are reviewing your appointment letter. Once it is approved you will get your
            school code and the payment details, and you will have 3 days to pay.
          </p>
          <p className="mt-3 text-sm opacity-80">
            Your account is already created. Log in with the email and password you just chose.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-lg bg-bull-lime px-5 py-2 font-semibold text-bull-bg"
          >
            Go to home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-bull-bg px-4 py-12 text-bull-ink">
      <div className="mx-auto max-w-xl">
        <h1 className="text-3xl font-bold text-bull-lime">Register your school</h1>
        <p className="mt-2 opacity-80">
          Fill in the details and upload the letter that shows you are authorised to act for the school.
          We review every request by hand.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-4 rounded-2xl border border-bull-line bg-bull-surface p-6">
          <div>
            <label className={labelCls}>School name</label>
            <input className={inputCls} value={form.school_name} onChange={set('school_name')} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Area</label>
              <input className={inputCls} value={form.area} onChange={set('area')} required />
            </div>
            <div>
              <label className={labelCls}>City</label>
              <input className={inputCls} value={form.city} onChange={set('city')} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Pin code</label>
              <input
                className={inputCls}
                value={form.pincode}
                onChange={set('pincode')}
                inputMode="numeric"
                maxLength={6}
                required
              />
            </div>
            <div>
              <label className={labelCls}>Number of students</label>
              <input
                className={inputCls}
                type="number"
                min="1"
                max={MAX_SELF_SERVE_STUDENTS}
                value={form.student_count}
                onChange={set('student_count')}
                required
              />
            </div>
          </div>

          {form.student_count !== '' && (
            <div className="rounded-lg border border-bull-line bg-bull-raised px-4 py-3 text-sm">
              {estimate ? (
                <>
                  Estimated price: <span className="font-bold text-bull-lime">{formatINR(estimate)}</span> per
                  30 days. The final price is locked by us when we approve.
                </>
              ) : count > MAX_SELF_SERVE_STUDENTS ? (
                <>More than 1000 students is a custom quote. Please contact us.</>
              ) : (
                <>Enter a valid number of students.</>
              )}
            </div>
          )}

          <hr className="border-bull-line" />

          <div>
            <label className={labelCls}>Your name (school admin)</label>
            <input className={inputCls} value={form.admin_name} onChange={set('admin_name')} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Email</label>
              <input className={inputCls} type="email" value={form.email} onChange={set('email')} required />
            </div>
            <div>
              <label className={labelCls}>Mobile number</label>
              <input
                className={inputCls}
                value={form.phone}
                onChange={set('phone')}
                inputMode="tel"
                required
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Create a password (at least 8 characters)</label>
            <input
              className={inputCls}
              type="password"
              value={form.password}
              onChange={set('password')}
              minLength={8}
              required
            />
          </div>
          <div>
            <label className={labelCls}>Appointment letter (PDF or image, max 5 MB)</label>
            <input
              className={inputCls}
              type="file"
              accept="application/pdf,image/png,image/jpeg,image/webp"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              required
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-bull-lime px-5 py-3 font-semibold text-bull-bg disabled:opacity-50"
          >
            {busy ? 'Submitting...' : 'Submit for review'}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function SchoolRegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}