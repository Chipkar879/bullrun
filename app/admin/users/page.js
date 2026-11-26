'use client';

import { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAdmin } from '@/components/admin/AdminProvider';
import {
  SUPER_ADMIN_EMAIL, getProfileFreezeStatus, getNetWorth, inr, formatDuration,
  timeAgo, progressSummary, isOnline,
} from '@/lib/admin';

const SORTS = [
  ['rank', 'Net worth rank'],
  ['name', 'Name A-Z'],
  ['newest', 'Newest signup'],
  ['seen', 'Recently seen'],
  ['time', 'Most time on site'],
];

const csvCell = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';

export default function UsersPage() {
  const {
    loading, allProfiles, activity, lastSeen, progress, now,
    grantDays, bulkGrant, bulkFreeze, toggleFreeze, deleteProfile,
  } = useAdmin();

  const [searchQuery, setSearchQuery] = useState('');
  const [schoolFilter, setSchoolFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('rank');
  const [selectedId, setSelectedId] = useState(null);
  const [customDays, setCustomDays] = useState('30');
  const [picked, setPicked] = useState(new Set());
  const [bulkDays, setBulkDays] = useState('30');

  const removeUser = async (u) => {
    if (!window.confirm('Permanently delete ' + (u.name || u.email) + '? This removes their login too.')) return;
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/admin/delete-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (session?.access_token || '') },
      body: JSON.stringify({ userId: u.id }),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) { window.alert('Delete failed: ' + (out.error || res.status)); return; }
    window.location.reload();
  };
  const selectedProfile = useMemo(() => allProfiles.find((p) => p.id === selectedId) || null, [allProfiles, selectedId]);

  const schoolList = useMemo(() => {
    const s = new Set();
    allProfiles.forEach((p) => { if (p.school_id || p.school_code) s.add(p.school_id || p.school_code); });
    return Array.from(s).sort((a, b) => String(a).localeCompare(String(b)));
  }, [allProfiles]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const list = allProfiles.filter((p) => {
      const school = p.school_id || p.school_code;
      const matches =
        (p.name || '').toLowerCase().includes(q) ||
        (p.email || '').toLowerCase().includes(q) ||
        (school || '').toLowerCase().includes(q) ||
        (p.role || '').toLowerCase().includes(q);
      if (!matches) return false;

      const frozenNow = getProfileFreezeStatus(p, now).isFrozen;
      if (statusFilter === 'FROZEN' && !frozenNow) return false;
      if (statusFilter === 'UNFROZEN' && frozenNow) return false;
      if (statusFilter === 'ONLINE' && !isOnline(lastSeen, p.id, now)) return false;

      if (schoolFilter === 'ALL') return true;
      if (schoolFilter === 'PERSONAL') return p.role === 'personal' || !school;
      return school === schoolFilter;
    });

    const sorted = [...list];
    if (sortBy === 'name') sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    if (sortBy === 'newest') sorted.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    if (sortBy === 'seen') sorted.sort((a, b) => (lastSeen[b.id] || 0) - (lastSeen[a.id] || 0));
    if (sortBy === 'time') sorted.sort((a, b) => (activity[b.id] || 0) - (activity[a.id] || 0));
    return sorted;
  }, [allProfiles, searchQuery, schoolFilter, statusFilter, sortBy, lastSeen, activity, now]);

  const statusCounts = useMemo(() => {
    const c = { all: allProfiles.length, frozen: 0, unfrozen: 0, online: 0 };
    allProfiles.forEach((p) => {
      if (getProfileFreezeStatus(p, now).isFrozen) c.frozen += 1; else c.unfrozen += 1;
      if (isOnline(lastSeen, p.id, now)) c.online += 1;
    });
    return c;
  }, [allProfiles, lastSeen, now]);

  const togglePick = (id) => setPicked((prev) => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  const exportCsv = () => {
    const head = ['Rank', 'Name', 'Email', 'Role', 'School', 'Net Worth', 'Cash', 'Status', 'Last Seen', 'Week Seconds', 'Joined'];
    const rows = filtered.map((p) => {
      const st = getProfileFreezeStatus(p, now);
      const status = st.isSuperAdmin ? 'IMMUNE' : st.isFrozen ? 'FROZEN' : 'UNFROZEN';
      return [
        p.rank, p.name, p.email, p.role, p.school_id || p.school_code || '', getNetWorth(p), p.wallet_balance ?? 0,
        status, lastSeen[p.id] ? new Date(lastSeen[p.id]).toISOString() : '', activity[p.id] || 0, p.created_at || '',
      ].map(csvCell).join(',');
    });
    const blob = new Blob([[head.map(csvCell).join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bullrun-users-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <p className="py-20 text-center text-xs font-bold text-slate-400 animate-pulse font-mono">Loading users...</p>;

  const pillOn = 'bg-bull-lime border-bull-lime-dark text-bull-ink';
  const pillOff = 'bg-bull-raised border-bull-line text-slate-400';

  return (
    <div className="space-y-6">
      <div className="border-b border-bull-line pb-4">
        <h1 className="text-3xl font-black tracking-tight text-white">Users</h1>
        <p className="mt-1 text-xs font-medium text-slate-400">Inspect, filter, export, and manage every account.</p>
      </div>

      <div className="space-y-6 rounded-3xl border-2 border-bull-line bg-bull-surface p-6 shadow-2xl">
        <div className="flex flex-col items-start justify-between gap-4 border-b border-bull-line pb-4 md:flex-row md:items-center">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-300 font-mono">
            📊 Matrix ({filtered.length} / {allProfiles.length})
          </h2>
          <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">
            <input
              type="text"
              placeholder="🔍 Search name, email, school..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-bull-line bg-bull-raised px-4 py-2.5 text-xs font-bold text-white font-mono focus:border-bull-lime focus:outline-none md:w-64"
            />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-xl border border-bull-line bg-bull-raised px-3 py-2.5 text-xs font-bold text-slate-200 font-mono focus:outline-none"
            >
              {SORTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
            <button onClick={exportCsv} className="rounded-xl border border-bull-line bg-bull-raised px-4 py-2.5 text-xs font-black uppercase text-bull-lime font-mono hover:border-bull-lime/50 cursor-pointer">
              ⬇ CSV
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-xs font-black uppercase tracking-wider text-slate-500 font-mono">Filter By School Code:</span>
          <div className="flex flex-wrap gap-2 font-mono">
            <button onClick={() => setSchoolFilter('ALL')} className={`cursor-pointer rounded-xl border px-3.5 py-1.5 text-xs font-black uppercase ${schoolFilter === 'ALL' ? pillOn : pillOff}`}>All Users ({allProfiles.length})</button>
            <button onClick={() => setSchoolFilter('PERSONAL')} className={`cursor-pointer rounded-xl border px-3.5 py-1.5 text-xs font-black uppercase ${schoolFilter === 'PERSONAL' ? pillOn : pillOff}`}>Personal Track</button>
            {schoolList.map((s) => (
              <button key={s} onClick={() => setSchoolFilter(s)} className={`cursor-pointer rounded-xl border px-3.5 py-1.5 text-xs font-black uppercase ${schoolFilter === s ? pillOn : pillOff}`}>🏫 {s}</button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-xs font-black uppercase tracking-wider text-slate-500 font-mono">Filter By Status:</span>
          <div className="flex flex-wrap gap-2 font-mono">
            {[['ALL', 'All', statusCounts.all], ['UNFROZEN', 'Unfrozen', statusCounts.unfrozen], ['FROZEN', 'Frozen', statusCounts.frozen], ['ONLINE', 'Online now', statusCounts.online]].map(([k, l, c]) => (
              <button key={k} onClick={() => setStatusFilter(k)} className={`cursor-pointer rounded-xl border px-3.5 py-1.5 text-xs font-black uppercase ${statusFilter === k ? pillOn : pillOff}`}>{l} ({c})</button>
            ))}
          </div>
        </div>

        {/* BULK BAR */}
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-bull-line bg-bull-raised p-3 text-xs font-bold font-mono">
          <span className="text-slate-300">{picked.size} selected</span>
          <button onClick={() => setPicked(new Set(filtered.map((p) => p.id)))} className="cursor-pointer text-bull-lime hover:underline">Select all shown</button>
          <button onClick={() => setPicked(new Set())} className="cursor-pointer text-slate-400 hover:underline">Clear</button>
          {picked.size > 0 && (
            <>
              <span className="mx-1 text-slate-600">|</span>
              <input type="number" min="1" max="365" value={bulkDays} onChange={(e) => setBulkDays(e.target.value)} className="w-20 rounded-lg border border-bull-line bg-bull-surface px-2 py-1.5 text-center text-white focus:outline-none" />
              <button
                onClick={async () => { if (await bulkGrant([...picked], bulkDays)) setPicked(new Set()); }}
                className="cursor-pointer rounded-lg bg-emerald-600 px-3 py-1.5 font-black uppercase text-white hover:bg-emerald-700"
              >
                Grant {bulkDays || 0} days
              </button>
              <button
                onClick={async () => { if (await bulkFreeze([...picked])) setPicked(new Set()); }}
                className="cursor-pointer rounded-lg border border-rose-900 bg-rose-950 px-3 py-1.5 font-black uppercase text-rose-400"
              >
                Freeze
              </button>
            </>
          )}
        </div>

        {/* CARDS */}
        <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => {
            const { isFrozen, isSuperAdmin } = getProfileFreezeStatus(p, now);
            const seenAt = lastSeen[p.id];
            const online = isOnline(lastSeen, p.id, now);
            const sum = progressSummary(p.id, progress);
            const isPicked = picked.has(p.id);
            return (
              <div
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className={`group relative cursor-pointer space-y-3 overflow-hidden rounded-2xl border-2 bg-bull-raised p-5 shadow-xl transition-all hover:border-bull-lime/50 ${isPicked ? 'border-bull-lime' : 'border-bull-line'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-2.5">
                    {!isSuperAdmin && (
                      <input
                        type="checkbox"
                        checked={isPicked}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => togglePick(p.id)}
                        className="mt-1 h-4 w-4 cursor-pointer accent-lime-400"
                      />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="rounded border border-bull-line bg-bull-surface px-1.5 py-0.5 font-mono text-xs font-black text-bull-lime">#{p.rank}</span>
                        <h3 className="truncate text-sm font-black text-white group-hover:text-bull-lime">{p.name || 'Unnamed Account'}</h3>
                      </div>
                      <p className="mt-1 truncate font-mono text-xs text-slate-400">{p.email}</p>
                    </div>
                  </div>
                  <span className="rounded-full border border-bull-line bg-bull-surface px-2.5 py-0.5 font-mono text-xs font-black uppercase text-bull-lime">{p.role}</span>
                </div>

                <div className="flex items-center justify-between border-t border-bull-line pt-2 font-mono text-xs font-bold">
                  <div>
                    <span className="block text-xs uppercase text-slate-500">Net Worth</span>
                    <span className="text-emerald-400">{inr(getNetWorth(p))}</span>
                    <span className="mt-0.5 block text-xs text-slate-500">Cash {inr(p.wallet_balance)}</span>
                    <span className="mt-0.5 block text-xs text-sky-400">Week: {formatDuration(activity[p.id])}</span>
                    <span className={`mt-0.5 block text-xs ${online ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {online ? 'Online now' : seenAt ? 'Last seen ' + timeAgo(now - seenAt) : 'Not seen yet'}
                    </span>
                    <span className="mt-0.5 block text-xs text-bull-lime">
                      {sum.reached ? `Module ${sum.reached}: ${sum.reachedDone}/${sum.reachedTotal} (${sum.doneAll}/${sum.totalAll} lessons)` : 'No lessons yet'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="block text-xs uppercase text-slate-500">Status</span>
                    <span className={`rounded border px-2 py-0.5 text-xs font-black uppercase ${
                      isSuperAdmin ? 'border-sky-800 bg-sky-950 text-sky-400'
                        : isFrozen ? 'animate-pulse border-rose-800 bg-rose-950 text-rose-400'
                        : 'border-emerald-800 bg-emerald-950 text-emerald-400'
                    }`}>
                      {isSuperAdmin ? 'IMMUNE' : isFrozen ? 'FROZEN 🔒' : 'UNFROZEN 🔓'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {filtered.length === 0 && <p className="py-6 text-center text-xs font-bold text-slate-500 font-mono">No users match these filters.</p>}
      </div>

      {/* DOSSIER MODAL */}
      {selectedProfile && (() => {
        const sel = selectedProfile;
        const st = getProfileFreezeStatus(sel, now);
        const left = st.expiryMs ? Math.max(0, st.expiryMs - now) : 0;
        const d = Math.floor(left / 86400000);
        const h = Math.floor((left / 3600000) % 24);
        const m = Math.floor((left / 60000) % 60);
        const s = Math.floor((left / 1000) % 60);
        const pad = (n) => String(n).padStart(2, '0');
        const sum = progressSummary(sel.id, progress);
        const nums = Object.keys(progress.totals || {}).map(Number).sort((a, b) => a - b);
        const seenAt = lastSeen[sel.id];

        return (
          <div className="fixed inset-0 z-50 flex animate-fadeInFast items-center justify-center bg-bull-bg/80 p-4 backdrop-blur-md">
            <div className="flex max-h-[90vh] w-full max-w-2xl animate-scaleUp flex-col overflow-hidden rounded-3xl border-2 border-bull-line bg-bull-surface shadow-2xl">
              <div className="flex items-center justify-between border-b border-bull-line bg-bull-raised p-6">
                <div>
                  <h3 className="text-xl font-black tracking-tight text-white">{sel.name || 'User Workspace'}</h3>
                  <p className="font-mono text-xs text-slate-400">{sel.email}</p>
                </div>
                <button onClick={() => setSelectedId(null)} className="h-8 w-8 cursor-pointer rounded-full border border-bull-line bg-bull-surface font-bold text-slate-400 transition hover:text-white">✕</button>
              </div>

              <div className="flex-1 space-y-6 overflow-y-auto p-6 text-left font-mono">
                <div className="space-y-3 rounded-2xl border-2 border-bull-line bg-bull-raised p-5 shadow-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-bull-lime">Learning progress</span>
                    <span className="text-xs text-slate-400">{sum.doneAll} / {sum.totalAll} lessons</span>
                  </div>
                  <p className="font-sans text-xs text-slate-400">
                    {isOnline(lastSeen, sel.id, now) ? 'Online now' : seenAt ? 'Last seen ' + timeAgo(now - seenAt) : 'Not seen yet'}
                  </p>
                  <div className="space-y-1.5">
                    {nums.map((n) => {
                      const done = Number(sum.mods[n] || 0);
                      const t = progress.totals[n];
                      return (
                        <div key={n} className="flex items-center gap-2 text-xs">
                          <span className="w-20 text-slate-300">Module {n}</span>
                          <div className="h-2 flex-1 overflow-hidden rounded-full border border-bull-line bg-bull-bg">
                            <div className={'h-full ' + (done >= t ? 'bg-emerald-400' : 'bg-bull-lime')} style={{ width: (t ? (done / t) * 100 : 0) + '%' }} />
                          </div>
                          <span className="w-12 text-right text-slate-400">{done}/{t}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {!st.isSuperAdmin && (
                  <div className="space-y-3 rounded-2xl border-2 border-bull-lime/40 bg-bull-raised p-5 shadow-xl">
                    <span className="block text-xs font-black uppercase tracking-wider text-bull-lime">⚡ Custom Access Duration</span>
                    <p className="font-sans text-xs font-medium text-slate-300">Days of unfrozen access to grant this account:</p>
                    <div className="flex gap-2">
                      <input type="number" min="1" max="365" value={customDays} onChange={(e) => setCustomDays(e.target.value)} className="w-28 rounded-xl border border-bull-line bg-bull-surface px-3 py-2 text-center text-sm font-black text-white focus:border-bull-lime focus:outline-none" />
                      <button onClick={() => grantDays(sel, customDays)} className="flex-1 cursor-pointer rounded-xl bg-emerald-600 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-md transition hover:bg-emerald-700">
                        GRANT {customDays || 0} DAYS ACCESS ✓
                      </button>
                    </div>
                  </div>
                )}

                {!st.isSuperAdmin && (
                  <div className="flex items-center justify-between rounded-2xl border border-bull-line bg-bull-raised p-4">
                    <div>
                      <span className="block text-xs font-black text-white">Manual Freeze Switch</span>
                      <span className="font-sans text-xs text-slate-400">
                        Status: <span className={st.isFrozen ? 'font-bold text-rose-400' : 'font-bold text-emerald-400'}>{st.isFrozen ? 'FROZEN 🔒' : 'ACTIVE / UNFROZEN 🔓'}</span>
                      </span>
                    </div>
                    <button
                      onClick={() => toggleFreeze(sel, st.isFrozen)}
                      className={`cursor-pointer rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-wider shadow-md transition ${st.isFrozen ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-bull-lime text-bull-ink hover:bg-bull-lime-light'}`}
                    >
                      {st.isFrozen ? '🔓 UNFREEZE ACCOUNT' : '🔒 FREEZE ACCOUNT'}
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 text-xs font-bold md:grid-cols-2">
                  <div className="space-y-1 rounded-xl border border-bull-line bg-bull-raised p-3.5">
                    <span className="text-xs uppercase text-slate-500">School Code</span>
                    <p className="text-white">{sel.school_code || sel.school_id || 'Personal Track'}</p>
                  </div>
                  <div className="space-y-1 rounded-xl border border-bull-line bg-bull-raised p-3.5">
                    <span className="text-xs uppercase text-slate-500">Classroom ID</span>
                    <p className="text-white">{sel.specific_class_id || 'Unassigned'}</p>
                  </div>

                  <div className="col-span-1 space-y-1 rounded-xl border border-bull-line bg-bull-raised p-3.5 md:col-span-2">
                    <span className="block text-xs uppercase text-slate-500">Exact Time Remaining Before Freeze</span>
                    {st.isSuperAdmin || st.isPermanent ? (
                      <p className="font-bold text-amber-400">{st.isSuperAdmin ? '👑 Permanent Access (Super Admin)' : '♾️ Permanent Premium Access'}</p>
                    ) : st.isFrozen ? (
                      <p className="animate-pulse font-bold text-rose-400">00d : 00h : 00m : 00s (ACCOUNT FROZEN / EXPIRED)</p>
                    ) : (
                      <p className="pt-0.5 font-mono text-sm font-black text-emerald-400">{pad(d)}d : {pad(h)}h : {pad(m)}m : {pad(s)}s</p>
                    )}
                  </div>

                  <div className="space-y-1 rounded-xl border border-bull-line bg-bull-raised p-3.5">
                    <span className="text-xs uppercase text-slate-500">Net Worth (live)</span>
                    <p className="text-emerald-400">{inr(getNetWorth(sel))}</p>
                  </div>
                  <div className="space-y-1 rounded-xl border border-bull-line bg-bull-raised p-3.5">
                    <span className="text-xs uppercase text-slate-500">Wallet Balance (cash)</span>
                    <p className="text-white">{inr(sel.wallet_balance)}</p>
                  </div>
                  <div className="space-y-1 rounded-xl border border-bull-line bg-bull-raised p-3.5">
                    <span className="text-xs uppercase text-slate-500">Quiz Bazaar Bucks</span>
                    <p className="text-bull-lime">{sel.quiz_points || 0} BB</p>
                  </div>
                  <div className="space-y-1 rounded-xl border border-bull-line bg-bull-raised p-3.5">
                    <span className="text-xs uppercase text-slate-500">Last Quiz</span>
                    <p className="text-white">{sel.last_quiz_date || 'Never'}</p>
                  </div>
                  <div className="space-y-1 rounded-xl border border-bull-line bg-bull-raised p-3.5">
                    <span className="text-xs uppercase text-slate-500">Time on site (last 7 days)</span>
                    <p className="text-sky-400">{formatDuration(activity[sel.id])}</p>
                  </div>
                  <div className="space-y-1 rounded-xl border border-bull-line bg-bull-raised p-3.5">
                    <span className="text-xs uppercase text-slate-500">Average per day (7-day)</span>
                    <p className="text-sky-400">{formatDuration((activity[sel.id] || 0) / 7)}</p>
                  </div>
                  <div className="col-span-1 space-y-1 rounded-xl border border-bull-line bg-bull-raised p-3.5 md:col-span-2">
                    <span className="text-xs uppercase text-slate-500">Registration Date</span>
                    <p className="text-xs text-slate-300">{sel.created_at ? new Date(sel.created_at).toLocaleDateString() : 'N/A'}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-bull-line bg-bull-raised p-6 font-mono">
                <button
                  onClick={() => removeUser(sel)}
                  className="cursor-pointer rounded-xl bg-rose-700 px-4 py-2 text-xs font-black uppercase text-white hover:bg-rose-800"
                >
                  Delete Dossier
                </button>
                <button onClick={() => setSelectedId(null)} className="cursor-pointer rounded-xl border border-bull-line bg-bull-surface px-5 py-2 text-xs font-black uppercase text-slate-300">Close</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}