'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { supabase } from '@/lib/supabase';

const natural = (a, b) => String(a.class_name).localeCompare(String(b.class_name), undefined, { numeric: true });

export default function SchoolShell({ active, adminOnly = false, teacherOnly = false, children }) {
  const router = useRouter();
  const [raw, setRaw] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { window.location.href = '/signup?mode=login'; return; }
    const res = await fetch('/api/school/overview', { headers: { Authorization: 'Bearer ' + session.access_token } });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { setError(json.error || 'Could not load the dashboard.'); return; }
    setRaw(json);
  }, []);
  useEffect(() => { load(); }, [load]);

  const data = useMemo(() => {
    if (!raw) return null;
    const hidden = new Set(raw.classes.filter((c) => /^unassigned/i.test(c.class_name)).map((c) => String(c.id)));
    return {
      ...raw,
      classes: raw.classes.filter((c) => !hidden.has(String(c.id))).sort(natural),
      students: raw.students.map((s) => (hidden.has(String(s.specific_class_id)) ? { ...s, specific_class_id: null } : s)),
    };
  }, [raw]);

  const isAdmin = data?.role === 'school_admin';
  useEffect(() => {
    if (!data) return;
    if ((adminOnly && !isAdmin) || (teacherOnly && isAdmin)) router.replace('/school');
  }, [data, isAdmin, adminOnly, teacherOnly, router]);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = '/';
  }

  const tab = (href, label, key) => (
    <Link
      href={href}
      className={'rounded-lg px-4 py-2 text-sm font-black transition ' + (active === key ? 'bg-bull-lime text-bull-ink' : 'border border-bull-line bg-bull-raised text-slate-300 hover:text-white')}
    >
      {label}
    </Link>
  );

  return (
    <main className="min-h-screen bg-bull-bg text-slate-200">
      <Navbar />
      <div className="mx-auto max-w-5xl space-y-6 px-4 pb-16 pt-28">
        {error && (
          <div className="mx-auto max-w-md space-y-4 rounded-2xl border border-bull-line bg-bull-surface p-6 text-center text-sm">
            <p>{error}</p>
            <button onClick={signOut} className="rounded-lg border border-bull-line px-4 py-2 text-slate-300">Sign out</button>
          </div>
        )}
        {!error && !data && <p className="py-20 text-center text-sm text-slate-400">Loading dashboard...</p>}
        {data && (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-black text-white">{data.school.name}</h1>
                <p className="text-sm text-slate-400">
                  {isAdmin ? 'School admin' : 'Teacher'} | Code <span className="font-mono">{data.school.code}</span> | Status {data.school.status}
                </p>
              </div>
              <button onClick={signOut} className="rounded-lg border border-bull-line bg-bull-raised px-4 py-2 text-sm font-bold text-slate-300 hover:text-rose-400">
                Sign out
              </button>
            </div>
            {isAdmin && (
              <nav className="flex gap-2">
                {tab('/school', 'Home', 'home')}
                {tab('/school/students', 'Students', 'students')}
              </nav>
            )}
            {typeof children === 'function' ? children({ data, isAdmin, reload: load }) : children}
          </>
        )}
      </div>
    </main>
  );
}