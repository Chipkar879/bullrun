'use client';

import { useState } from 'react';
import SchoolShell from '@/components/school/SchoolShell';
import StudentTable from '@/components/school/StudentTable';
import { supabase } from '@/lib/supabase';
import { inr, mean, worth } from '@/components/school/format';

function Manage({ data, reload }) {
  const [msg, setMsg] = useState('');
  const { students, classes, teachers } = data;
  const teacherName = {};
  teachers.forEach((t) => { teacherName[t.id] = t.name || t.email; });

  async function setStatus(id, status) {
    setMsg('');
    const { error } = await supabase.rpc('school_admin_set_teacher_status', { p_teacher: id, p_status: status });
    if (error) { setMsg(error.message); return; }
    reload();
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-bull-line bg-bull-surface p-4">
        <h2 className="mb-3 text-base font-black text-white">Teachers ({teachers.length})</h2>
        {msg && <p className="mb-3 rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-300">{msg}</p>}
        {teachers.length === 0 && <p className="text-sm text-slate-400">No teachers have joined with your school code yet.</p>}
        <div className="space-y-2">
          {teachers.map((t) => (
            <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-bull-line bg-bull-raised p-3 text-sm">
              <div>
                <p className="font-bold text-white">{t.name || 'Unnamed'}</p>
                <p className="font-mono text-xs text-slate-400">{t.email} | {t.verification_status}</p>
                {t.verification_document_url && (
                  <a href={t.verification_document_url} target="_blank" rel="noreferrer" className="text-xs text-bull-lime underline">View letter</a>
                )}
              </div>
              <div className="flex gap-2">
                {t.verification_status !== 'approved' && (
                  <button onClick={() => setStatus(t.id, 'approved')} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white">Approve</button>
                )}
                {t.verification_status !== 'rejected' && (
                  <button onClick={() => setStatus(t.id, 'rejected')} className="rounded-lg border border-rose-900 bg-rose-950 px-3 py-2 text-sm font-bold text-rose-400">
                    {t.verification_status === 'approved' ? 'Revoke' : 'Reject'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-bull-line bg-bull-surface p-4">
        <h2 className="mb-3 text-base font-black text-white">Classes ({classes.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs font-bold uppercase tracking-wider text-slate-400">
                <th className="p-2">Class</th><th className="p-2">Teacher</th><th className="p-2 text-right">Students</th><th className="p-2 text-right">Active</th><th className="p-2 text-right">Avg net worth</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bull-line">
              {classes.map((c) => {
                const list = students.filter((s) => String(s.specific_class_id) === String(c.id));
                return (
                  <tr key={c.id}>
                    <td className="p-2 font-bold text-white">{c.class_name}</td>
                    <td className="p-2">{teacherName[c.assigned_teacher_id] || '-'}</td>
                    <td className="p-2 text-right font-mono">{list.length}</td>
                    <td className="p-2 text-right font-mono">{list.filter((s) => s.week_seconds > 0).length}</td>
                    <td className="p-2 text-right font-mono">{inr(mean(list.map(worth)))}</td>
                  </tr>
                );
              })}
              {classes.length === 0 && <tr><td colSpan={5} className="p-3 text-slate-500">No classes yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <StudentTable students={students} classes={classes} showFilter title="All students" />
    </div>
  );
}

export default function SchoolManagePage() {
  return <SchoolShell active="manage" adminOnly>{({ data, reload }) => <Manage data={data} reload={reload} />}</SchoolShell>;
}
