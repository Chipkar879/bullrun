'use client';

import { useState, useMemo } from 'react';
import { useAdmin } from '@/components/admin/AdminProvider';

const TABS = [['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected']];

export default function TeachersPage() {
  const { loading, allProfiles, updateTeacher } = useAdmin();
  const [tab, setTab] = useState('pending');

  const teachers = useMemo(() => allProfiles.filter((p) => p.role === 'teacher'), [allProfiles]);
  const counts = useMemo(() => {
    const c = { pending: 0, approved: 0, rejected: 0 };
    teachers.forEach((t) => { if (c[t.verification_status] !== undefined) c[t.verification_status] += 1; });
    return c;
  }, [teachers]);
  const list = teachers.filter((t) => t.verification_status === tab);

  if (loading) return <p className="py-20 text-center text-xs font-bold text-slate-400 animate-pulse font-mono">Loading teachers...</p>;

  return (
    <div className="space-y-6">
      <div className="border-b border-bull-line pb-4">
        <h1 className="text-3xl font-black tracking-tight text-white">Teacher Verification</h1>
        <p className="mt-1 text-xs font-medium text-slate-400">Audit appointment letters and manage teacher access.</p>
      </div>

      <div className="space-y-4 rounded-3xl border-2 border-bull-line bg-bull-surface p-6 shadow-2xl">
        <div className="flex flex-wrap gap-2 font-mono">
          {TABS.map(([k, l]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`cursor-pointer rounded-xl border px-3.5 py-1.5 text-xs font-black uppercase ${tab === k ? 'border-bull-lime-dark bg-bull-lime text-bull-ink' : 'border-bull-line bg-bull-raised text-slate-300'}`}
            >
              {l} ({counts[k]})
            </button>
          ))}
        </div>

        {list.length === 0 ? (
          <p className="py-4 font-mono text-xs font-medium text-slate-500">No {tab} teachers.</p>
        ) : (
          <div className="space-y-3">
            {list.map((t) => (
              <div key={t.id} className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-bull-line bg-bull-raised p-4 text-xs font-bold shadow-md md:flex-row md:items-center">
                <div className="space-y-1">
                  <p className="text-sm font-black text-white">{t.name || 'Unnamed'}</p>
                  <p className="font-mono font-medium text-slate-400">{t.email}</p>
                  {(t.school_code || t.school_id) && <p className="font-mono text-xs text-slate-500">🏫 {t.school_code || t.school_id}</p>}
                  {t.verification_document_url && (
                    <a href={t.verification_document_url} target="_blank" rel="noreferrer" className="inline-block pt-1 text-xs font-bold text-bull-lime hover:underline">
                      📂 View Appointment Letter Proof
                    </a>
                  )}
                </div>
                <div className="flex w-full gap-2 md:w-auto">
                  {tab !== 'approved' && (
                    <button onClick={() => updateTeacher(t.id, 'approved')} className="w-full cursor-pointer rounded-xl bg-emerald-600 px-4 py-2 font-mono text-xs font-black uppercase text-white md:w-auto">Approve</button>
                  )}
                  {tab !== 'rejected' && (
                    <button onClick={() => updateTeacher(t.id, 'rejected')} className="w-full cursor-pointer rounded-xl border border-rose-900 bg-rose-950 px-4 py-2 font-mono text-xs font-black uppercase text-rose-400 md:w-auto">
                      {tab === 'approved' ? 'Revoke' : 'Reject'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}