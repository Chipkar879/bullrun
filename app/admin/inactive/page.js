'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAdmin } from '@/components/admin/AdminProvider';
import { SUPER_ADMIN_EMAIL, getProfileFreezeStatus, istDayKey, DAY_MS } from '@/lib/admin';
import { Loading, PageHeader, Panel, Kpi, pill, inputCls } from '@/components/admin/ui';

const csvCell = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';

export default function InactivePage() {
  const { loading, allProfiles, now, grantDays, showToast } = useAdmin();
  const [lastDay, setLastDay] = useState({});
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState('');
  const [threshold, setThreshold] = useState(7);
  const [hideFrozen, setHideFrozen] = useState(false);
  const [q, setQ] = useState('');

  useEffect(() => {
    (async () => {
      const cutoff = istDayKey(Date.now() - 60 * DAY_MS);
      const map = {};
      let from = 0;
      for (;;) {
        const { data, error } = await supabase.from('user_activity').select('user_id, day').gte('day', cutoff).range(from, from + 999);
        if (error) { setErr(error.message); break; }
        (data || []).forEach((r) => { if (!map[r.user_id] || r.day > map[r.user_id]) map[r.user_id] = r.day; });
        if (!data || data.length < 1000) break;
        from += 1000;
      }
      setLastDay(map);
      setReady(true);
    })();
  }, []);

  const todayKey = istDayKey(now);
  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return allProfiles
      .filter((p) => p.email !== SUPER_ADMIN_EMAIL)
      .map((p) => {
        const last = lastDay[p.id];
        const ago = last ? Math.round((Date.parse(todayKey) - Date.parse(last)) / DAY_MS) : null;
        const joinedDays = p.created_at ? Math.floor((now - new Date(p.created_at).getTime()) / DAY_MS) : 999;
        return { p, last, ago, joinedDays, frozen: getProfileFreezeStatus(p, now).isFrozen };
      })
      .filter((r) => (r.ago === null ? r.joinedDays >= threshold : r.ago >= threshold))
      .filter((r) => !(hideFrozen && r.frozen))
      .filter((r) => !term || (r.p.name || '').toLowerCase().includes(term) || (r.p.email || '').toLowerCase().includes(term) || (r.p.school_id || r.p.school_code || '').toLowerCase().includes(term))
      .sort((a, b) => (b.ago === null ? 999 : b.ago) - (a.ago === null ? 999 : a.ago));
  }, [allProfiles, lastDay, threshold, hideFrozen, q, todayKey, now]);

  const never = list.filter((r) => r.ago === null).length;

  const copyEmails = async () => {
    const text = list.map((r) => r.p.email).filter(Boolean).join(', ');
    try { await navigator.clipboard.writeText(text); showToast(`Copied ${list.length} email(s)`); } catch (e) { showToast('Clipboard blocked by the browser', 'error'); }
  };

  const exportCsv = () => {
    const head = ['Name', 'Email', 'Role', 'School', 'Last Active', 'Days Ago', 'Status', 'Joined'];
    const rows = list.map((r) => [r.p.name, r.p.email, r.p.role, r.p.school_id || r.p.school_code || '', r.last || '', r.ago ?? '', r.frozen ? 'FROZEN' : 'ACTIVE', r.p.created_at || ''].map(csvCell).join(','));
    const blob = new Blob([[head.map(csvCell).join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bullrun-inactive-${threshold}d-${todayKey}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading || !ready) return <Loading text="Checking activity history..." />;

  return (
    <div className="space-y-6">
      <PageHeader title="Inactive Users" subtitle="Students who have gone quiet. Copy their emails or give them more time." />

      {err && <p className="rounded-2xl border border-rose-800 bg-rose-950/40 p-3 text-xs font-bold text-rose-300">Activity query failed: {err}</p>}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Kpi label={`Inactive ${threshold}+ days`} value={list.length} tone="text-amber-300" />
        <Kpi label="Never active" value={never} tone="text-rose-400" sub="no activity in last 60 days" />
        <Kpi label="Total Users" value={allProfiles.length - 1} />
      </div>

      <Panel>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {[3, 7, 14, 30].map((d) => <button key={d} onClick={() => setThreshold(d)} className={pill(threshold === d)}>{d}+ days</button>)}
            <label className="ml-2 flex cursor-pointer items-center gap-2 text-xs font-bold text-slate-300 font-mono">
              <input type="checkbox" checked={hideFrozen} onChange={(e) => setHideFrozen(e.target.checked)} className="h-4 w-4 accent-lime-400" /> Hide frozen
            </label>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 Search..." className={`${inputCls} sm:w-52`} />
            <button onClick={copyEmails} className={pill(false)}>📋 Copy emails</button>
            <button onClick={exportCsv} className={pill(false)}>⬇ CSV</button>
          </div>
        </div>

        {list.length === 0 ? (
          <p className="py-4 font-mono text-xs text-slate-500">Everyone has been active recently. 🎉</p>
        ) : (
          <div className="divide-y divide-bull-line overflow-hidden rounded-2xl border border-bull-line">
            {list.map((r) => (
              <div key={r.p.id} className="flex flex-col items-start justify-between gap-3 bg-bull-raised/50 px-4 py-3 text-xs md:flex-row md:items-center">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-white">{r.p.name || 'Unnamed'} <span className="ml-1 rounded-full border border-bull-line bg-bull-surface px-2 py-0.5 font-mono text-xs uppercase text-bull-lime">{r.p.role}</span></p>
                  <p className="truncate font-mono text-xs text-slate-400">{r.p.email}</p>
                </div>
                <div className="font-mono text-xs font-bold">
                  <span className={r.ago === null || r.ago >= 14 ? 'text-rose-400' : 'text-amber-300'}>{r.ago === null ? 'No activity in 60d' : `${r.ago}d ago`}</span>
                  <span className={`ml-3 ${r.frozen ? 'text-rose-400' : 'text-emerald-400'}`}>{r.frozen ? 'FROZEN 🔒' : 'ACTIVE 🔓'}</span>
                </div>
                <button onClick={() => grantDays(r.p, 7)} className="cursor-pointer rounded-lg bg-emerald-600 px-3 py-1.5 font-mono text-xs font-black uppercase text-white hover:bg-emerald-700">+7 days</button>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}