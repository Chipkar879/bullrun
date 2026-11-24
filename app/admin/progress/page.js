'use client';

import { useMemo } from 'react';
import { useAdmin } from '@/components/admin/AdminProvider';
import { SUPER_ADMIN_EMAIL, progressSummary } from '@/lib/admin';
import { Loading, PageHeader, Panel, Kpi } from '@/components/admin/ui';

export default function ProgressPage() {
  const { loading, allProfiles, progress, lastSeen } = useAdmin();

  const nums = useMemo(() => Object.keys(progress.totals || {}).map(Number).sort((a, b) => a - b), [progress]);
  const students = useMemo(() => allProfiles.filter((p) => p.role !== 'teacher' && p.email !== SUPER_ADMIN_EMAIL), [allProfiles]);

  const data = useMemo(() => {
    const sums = students.map((p) => ({ p, s: progressSummary(p.id, progress) }));
    const grand = nums.reduce((a, n) => a + progress.totals[n], 0);
    const modules = nums.map((n) => {
      const total = progress.totals[n];
      return {
        n, total,
        started: sums.filter((x) => Number(x.s.mods[n] || 0) > 0).length,
        completed: sums.filter((x) => total > 0 && Number(x.s.mods[n] || 0) >= total).length,
      };
    });
    const avgPct = sums.length && grand ? Math.round((sums.reduce((a, x) => a + x.s.doneAll, 0) / (sums.length * grand)) * 100) : 0;
    const startedAny = sums.filter((x) => x.s.doneAll > 0).length;
    const finishedAll = sums.filter((x) => grand > 0 && x.s.doneAll >= grand).length;
    const top = [...sums].filter((x) => x.s.doneAll > 0).sort((a, b) => b.s.doneAll - a.s.doneAll).slice(0, 10);
    const stalled = sums.filter((x) => x.s.doneAll > 0 && x.s.doneAll < grand && !lastSeen[x.p.id]).sort((a, b) => b.s.doneAll - a.s.doneAll).slice(0, 15);
    const map = {};
    sums.forEach((x) => {
      const k = x.p.school_id || x.p.school_code || 'Personal Track';
      const g = map[k] || (map[k] = { key: k, count: 0, done: 0, started: 0, finished: 0 });
      g.count += 1;
      g.done += x.s.doneAll;
      if (x.s.doneAll > 0) g.started += 1;
      if (grand > 0 && x.s.doneAll >= grand) g.finished += 1;
    });
    const schools = Object.values(map).map((g) => ({ ...g, pct: grand ? Math.round((g.done / (g.count * grand)) * 100) : 0 })).sort((a, b) => b.pct - a.pct);
    return { grand, modules, avgPct, startedAny, finishedAll, top, stalled, schools };
  }, [students, progress, nums, lastSeen]);

  if (loading) return <Loading text="Loading progress..." />;

  if (nums.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Learning Progress" subtitle="Where students drop off between modules." />
        <p className="rounded-2xl border border-amber-700/60 bg-amber-950/40 p-4 text-xs font-bold text-amber-300">
          No module data came back from /api/admin/user-progress yet. It refreshes every 25 seconds while this panel is open.
        </p>
      </div>
    );
  }

  const base = Math.max(1, students.length);

  return (
    <div className="space-y-6">
      <PageHeader title="Learning Progress" subtitle="Where students drop off between modules and schools." />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Students" value={students.length} />
        <Kpi label="Started Learning" value={data.startedAny} tone="text-bull-lime" sub={`${Math.round((data.startedAny / base) * 100)}% of students`} />
        <Kpi label="Finished Everything" value={data.finishedAll} tone="text-emerald-400" />
        <Kpi label="Avg Completion" value={`${data.avgPct}%`} tone="text-amber-300" sub={`${data.grand} lessons total`} />
      </div>

      <Panel title="Module funnel">
        <div className="space-y-4">
          {data.modules.map((m, i) => {
            const prev = i > 0 ? data.modules[i - 1] : null;
            const lost = prev ? prev.started - m.started : 0;
            return (
              <div key={m.n} className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="font-black text-white">Module {m.n} <span className="font-medium text-slate-500">({m.total} lessons)</span></span>
                  <span className="text-slate-400">
                    started <b className="text-bull-lime">{m.started}</b> · completed <b className="text-emerald-400">{m.completed}</b>
                    {prev && lost > 0 && <span className="ml-2 text-rose-400">−{lost} vs Module {prev.n}</span>}
                  </span>
                </div>
                <div className="relative h-3 overflow-hidden rounded-full border border-bull-line bg-bull-bg">
                  <div className="absolute inset-y-0 left-0 bg-bull-lime/40" style={{ width: `${(m.started / base) * 100}%` }} />
                  <div className="absolute inset-y-0 left-0 bg-emerald-400" style={{ width: `${(m.completed / base) * 100}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel title="By school">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-bull-raised text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono">
                <th className="p-3">School</th><th className="p-3 text-right">Students</th><th className="p-3 text-right">Started</th><th className="p-3 text-right">Finished all</th><th className="p-3">Avg completion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bull-line font-bold text-slate-300">
              {data.schools.map((g) => (
                <tr key={g.key}>
                  <td className="p-3 font-black text-white">{g.key}</td>
                  <td className="p-3 text-right font-mono">{g.count}</td>
                  <td className="p-3 text-right font-mono">{g.started}</td>
                  <td className="p-3 text-right font-mono">{g.finished}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-28 overflow-hidden rounded-full border border-bull-line bg-bull-bg"><div className="h-full bg-bull-lime" style={{ width: `${g.pct}%` }} /></div>
                      <span className="font-mono text-[11px]">{g.pct}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="🏅 Top learners">
          {data.top.length === 0 ? <p className="font-mono text-xs text-slate-500">Nobody has finished a lesson yet.</p> : (
            <div className="divide-y divide-bull-line">
              {data.top.map((x) => (
                <div key={x.p.id} className="flex items-center justify-between py-2.5 text-xs">
                  <span className="truncate font-bold text-white">{x.p.name || x.p.email}</span>
                  <span className="font-mono font-black text-bull-lime">{x.s.doneAll}/{x.s.totalAll}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>
        <Panel title="⚠️ Stalled (started, silent for 7+ days)">
          {data.stalled.length === 0 ? <p className="font-mono text-xs text-slate-500">No stalled learners. 🎉</p> : (
            <div className="divide-y divide-bull-line">
              {data.stalled.map((x) => (
                <div key={x.p.id} className="flex items-center justify-between py-2.5 text-xs">
                  <span className="truncate font-bold text-white">{x.p.name || x.p.email}</span>
                  <span className="font-mono text-amber-300">Module {x.s.reached} · {x.s.doneAll}/{x.s.totalAll}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}