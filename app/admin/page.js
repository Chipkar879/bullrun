'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useAdmin } from '@/components/admin/AdminProvider';
import { getProfileFreezeStatus, getNetWorth, inr, istDayKey, isOnline, localDayKey, DAY_MS } from '@/lib/admin';

function Kpi({ label, value, sub, tone = 'text-white' }) {
  return (
    <div className="rounded-2xl border-2 border-bull-line bg-bull-surface p-4 shadow-xl">
      <p className="text-xs font-black uppercase tracking-wider text-slate-400 font-mono">{label}</p>
      <p className={`mt-1 font-mono text-3xl font-black ${tone}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs font-mono text-slate-500">{sub}</p>}
    </div>
  );
}

export default function OverviewPage() {
  const { loading, allProfiles, activityRows, lastSeen, now, expiringSoon } = useAdmin();

  const stats = useMemo(() => {
    const todayIst = istDayKey(now);
    const weekAgo = now - 7 * DAY_MS;
    const todayLocal = localDayKey();
    let frozen = 0, online = 0, signupsToday = 0, signupsWeek = 0, quizToday = 0, expiring3 = 0;

    allProfiles.forEach((p) => {
      const st = getProfileFreezeStatus(p, now);
      if (st.isFrozen) frozen += 1;
      if (isOnline(lastSeen, p.id, now)) online += 1;
      if (p.created_at) {
        const t = new Date(p.created_at).getTime();
        if (istDayKey(t) === todayIst) signupsToday += 1;
        if (t >= weekAgo) signupsWeek += 1;
      }
      if (p.last_quiz_date === todayLocal) quizToday += 1;
      if (!st.isFrozen && !st.isSuperAdmin && !st.isPermanent && st.expiryMs && st.expiryMs - now < 3 * DAY_MS) expiring3 += 1;
    });

    const days = [];
    for (let i = 6; i >= 0; i--) {
      const key = istDayKey(now - i * DAY_MS);
      const users = new Set(activityRows.filter((r) => r.day === key).map((r) => r.user_id));
      days.push({ key, label: new Date(key + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short' }), count: users.size });
    }

    return { frozen, online, signupsToday, signupsWeek, quizToday, expiring3, days };
  }, [allProfiles, activityRows, lastSeen, now]);

  const topFive = useMemo(() => allProfiles.filter((p) => p.rank !== '-').slice(0, 5), [allProfiles]);
  const newest = useMemo(
    () => [...allProfiles].filter((p) => p.created_at).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5),
    [allProfiles]
  );
  const maxDau = Math.max(1, ...stats.days.map((d) => d.count));

  if (loading) return <p className="py-20 text-center text-xs font-bold text-slate-400 animate-pulse font-mono">Loading overview...</p>;

  return (
    <div className="space-y-8">
      <div className="border-b border-bull-line pb-4">
        <span className="mb-2 inline-block rounded-full border border-bull-line bg-bull-raised px-3 py-1 text-xs font-black uppercase tracking-widest text-bull-lime font-mono">
          🛡️ Super Admin Clearance
        </span>
        <h1 className="text-3xl font-black tracking-tight text-white">Overview</h1>
        <p className="mt-1 text-xs font-medium text-slate-400">Live snapshot of your platform.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Total Users" value={allProfiles.length} tone="text-white" />
        <Kpi label="Online Now" value={stats.online} tone="text-emerald-400" sub="active in last 90s" />
        <Kpi label="Frozen" value={stats.frozen} tone="text-rose-400" />
        <Kpi label="Expiring in 3 days" value={stats.expiring3} tone="text-amber-300" sub={`${expiringSoon.length} within 7 days`} />
        <Kpi label="Signups Today" value={stats.signupsToday} tone="text-bull-lime" />
        <Kpi label="Signups This Week" value={stats.signupsWeek} tone="text-bull-lime" />
        <Kpi label="Quizzes Played Today" value={stats.quizToday} tone="text-sky-300" />
        <Kpi label="Teachers Pending" value={allProfiles.filter((p) => p.role === 'teacher' && p.verification_status === 'pending').length} tone="text-amber-300" />
      </div>

      <div className="rounded-3xl border-2 border-bull-line bg-bull-surface p-6 shadow-2xl">
        <h2 className="text-sm font-black uppercase tracking-wider text-slate-300 font-mono">Daily Active Users · last 7 days</h2>
        <div className="mt-5 flex h-40 items-end justify-between gap-3">
          {stats.days.map((d) => (
            <div key={d.key} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
              <span className="font-mono text-xs font-black text-slate-300">{d.count}</span>
              <div className="flex w-full max-w-[48px] flex-1 items-end overflow-hidden rounded-t-lg bg-bull-raised/60">
                <div className="w-full rounded-t-lg" style={{ height: `${d.count ? Math.max(6, (d.count / maxDau) * 100) : 0}%`, background: 'linear-gradient(to top,#65a30d,#bef264)' }} />
              </div>
              <span className="text-xs font-black uppercase text-slate-500">{d.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border-2 border-bull-line bg-bull-surface p-6 shadow-2xl">
          <h2 className="mb-3 text-sm font-black uppercase tracking-wider text-slate-300 font-mono">🏆 Top 5 by Net Worth</h2>
          <div className="divide-y divide-bull-line">
            {topFive.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2.5 text-xs">
                <span className="truncate font-bold text-white"><span className="mr-2 font-mono text-bull-lime">#{p.rank}</span>{p.name || p.email}</span>
                <span className="font-mono font-black text-emerald-400">{inr(getNetWorth(p))}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border-2 border-bull-line bg-bull-surface p-6 shadow-2xl">
          <h2 className="mb-3 text-sm font-black uppercase tracking-wider text-slate-300 font-mono">🆕 Newest Signups</h2>
          <div className="divide-y divide-bull-line">
            {newest.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2.5 text-xs">
                <span className="truncate font-bold text-white">{p.name || p.email}</span>
                <span className="font-mono text-slate-400">{new Date(p.created_at).toLocaleDateString('en-IN')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {expiringSoon.length > 0 && (
        <Link href="/admin/access" className="block rounded-2xl border border-amber-700/60 bg-amber-950/40 p-4 text-xs font-bold text-amber-300 hover:bg-amber-950/60">
          ⏳ {expiringSoon.length} account(s) expire within 7 days. Review in Access & Expiry →
        </Link>
      )}
    </div>
  );
}