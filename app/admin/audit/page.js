'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Loading, PageHeader, Panel, SetupNote, pill, inputCls } from '@/components/admin/ui';

const LABELS = {
  grant_days: ['Granted access', 'text-emerald-400'],
  bulk_grant: ['Bulk grant', 'text-emerald-400'],
  freeze: ['Froze account', 'text-rose-400'],
  unfreeze: ['Unfroze account', 'text-emerald-400'],
  bulk_freeze: ['Bulk freeze', 'text-rose-400'],
  delete_user: ['Deleted user', 'text-rose-500'],
  teacher_approved: ['Approved teacher', 'text-emerald-400'],
  teacher_rejected: ['Rejected teacher', 'text-rose-400'],
  quiz_reset: ['Reset quiz', 'text-amber-300'],
  quiz_adjust: ['Adjusted BB', 'text-amber-300'],
  announcement_create: ['New announcement', 'text-sky-300'],
  announcement_toggle: ['Toggled announcement', 'text-sky-300'],
  announcement_delete: ['Deleted announcement', 'text-rose-400'],
  settings_update: ['Changed setting', 'text-bull-lime'],
};
const csvCell = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';

export default function AuditPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [action, setAction] = useState('ALL');

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('admin_logs').select('*').order('created_at', { ascending: false }).limit(300);
    if (error) setErr(error.message); else { setErr(''); setRows(data || []); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const actions = useMemo(() => Array.from(new Set(rows.map((r) => r.action))).sort(), [rows]);
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows.filter((r) => (action === 'ALL' || r.action === action) &&
      (!t || (r.target_label || '').toLowerCase().includes(t) || (r.details || '').toLowerCase().includes(t) || (r.admin_email || '').toLowerCase().includes(t)));
  }, [rows, q, action]);

  const exportCsv = () => {
    const head = ['Time', 'Admin', 'Action', 'Target', 'Details'];
    const lines = shown.map((r) => [r.created_at, r.admin_email, r.action, r.target_label, r.details].map(csvCell).join(','));
    const blob = new Blob([[head.map(csvCell).join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bullrun-audit-log.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Audit Log" subtitle="Every admin action, newest first (last 300).">
        <div className="flex gap-2">
          <button onClick={load} className={pill(false)}>↻ Refresh</button>
          <button onClick={exportCsv} className={pill(false)}>⬇ CSV</button>
        </div>
      </PageHeader>

      {err && <SetupNote table="admin_logs" message={err} />}

      <Panel>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 Search target, details, admin..." className={`${inputCls} sm:w-72`} />
          <select value={action} onChange={(e) => setAction(e.target.value)} className={inputCls}>
            <option value="ALL">All actions</option>
            {actions.map((a) => <option key={a} value={a}>{(LABELS[a] || [a])[0]}</option>)}
          </select>
        </div>

        {loading ? <Loading /> : shown.length === 0 ? (
          <p className="py-4 font-mono text-xs text-slate-500">{rows.length === 0 ? 'No actions logged yet. They appear here as you use the panel.' : 'Nothing matches.'}</p>
        ) : (
          <div className="divide-y divide-bull-line overflow-hidden rounded-2xl border border-bull-line">
            {shown.map((r) => {
              const [label, tone] = LABELS[r.action] || [r.action, 'text-slate-300'];
              return (
                <div key={r.id} className="grid gap-1 bg-bull-raised/50 px-4 py-3 text-xs md:grid-cols-[170px_150px_1fr] md:items-center md:gap-4">
                  <span className="font-mono text-xs text-slate-400">{new Date(r.created_at).toLocaleString('en-IN')}</span>
                  <span className={`font-black ${tone}`}>{label}</span>
                  <span className="min-w-0 truncate font-bold text-white">
                    {r.target_label || '—'}
                    {r.details && <span className="ml-2 font-mono font-medium text-slate-400">{r.details}</span>}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}