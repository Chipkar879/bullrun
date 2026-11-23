'use client';

import { useState, useMemo } from 'react';
import { useAdmin } from '@/components/admin/AdminProvider';
import { getProfileFreezeStatus, formatLeft, timeAgo } from '@/lib/admin';

export default function AccessPage() {
  const { loading, allProfiles, expiringSoon, grantDays, now, lastSeen } = useAdmin();
  const [tab, setTab] = useState('soon');

  const expired = useMemo(
    () =>
      allProfiles
        .filter((p) => { const st = getProfileFreezeStatus(p, now); return st.isFrozen && !st.isSuperAdmin; })
        .sort((a, b) => (lastSeen[b.id] || 0) - (lastSeen[a.id] || 0)),
    [allProfiles, now, lastSeen]
  );

  if (loading) return <p className="py-20 text-center text-xs font-bold text-slate-400 animate-pulse font-mono">Loading access data...</p>;

  const rows = tab === 'soon' ? expiringSoon : expired;

  return (
    <div className="space-y-6">
      <div className="border-b border-bull-line pb-4">
        <h1 className="text-3xl font-black tracking-tight text-white">Access & Expiry</h1>
        <p className="mt-1 text-xs font-medium text-slate-400">Extend accounts that are about to lock, or revive ones that already did.</p>
      </div>

      <div className="space-y-4 rounded-3xl border-2 border-bull-line bg-bull-surface p-6 shadow-2xl">
        <div className="flex flex-wrap gap-2 font-mono">
          {[['soon', `Expiring in 7 days (${expiringSoon.length})`], ['expired', `Frozen / Expired (${expired.length})`]].map(([k, l]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`cursor-pointer rounded-xl border px-3.5 py-1.5 text-xs font-black uppercase ${tab === k ? 'border-bull-lime-dark bg-bull-lime text-bull-ink' : 'border-bull-line bg-bull-raised text-slate-300'}`}
            >
              {l}
            </button>
          ))}
        </div>

        {rows.length === 0 ? (
          <p className="py-4 font-mono text-xs font-medium text-slate-500">
            {tab === 'soon' ? 'Nobody is about to expire. 🎉' : 'No frozen accounts.'}
          </p>
        ) : (
          <div className="divide-y divide-bull-line overflow-hidden rounded-2xl border border-bull-line">
            {rows.map((p) => {
              const urgent = tab === 'soon' && p.expiryMs - now < 24 * 3600 * 1000;
              return (
                <div key={p.id} className="flex flex-col items-start justify-between gap-3 bg-bull-raised/50 px-4 py-3 text-xs md:flex-row md:items-center">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-white">{p.name || 'Unnamed'}</p>
                    <p className="truncate font-mono text-[11px] text-slate-400">{p.email}</p>
                  </div>
                  <div className="font-mono text-[11px] font-bold">
                    {tab === 'soon' ? (
                      <span className={urgent ? 'animate-pulse text-rose-400' : 'text-amber-300'}>⏳ {formatLeft(p.expiryMs - now)} left</span>
                    ) : (
                      <span className="text-slate-500">{lastSeen[p.id] ? 'Last seen ' + timeAgo(now - lastSeen[p.id]) : 'Not seen yet'}</span>
                    )}
                  </div>
                  <div className="flex gap-2 font-mono">
                    <button onClick={() => grantDays(p, 7)} className="cursor-pointer rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-black uppercase text-white hover:bg-emerald-700">+7 days</button>
                    <button onClick={() => grantDays(p, 30)} className="cursor-pointer rounded-lg border border-bull-lime/50 bg-bull-surface px-3 py-1.5 text-[11px] font-black uppercase text-bull-lime hover:bg-bull-raised">+30 days</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}