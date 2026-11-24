'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAdmin, logAction } from '@/components/admin/AdminProvider';
import { localDayKey, SUPER_ADMIN_EMAIL } from '@/lib/admin';
import { Loading, PageHeader, Panel, Kpi, SetupNote, inputCls } from '@/components/admin/ui';

const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

export default function QuizArenaPage() {
  const { loading, allProfiles, showToast, refresh } = useAdmin();
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState('');
  const [selId, setSelId] = useState(null);
  const [delta, setDelta] = useState('');
  const today = localDayKey();

  const load = useCallback(async () => {
    const from = new Date();
    from.setDate(from.getDate() - 13);
    const { data, error } = await supabase
      .from('quiz_history')
      .select('user_id, quiz_date, score, total, points, time_spent')
      .gte('quiz_date', localDayKey(from))
      .order('quiz_date', { ascending: true });
    if (error) { setErr(error.message); return; }
    setErr('');
    setRows(data || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    const t = rows.filter((r) => r.quiz_date === today);
    const avgAcc = t.length ? Math.round((t.reduce((a, r) => a + r.score / (r.total || 15), 0) / t.length) * 100) : 0;
    const perfect = t.filter((r) => r.score === r.total).length;
    const avgTime = t.length ? Math.round(t.reduce((a, r) => a + (r.time_spent || 0), 0) / t.length) : 0;
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = localDayKey(d);
      days.push({ key, label: d.toLocaleDateString('en-IN', { weekday: 'narrow' }), day: d.getDate(), count: rows.filter((r) => r.quiz_date === key).length });
    }
    const dist = Array.from({ length: 16 }, (_, i) => ({ score: i, count: 0 }));
    rows.forEach((r) => { dist[Math.min(15, Math.max(0, r.score || 0))].count += 1; });
    return { played: t.length, avgAcc, perfect, avgTime, days, dist };
  }, [rows, today]);

  const totalBB = useMemo(() => allProfiles.reduce((a, p) => a + (Number(p.quiz_points) || 0), 0), [allProfiles]);
  const board = useMemo(
    () => [...allProfiles].filter((p) => (p.quiz_points || 0) > 0).sort((a, b) => (b.quiz_points || 0) - (a.quiz_points || 0)).slice(0, 10),
    [allProfiles]
  );
  const matches = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (t.length < 2) return [];
    return allProfiles.filter((p) => (p.name || '').toLowerCase().includes(t) || (p.email || '').toLowerCase().includes(t)).slice(0, 6);
  }, [q, allProfiles]);

  const sel = allProfiles.find((p) => p.id === selId) || null;
  const selRec = sel ? rows.find((r) => r.user_id === sel.id && r.quiz_date === today) : null;

  const resetToday = async () => {
    if (!sel) return;
    if (sel.email === SUPER_ADMIN_EMAIL) return showToast('Super Admin is immune.', 'error');
    if (!confirm(`Reset today's quiz for ${sel.name || sel.email}? Their attempt is deleted${selRec ? ` and ${selRec.points} BB is taken back` : ''}.`)) return;
    setBusy(true);
    const newPts = Math.max(0, (sel.quiz_points || 0) - (selRec ? selRec.points : 0));
    const { data, error } = await supabase.from('profiles').update({ last_quiz_date: null, quiz_points: newPts }).eq('id', sel.id).select('id');
    if (error || !data || data.length === 0) {
      setBusy(false);
      return showToast(error ? error.message : 'No row updated. Check admin RLS policy.', 'error');
    }
    if (selRec) await supabase.from('quiz_history').delete().eq('user_id', sel.id).eq('quiz_date', today);
    await logAction('quiz_reset', sel, selRec ? `removed ${selRec.score}/${selRec.total}, -${selRec.points} BB` : 'cleared attempt flag');
    showToast('Daily attempt reset. They can play again.');
    await Promise.all([refresh(), load()]);
    setBusy(false);
  };

  const adjustBB = async () => {
    if (!sel) return;
    const n = parseInt(delta, 10);
    if (isNaN(n) || n === 0) return showToast('Enter a number like 5 or -3.', 'error');
    const next = Math.max(0, (sel.quiz_points || 0) + n);
    if (!confirm(`Change ${sel.name || sel.email} from ${sel.quiz_points || 0} BB to ${next} BB?`)) return;
    setBusy(true);
    const { data, error } = await supabase.from('profiles').update({ quiz_points: next }).eq('id', sel.id).select('id');
    if (error || !data || data.length === 0) {
      setBusy(false);
      return showToast(error ? error.message : 'No row updated. Check admin RLS policy.', 'error');
    }
    await logAction('quiz_adjust', sel, `${sel.quiz_points || 0} -> ${next} BB (${n > 0 ? '+' : ''}${n})`);
    showToast(`Balance is now ${next} BB`);
    setDelta('');
    await refresh();
    setBusy(false);
  };

  if (loading) return <Loading text="Loading quiz arena..." />;

  const maxDay = Math.max(1, ...stats.days.map((d) => d.count));
  const maxDist = Math.max(1, ...stats.dist.map((d) => d.count));

  return (
    <div className="space-y-6">
      <PageHeader title="Quiz Arena" subtitle="Participation, score spread, standings, and tools to fix a player's attempt or balance." />

      {err && <SetupNote table="quiz_history" message={err} />}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Played Today" value={stats.played} tone="text-bull-lime" sub={`${stats.perfect} perfect score(s)`} />
        <Kpi label="Avg Accuracy Today" value={`${stats.avgAcc}%`} tone="text-emerald-400" />
        <Kpi label="Avg Time Today" value={stats.played ? mmss(stats.avgTime) : '--'} tone="text-sky-300" />
        <Kpi label="Total BB In Circulation" value={totalBB} tone="text-amber-300" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Quizzes per day · last 14 days">
          <div className="flex h-40 items-end justify-between gap-1.5">
            {stats.days.map((d) => (
              <div key={d.key} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <span className="font-mono text-[9px] font-black text-slate-300">{d.count}</span>
                <div className="flex w-full flex-1 items-end overflow-hidden rounded-t bg-bull-raised/60">
                  <div className="w-full rounded-t" style={{ height: `${d.count ? Math.max(6, (d.count / maxDay) * 100) : 0}%`, background: 'linear-gradient(to top,#65a30d,#bef264)' }} />
                </div>
                <span className={`text-[9px] font-black uppercase ${d.key === today ? 'text-bull-lime' : 'text-slate-500'}`}>{d.label}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Score distribution · last 14 days">
          <div className="flex h-40 items-end justify-between gap-1">
            {stats.dist.map((d) => (
              <div key={d.score} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <span className="font-mono text-[9px] font-black text-slate-300">{d.count || ''}</span>
                <div className="flex w-full flex-1 items-end overflow-hidden rounded-t bg-bull-raised/60">
                  <div className="w-full rounded-t" style={{ height: `${d.count ? Math.max(6, (d.count / maxDist) * 100) : 0}%`, background: d.score >= 10 ? 'linear-gradient(to top,#65a30d,#bef264)' : d.score >= 6 ? 'linear-gradient(to top,#d97706,#fcd34d)' : 'linear-gradient(to top,#be123c,#fda4af)' }} />
                </div>
                <span className="font-mono text-[9px] font-black text-slate-500">{d.score}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="🏆 Top 10 by BB">
          {board.length === 0 ? (
            <p className="font-mono text-xs text-slate-500">No BB earned yet.</p>
          ) : (
            <div className="divide-y divide-bull-line">
              {board.map((p, i) => (
                <div key={p.id} className="flex items-center justify-between py-2.5 text-xs">
                  <span className="truncate font-bold text-white"><span className="mr-2 font-mono text-bull-lime">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</span>{p.name || p.email}</span>
                  <span className="font-mono font-black text-bull-lime">{p.quiz_points} BB</span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="🛠️ Player tools">
          <input value={q} onChange={(e) => { setQ(e.target.value); setSelId(null); }} placeholder="Search a player (2+ letters)..." className={`${inputCls} w-full`} />
          {matches.length > 0 && !sel && (
            <div className="divide-y divide-bull-line overflow-hidden rounded-xl border border-bull-line">
              {matches.map((p) => (
                <button key={p.id} onClick={() => { setSelId(p.id); setQ(p.name || p.email); }} className="block w-full cursor-pointer bg-bull-raised/50 px-3 py-2 text-left text-xs font-bold text-white hover:bg-bull-raised">
                  {p.name || 'Unnamed'} <span className="font-mono font-medium text-slate-400">{p.email}</span>
                </button>
              ))}
            </div>
          )}
          {sel && (
            <div className="space-y-3 rounded-2xl border border-bull-line bg-bull-raised p-4 text-xs">
              <p className="font-black text-white">{sel.name || sel.email}</p>
              <p className="font-mono text-slate-400">Balance: <span className="font-black text-bull-lime">{sel.quiz_points || 0} BB</span> · Last quiz: {sel.last_quiz_date || 'never'}</p>
              <p className="font-mono text-slate-400">Today: {selRec ? `${selRec.score}/${selRec.total} · ${selRec.points} BB · ${mmss(selRec.time_spent || 0)}` : 'not played'}</p>
              <div className="flex flex-wrap gap-2 font-mono">
                <button disabled={busy} onClick={resetToday} className="cursor-pointer rounded-lg border border-rose-900 bg-rose-950 px-3 py-1.5 text-[11px] font-black uppercase text-rose-400 disabled:opacity-50">Reset today</button>
                <input type="number" value={delta} onChange={(e) => setDelta(e.target.value)} placeholder="+5 / -3" className="w-24 rounded-lg border border-bull-line bg-bull-surface px-2 py-1.5 text-center text-white focus:outline-none" />
                <button disabled={busy} onClick={adjustBB} className="cursor-pointer rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-black uppercase text-white disabled:opacity-50">Adjust BB</button>
              </div>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}