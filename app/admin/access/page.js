'use client';

import { useState, useMemo } from 'react';
import { useAdmin } from '@/components/admin/AdminProvider';
import { getProfileFreezeStatus, formatLeft, timeAgo } from '@/lib/admin';
import { Loading, PageHeader, Panel, pill, inputCls } from '@/components/admin/ui';

export default function AccessPage() {
  const { loading, allProfiles, expiringSoon, grantDays, now, lastSeen } = useAdmin();
  const [tab, setTab] = useState('soon');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('urgent');

  const expired = useMemo(
    () => allProfiles.filter((p) => { const st = getProfileFreezeStatus(p, now); return st.isFrozen && !st.isSuperAdmin; }),
    [allProfiles, now]
  );

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    const base = tab === 'soon' ? expiringSoon : expired;
    const list = base.filter((p) => {
      if (!term) return true;
      return (
        (p.name || '').toLowerCase().includes(term) ||
        (p.email || '').toLowerCase().includes(term) ||
        (p.school_id || p.school_code || '').toLowerCase().includes(term)
      );
    });
    const out = [...list];
    if (sort === 'name') out.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    else if (sort === 'seen') out.sort((a, b) => (lastSeen[b.id] || 0) - (lastSeen[a.id] || 0));
    else if (tab === 'soon') out.sort((a, b) => a.expiryMs - b.expiryMs);
    else out.sort((a, b) => (lastSeen[b.id] || 0) - (lastSeen[a.id] || 0));
    return out;
  }, [tab, q, sort, expiringSoon, expired, lastSeen]);

  if (loading) return <Loading text="Loading access data..." />;

  return (
    <div className="space-y-6">
      <PageHeader title="Access & Expiry" subtitle="Extend accounts that are about to lock, or revive ones that already did." />

      <Panel>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setTab('soon')} className={pill(tab === 'soon')}>Expiring in 7 days ({expiringSoon.length})</button>
            <button onClick={() => setTab('expired')} className={pill(tab === 'expired')}>Frozen / Expired ({expired.length})</button>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="🔍 Search name, email, school..."
              className={`${inputCls} md:w-64`}
            />
            <select value={sort} onChange={(e) => setSort(e.target.value)} className={inputCls}>
              <option value="urgent">{tab === 'soon' ? 'Most urgent first' : 'Recently seen first'}</option>
              <option value="name">Name A-Z</option>
              <option value="seen">Recently seen</option>
            </select>
          </div>
        </div>

        <p className="font-mono text-xs text-slate-500">Showing {rows.length} account(s)</p>

        {rows.length === 0 ? (
          <p className="py-4 font-mono text-xs font-medium text-slate-500">
            {q ? 'No accounts match your search.' : tab === 'soon' ? 'Nobody is about to expire. 🎉' : 'No frozen accounts.'}
          </p>
        ) : (
          <div className="divide-y divide-bull-line overflow-hidden rounded-2xl border border-bull-line">
            {rows.map((p) => {
              const urgent = tab === 'soon' && p.expiryMs - now < 24 * 3600 * 1000;
              return (
                <div key={p.id} className="flex flex-col items-start justify-between gap-3 bg-bull-raised/50 px-4 py-3 text-xs md:flex-row md:items-center">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-white">{p.name || 'Unnamed'}</p>
                    <p className="truncate font-mono text-xs text-slate-400">{p.email}</p>
                    {(p.school_id || p.school_code) && <p className="font-mono text-xs text-slate-500">🏫 {p.school_id || p.school_code}</p>}
                  </div>
                  <div className="font-mono text-xs font-bold">
                    {tab === 'soon' ? (
                      <span className={urgent ? 'animate-pulse text-rose-400' : 'text-amber-300'}>⏳ {formatLeft(p.expiryMs - now)} left</span>
                    ) : (
                      <span className="text-slate-500">{lastSeen[p.id] ? 'Last seen ' + timeAgo(now - lastSeen[p.id]) : 'Not seen yet'}</span>
                    )}
                  </div>
                  <div className="flex gap-2 font-mono">
                    <button onClick={() => grantDays(p, 7)} className="cursor-pointer rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-black uppercase text-white hover:bg-emerald-700">+7 days</button>
                    <button onClick={() => grantDays(p, 30)} className="cursor-pointer rounded-lg border border-bull-lime/50 bg-bull-surface px-3 py-1.5 text-xs font-black uppercase text-bull-lime hover:bg-bull-raised">+30 days</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}