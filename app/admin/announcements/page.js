'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAdmin, logAction } from '@/components/admin/AdminProvider';
import { Loading, PageHeader, Panel, SetupNote, pill, inputCls } from '@/components/admin/ui';

const LEVEL_TONE = { info: 'text-sky-300', warning: 'text-amber-300', success: 'text-emerald-400' };

export default function AnnouncementsPage() {
  const { allProfiles, showToast } = useAdmin();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [message, setMessage] = useState('');
  const [level, setLevel] = useState('info');
  const [audience, setAudience] = useState('all');
  const [target, setTarget] = useState('');
  const [hours, setHours] = useState('');
  const [busy, setBusy] = useState(false);

  const schools = useMemo(() => Array.from(new Set(allProfiles.map((p) => p.school_id || p.school_code).filter(Boolean))).sort(), [allProfiles]);
  const classes = useMemo(() => Array.from(new Set(allProfiles.map((p) => p.specific_class_id).filter(Boolean))).sort(), [allProfiles]);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(100);
    if (error) setErr(error.message); else { setErr(''); setRows(data || []); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const create = async () => {
    const msg = message.trim();
    if (!msg) return showToast('Write a message first.', 'error');
    if (audience !== 'all' && !target.trim()) return showToast(`Pick a ${audience} to target.`, 'error');
    const h = parseFloat(hours);
    const expires_at = hours && h > 0 ? new Date(Date.now() + h * 3600 * 1000).toISOString() : null;
    setBusy(true);
    const { error } = await supabase.from('announcements').insert({ message: msg, level, audience, target: audience === 'all' ? null : target.trim(), active: true, expires_at });
    setBusy(false);
    if (error) return showToast(error.message, 'error');
    await logAction('announcement_create', null, `[${audience}${target ? ': ' + target.trim() : ''}] ${msg.slice(0, 80)}`);
    showToast('Announcement published');
    setMessage(''); setTarget(''); setHours('');
    load();
  };

  const toggle = async (r) => {
    const { error } = await supabase.from('announcements').update({ active: !r.active }).eq('id', r.id);
    if (error) return showToast(error.message, 'error');
    await logAction('announcement_toggle', null, `#${r.id} ${r.active ? 'turned off' : 'turned on'}`);
    load();
  };

  const remove = async (r) => {
    if (!confirm('Delete this announcement permanently?')) return;
    const { error } = await supabase.from('announcements').delete().eq('id', r.id);
    if (error) return showToast(error.message, 'error');
    await logAction('announcement_delete', null, `#${r.id} ${r.message.slice(0, 60)}`);
    load();
  };

  const status = (r) => {
    if (!r.active) return ['OFF', 'text-slate-500'];
    if (r.expires_at && new Date(r.expires_at) <= new Date()) return ['EXPIRED', 'text-rose-400'];
    return ['LIVE', 'text-emerald-400'];
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Announcements" subtitle="Show a banner to everyone, one school, or one class. Users can dismiss it." />

      {err && <SetupNote table="announcements" message={err} />}

      <Panel title="📢 New announcement">
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} maxLength={300} placeholder="e.g. New quiz questions drop at 9 AM tomorrow!" className={`${inputCls} w-full resize-none`} />
        <p className="text-right font-mono text-xs text-slate-500">{message.length}/300</p>
        <div className="grid gap-3 md:grid-cols-4">
          <select value={level} onChange={(e) => setLevel(e.target.value)} className={inputCls}>
            <option value="info">ℹ️ Info (blue)</option>
            <option value="warning">⚠️ Warning (amber)</option>
            <option value="success">✅ Good news (green)</option>
          </select>
          <select value={audience} onChange={(e) => { setAudience(e.target.value); setTarget(''); }} className={inputCls}>
            <option value="all">Everyone</option>
            <option value="school">One school</option>
            <option value="class">One class</option>
          </select>
          <input
            list={audience === 'school' ? 'ann-schools' : 'ann-classes'}
            disabled={audience === 'all'}
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder={audience === 'all' ? 'No target needed' : audience === 'school' ? 'School code' : 'Class ID'}
            className={`${inputCls} disabled:opacity-40`}
          />
          <input type="number" min="0" step="1" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="Hours to show (blank = until off)" className={inputCls} />
        </div>
        <datalist id="ann-schools">{schools.map((s) => <option key={s} value={s} />)}</datalist>
        <datalist id="ann-classes">{classes.map((s) => <option key={s} value={s} />)}</datalist>
        <button disabled={busy} onClick={create} className="cursor-pointer rounded-xl bg-bull-lime px-6 py-3 text-xs font-black uppercase tracking-wider text-bull-ink shadow-md hover:bg-bull-lime-light disabled:opacity-50">Publish</button>
      </Panel>

      <Panel title={`History (${rows.length})`} right={<button onClick={load} className={pill(false)}>↻</button>}>
        {loading ? <Loading /> : rows.length === 0 ? (
          <p className="font-mono text-xs text-slate-500">No announcements yet.</p>
        ) : (
          <div className="divide-y divide-bull-line overflow-hidden rounded-2xl border border-bull-line">
            {rows.map((r) => {
              const [st, tone] = status(r);
              return (
                <div key={r.id} className="flex flex-col items-start justify-between gap-3 bg-bull-raised/50 px-4 py-3 text-xs md:flex-row md:items-center">
                  <div className="min-w-0">
                    <p className={`font-bold ${LEVEL_TONE[r.level] || 'text-white'}`}>{r.message}</p>
                    <p className="mt-1 font-mono text-xs text-slate-500">
                      {r.audience === 'all' ? 'Everyone' : `${r.audience}: ${r.target}`} · {new Date(r.created_at).toLocaleString('en-IN')}
                      {r.expires_at ? ` · until ${new Date(r.expires_at).toLocaleString('en-IN')}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className={`text-xs font-black ${tone}`}>{st}</span>
                    <button onClick={() => toggle(r)} className="cursor-pointer rounded-lg border border-bull-line bg-bull-surface px-3 py-1.5 text-xs font-black uppercase text-slate-300">{r.active ? 'Turn off' : 'Turn on'}</button>
                    <button onClick={() => remove(r)} className="cursor-pointer rounded-lg border border-rose-900 bg-rose-950 px-3 py-1.5 text-xs font-black uppercase text-rose-400">Delete</button>
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