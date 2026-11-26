'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAdmin, logAction } from '@/components/admin/AdminProvider';
import { Loading, PageHeader, Panel, SetupNote, inputCls } from '@/components/admin/ui';

const FIELDS = [
  { key: 'quiz_points_per_answer', label: 'BB per correct answer', type: 'number', min: 1, max: 100, def: '1', help: 'Applies to every future quiz run. Past records are not changed.' },
  { key: 'quiz_time_limit_seconds', label: 'Quiz time limit (seconds)', type: 'number', min: 30, max: 3600, def: '300', help: '300 = 5 minutes. Applies to the next quiz someone starts.' },
  { key: 'maintenance_mode', label: 'Maintenance mode', type: 'toggle', def: 'false', help: 'Shows a full-screen notice to everyone except you. Login and /admin stay reachable.' },
  { key: 'maintenance_message', label: 'Maintenance message', type: 'text', def: 'We are upgrading Bull Run. Back shortly!', help: 'Shown on the maintenance screen.' },
];

export default function SettingsPage() {
  const { showToast } = useAdmin();
  const [saved, setSaved] = useState({});
  const [draft, setDraft] = useState({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('app_settings').select('key, value');
    if (error) { setErr(error.message); setLoading(false); return; }
    const map = {};
    FIELDS.forEach((f) => { map[f.key] = f.def; });
    (data || []).forEach((r) => { map[r.key] = r.value; });
    setSaved(map);
    setDraft(map);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const dirty = FIELDS.filter((f) => draft[f.key] !== saved[f.key]);

  const save = async () => {
    for (const f of dirty) {
      if (f.type === 'number') {
        const n = Number(draft[f.key]);
        if (!Number.isFinite(n) || n < f.min || n > f.max) return showToast(`${f.label} must be between ${f.min} and ${f.max}.`, 'error');
      }
      if (f.type === 'text' && !String(draft[f.key]).trim()) return showToast(`${f.label} can't be empty.`, 'error');
    }
    if (dirty.some((f) => f.key === 'maintenance_mode' && draft.maintenance_mode === 'true') && !confirm('Turn ON maintenance mode? Everyone except you will see the maintenance screen.')) return;

    setBusy(true);
    for (const f of dirty) {
      const { error } = await supabase.from('app_settings').upsert({ key: f.key, value: String(draft[f.key]).trim(), updated_at: new Date().toISOString() }, { onConflict: 'key' });
      if (error) { setBusy(false); return showToast(error.message, 'error'); }
      await logAction('settings_update', null, `${f.key}: ${saved[f.key]} -> ${String(draft[f.key]).trim()}`);
    }
    setBusy(false);
    showToast('Settings saved');
    load();
  };

  if (loading) return <Loading text="Loading settings..." />;

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Control quiz rules and maintenance mode without touching code." />
      {err && <SetupNote table="app_settings" message={err} />}

      <Panel title="⚙️ App settings">
        <div className="space-y-5">
          {FIELDS.map((f) => (
            <div key={f.key} className="grid gap-2 border-b border-bull-line pb-5 last:border-0 last:pb-0 md:grid-cols-[260px_1fr] md:items-start">
              <div>
                <p className="text-xs font-black text-white">{f.label}</p>
                <p className="mt-0.5 font-sans text-xs text-slate-500">{f.help}</p>
              </div>
              <div>
                {f.type === 'number' && (
                  <input type="number" min={f.min} max={f.max} value={draft[f.key] ?? ''} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} className={`${inputCls} w-40`} />
                )}
                {f.type === 'text' && (
                  <input type="text" value={draft[f.key] ?? ''} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} className={`${inputCls} w-full`} />
                )}
                {f.type === 'toggle' && (
                  <button
                    onClick={() => setDraft({ ...draft, [f.key]: draft[f.key] === 'true' ? 'false' : 'true' })}
                    className={`cursor-pointer rounded-xl border px-5 py-2.5 text-xs font-black uppercase font-mono ${draft[f.key] === 'true' ? 'border-rose-800 bg-rose-950 text-rose-300' : 'border-emerald-800 bg-emerald-950 text-emerald-300'}`}
                  >
                    {draft[f.key] === 'true' ? '🛠️ ON · site is locked' : '✅ OFF · site is live'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 pt-2">
          <button disabled={busy || dirty.length === 0} onClick={save} className="cursor-pointer rounded-xl bg-bull-lime px-6 py-3 text-xs font-black uppercase tracking-wider text-bull-ink shadow-md hover:bg-bull-lime-light disabled:cursor-not-allowed disabled:opacity-40">Save changes</button>
          {dirty.length > 0 && <button onClick={() => setDraft(saved)} className="cursor-pointer text-xs font-bold text-slate-400 hover:underline">Discard</button>}
          <span className="font-mono text-xs text-slate-500">{dirty.length ? `${dirty.length} unsaved change(s)` : 'All saved'}</span>
        </div>
      </Panel>
    </div>
  );
}