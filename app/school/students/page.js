'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import SchoolShell from '@/components/school/SchoolShell';
import { supabase } from '@/lib/supabase';

const inr = (n) => '\u20B9' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
const dur = (s) => {
  s = Math.round(Number(s) || 0);
  if (s < 60) return s + 's';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? h + 'h ' + m + 'm' : m + 'm';
};
const dayLabel = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short' });
const fmtDay = (d) => {
  if (!d) return 'Never';
  const x = new Date(d);
  return isNaN(x) ? String(d) : x.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};
const grad = (i) => {
  const h = (i * 47 + 78) % 360;
  return 'linear-gradient(135deg, hsl(' + h + ' 85% 62%), hsl(' + ((h + 45) % 360) + ' 85% 55%))';
};
const initials = (n) => (String(n).match(/[A-Za-z0-9]+/g) || ['?']).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

function Stat({ label, value, accent }) {
  return (
    <div className="rounded-xl border border-bull-line bg-bull-bg/60 p-3.5">
      <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">{label}</p>
      <p className={'mt-1 text-xl font-black ' + (accent || 'text-white')}>{value}</p>
    </div>
  );
}

function Bars({ bars }) {
  const max = Math.max(1, ...bars.map((b) => b.seconds));
  return (
    <div className="flex h-40 items-end gap-2">
      {bars.map((b, i) => (
        <div key={b.day} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
          <span className="text-[10px] font-bold text-slate-400">{b.seconds ? dur(b.seconds) : ''}</span>
          <div
            className="w-full rounded-t-lg transition-all duration-700"
            style={{ height: Math.max(b.seconds ? 6 : 2, (b.seconds / max) * 100) + '%', background: b.seconds ? grad(i) : 'rgba(148,163,184,.25)' }}
          />
          <span className="text-[11px] font-bold text-slate-500">{dayLabel(b.day)}</span>
        </div>
      ))}
    </div>
  );
}

function Dossier({ s, index }) {
  return (
    <div className="relative space-y-5 rounded-2xl border border-bull-line bg-bull-surface p-5 pt-7">
      <div className="absolute -top-3 left-5 rounded-t-lg border border-b-0 border-bull-line bg-bull-surface px-3 py-0.5 text-[11px] font-black uppercase tracking-widest text-bull-lime">
        Student file
      </div>
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-black text-bull-ink" style={{ background: grad(index) }}>
          {initials(s.name)}
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-xl font-black text-white">{s.name}</h3>
          <p className="truncate text-sm text-slate-400">{s.class_name || 'Unassigned'} | {s.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Net worth (live)" value={inr(s.net_worth)} accent="text-bull-lime" />
        <Stat label="Wallet balance" value={inr(s.wallet_balance)} />
        <Stat label="Bazaar Bucks" value={Number(s.bucks).toLocaleString('en-IN')} />
        <Stat label="Last quiz" value={fmtDay(s.last_quiz_date)} />
        <Stat label="Time on site (week)" value={dur(s.week_seconds)} />
        <Stat label="Avg per day (7-day)" value={dur(s.avg_seconds)} />
      </div>

      <div>
        <p className="mb-3 text-[11px] font-black uppercase tracking-widest text-slate-500">Learning progress | time per day</p>
        <Bars bars={s.bars} />
      </div>
    </div>
  );
}

function Students() {
  const [list, setList] = useState(null);
  const [err, setErr] = useState('');
  const [sel, setSel] = useState(null);
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = '/signup?mode=login'; return; }
      const res = await fetch('/api/school/students', { cache: 'no-store', headers: { Authorization: 'Bearer ' + session.access_token } });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Could not load students.');
      setList(json.students);
      setErr('');
    } catch (e) {
      setErr(e.message);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [load]);

  const shown = useMemo(() => {
    const k = q.trim().toLowerCase();
    return (list || []).filter((s) => !k || (s.name + ' ' + s.email + ' ' + (s.class_name || '')).toLowerCase().includes(k));
  }, [list, q]);

  const selected = (list || []).find((s) => s.id === sel) || null;
  const selIndex = selected ? list.indexOf(selected) : 0;

  if (err && !list) return <p className="rounded-2xl border border-bull-line bg-bull-surface p-6 text-center text-sm text-rose-300">{err}</p>;
  if (!list) return <div className="h-64 animate-pulse rounded-2xl border border-bull-line bg-bull-surface" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-white">Students</h2>
          <p className="flex items-center gap-2 text-sm text-slate-400">
            {list.length} registered
            <span className="inline-flex items-center gap-1 text-emerald-300"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />Live</span>
          </p>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, email or class"
          className="w-full rounded-xl border border-bull-line bg-bull-bg px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-bull-lime sm:w-72"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <ul className="max-h-[70vh] space-y-2 overflow-y-auto lg:col-span-2">
          {shown.length === 0 && <li className="rounded-xl border border-dashed border-bull-line px-3 py-8 text-center text-sm text-slate-500">No students found.</li>}
          {shown.map((s) => {
            const i = list.indexOf(s);
            const on = s.id === sel;
            return (
              <li key={s.id}>
                <button
                  onClick={() => setSel(s.id)}
                  className={'flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ' + (on ? 'border-bull-lime bg-bull-lime/10' : 'border-bull-line bg-bull-surface hover:border-bull-lime/50')}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-black text-bull-ink" style={{ background: grad(i) }}>{initials(s.name)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-white">{s.name}</span>
                    <span className="block truncate text-xs text-slate-400">{s.class_name || 'Unassigned'}</span>
                  </span>
                  <span className="text-xs font-bold text-slate-300">{inr(s.net_worth)}</span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="lg:col-span-3">
          {selected ? (
            <Dossier s={selected} index={selIndex} />
          ) : (
            <div className="flex h-full min-h-[240px] items-center justify-center rounded-2xl border-2 border-dashed border-bull-line p-6 text-center text-sm text-slate-500">
              Pick a student to open their file.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StudentsPage() {
  return <SchoolShell active="students">{() => <Students />}</SchoolShell>;
}