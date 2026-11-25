'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { inr, hm, worth } from './format';

export default function StudentTable({ students, classes, showFilter = false, title = 'Students' }) {
  const [q, setQ] = useState('');
  const [f, setF] = useState('all');

  const nameOf = useMemo(() => {
    const m = {};
    classes.forEach((c) => { m[String(c.id)] = c.class_name; });
    return m;
  }, [classes]);
  const hasUnassigned = students.some((s) => !s.specific_class_id);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return students
      .filter((s) => f === 'all' || (f === 'none' ? !s.specific_class_id : String(s.specific_class_id) === f))
      .filter((s) => !needle || (s.name || '').toLowerCase().includes(needle) || (s.email || '').toLowerCase().includes(needle))
      .sort((a, b) => worth(b) - worth(a));
  }, [students, q, f]);

  return (
    <section className="rounded-2xl border border-bull-line bg-bull-surface p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-black text-white">{title} ({shown.length})</h2>
        <div className="flex gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email"
            className="rounded-lg border border-bull-line bg-bull-raised px-3 py-2 text-sm text-white outline-none focus:border-bull-lime" />
          {showFilter && (
            <select value={f} onChange={(e) => setF(e.target.value)}
              className="rounded-lg border border-bull-line bg-bull-raised px-3 py-2 text-sm text-white">
              <option value="all">All classes</option>
              {classes.map((c) => <option key={c.id} value={String(c.id)}>{c.class_name}</option>)}
              {hasUnassigned && <option value="none">Unassigned</option>}
            </select>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs font-bold uppercase tracking-wider text-slate-400">
              <th className="p-2">Student</th>
              {showFilter && <th className="p-2">Class</th>}
              <th className="p-2 text-right">Net worth</th>
              <th className="p-2 text-right">Cash</th>
              <th className="p-2 text-right">This week</th>
              <th className="p-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-bull-line">
            {shown.map((s) => (
              <tr key={s.id}>
                <td className="p-2">
                  <Link href={'/school/student/' + s.id} className="font-bold text-white hover:text-bull-lime hover:underline">{s.name || 'Unnamed'}</Link>
                  <p className="font-mono text-xs text-slate-500">{s.email}</p>
                </td>
                {showFilter && <td className="p-2">{nameOf[String(s.specific_class_id)] || 'Unassigned'}</td>}
                <td className="p-2 text-right font-mono">{inr(worth(s))}</td>
                <td className="p-2 text-right font-mono">{inr(s.wallet_balance)}</td>
                <td className="p-2 text-right font-mono">{hm(s.week_seconds)}</td>
                <td className="p-2">{s.is_frozen ? <span className="text-rose-400">Frozen</span> : <span className="text-emerald-400">Active</span>}</td>
              </tr>
            ))}
            {shown.length === 0 && <tr><td colSpan={6} className="p-3 text-slate-500">No students match.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
