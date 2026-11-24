'use client';

import { useState, useMemo } from 'react';
import { useAdmin } from '@/components/admin/AdminProvider';
import { SUPER_ADMIN_EMAIL, getProfileFreezeStatus, getNetWorth, inr, progressSummary } from '@/lib/admin';
import { Loading, PageHeader, Panel, Kpi, inputCls } from '@/components/admin/ui';

const mean = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

export default function SchoolsPage() {
  const { loading, allProfiles, activity, progress, now } = useAdmin();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(null);

  const grand = useMemo(() => Object.values(progress.totals || {}).reduce((a, b) => a + b, 0), [progress]);

  const metrics = (list) => {
    const students = list.filter((p) => p.role !== 'teacher');
    return {
      students: students.length,
      active: students.filter((p) => (activity[p.id] || 0) > 0).length,
      frozen: students.filter((p) => getProfileFreezeStatus(p, now).isFrozen).length,
      avgNet: mean(students.map(getNetWorth)),
      avgProg: grand ? Math.round(mean(students.map((p) => progressSummary(p.id, progress).doneAll / grand)) * 100) : 0,
    };
  };

  const groups = useMemo(() => {
    const map = {};
    allProfiles.forEach((p) => {
      if (p.email === SUPER_ADMIN_EMAIL) return;
      const k = p.school_id || p.school_code || 'Personal Track';
      (map[k] || (map[k] = [])).push(p);
    });
    return Object.entries(map)
      .map(([key, list]) => {
        const classes = {};
        list.filter((p) => p.role !== 'teacher').forEach((p) => {
          const c = p.specific_class_id || 'Unassigned';
          (classes[c] || (classes[c] = [])).push(p);
        });
        return {
          key,
          teachers: list.filter((p) => p.role === 'teacher').length,
          ...metrics(list),
          classes: Object.entries(classes).map(([name, l]) => ({ name, ...metrics(l) })).sort((a, b) => b.students - a.students),
        };
      })
      .sort((a, b) => b.students - a.students);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allProfiles, activity, progress, now, grand]);

  const shown = groups.filter((g) => g.key.toLowerCase().includes(q.trim().toLowerCase()));
  const schoolsOnly = groups.filter((g) => g.key !== 'Personal Track');

  if (loading) return <Loading text="Loading schools..." />;

  return (
    <div className="space-y-6">
      <PageHeader title="Schools & Classes" subtitle="Compare schools, then open one to see its classes." />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Schools" value={schoolsOnly.length} tone="text-bull-lime" />
        <Kpi label="Teachers" value={allProfiles.filter((p) => p.role === 'teacher').length} tone="text-amber-300" />
        <Kpi label="Students" value={groups.reduce((a, g) => a + g.students, 0)} />
        <Kpi label="Active This Week" value={groups.reduce((a, g) => a + g.active, 0)} tone="text-emerald-400" />
      </div>

      <Panel title="Schools" right={<input value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 Filter schools..." className={`${inputCls} w-48`} />}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-bull-raised text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono">
                <th className="p-3">School</th><th className="p-3 text-right">Students</th><th className="p-3 text-right">Teachers</th>
                <th className="p-3 text-right">Active (7d)</th><th className="p-3 text-right">Frozen</th><th className="p-3 text-right">Avg net worth</th><th className="p-3 text-right">Avg progress</th>
              </tr>
            </thead>
            <tbody className="font-bold text-slate-300">
              {shown.map((g) => (
                <>
                  <tr key={g.key} onClick={() => setOpen(open === g.key ? null : g.key)} className="cursor-pointer border-t border-bull-line hover:bg-bull-raised/60">
                    <td className="p-3 font-black text-white">{open === g.key ? '▾' : '▸'} 🏫 {g.key}</td>
                    <td className="p-3 text-right font-mono">{g.students}</td>
                    <td className="p-3 text-right font-mono">{g.teachers}</td>
                    <td className="p-3 text-right font-mono text-emerald-400">{g.active}{g.students ? ` (${Math.round((g.active / g.students) * 100)}%)` : ''}</td>
                    <td className="p-3 text-right font-mono text-rose-400">{g.frozen}</td>
                    <td className="p-3 text-right font-mono">{inr(g.avgNet)}</td>
                    <td className="p-3 text-right font-mono text-bull-lime">{g.avgProg}%</td>
                  </tr>
                  {open === g.key && (
                    <tr key={g.key + '-classes'} className="bg-bull-bg/60">
                      <td colSpan={7} className="p-3">
                        <table className="w-full text-left text-[11px]">
                          <thead>
                            <tr className="text-[10px] font-black uppercase text-slate-500 font-mono">
                              <th className="p-2">Class</th><th className="p-2 text-right">Students</th><th className="p-2 text-right">Active (7d)</th><th className="p-2 text-right">Avg net worth</th><th className="p-2 text-right">Avg progress</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-bull-line">
                            {g.classes.map((c) => (
                              <tr key={c.name}>
                                <td className="p-2 font-black text-white">{c.name}</td>
                                <td className="p-2 text-right font-mono">{c.students}</td>
                                <td className="p-2 text-right font-mono text-emerald-400">{c.active}</td>
                                <td className="p-2 text-right font-mono">{inr(c.avgNet)}</td>
                                <td className="p-2 text-right font-mono text-bull-lime">{c.avgProg}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
        {shown.length === 0 && <p className="py-4 text-center font-mono text-xs text-slate-500">No schools match.</p>}
      </Panel>
    </div>
  );
}