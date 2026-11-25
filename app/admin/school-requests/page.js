/* eslint-disable react/no-unescaped-entities */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { calcSchoolPrice, formatINR } from '@/lib/pricing';
import { Loading, PageHeader, Panel, inputCls } from '@/components/admin/ui';

async function call(method, body) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch('/api/admin/schools', {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (session?.access_token || '') },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Request failed');
  return json;
}

const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-');
const btn = 'cursor-pointer rounded-lg border border-bull-line bg-bull-raised px-3 py-1.5 font-mono text-[11px] font-black uppercase text-slate-200 disabled:opacity-50';

export default function SchoolRequestsPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState({});

  const load = useCallback(async () => {
    try {
      setData(await call('GET'));
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function act(body, confirmText) {
    if (confirmText && !confirm(confirmText)) return;
    setBusy(true);
    setNote('');
    try {
      await call('POST', body);
      setNote('Done.');
      await load();
    } catch (e) {
      setNote('Error: ' + e.message);
    }
    setBusy(false);
  }

  const setD = (id, k, v) => setDraft((d) => ({ ...d, [id]: { ...d[id], [k]: v } }));

  if (!data && !error) return <Loading text="Loading school requests..." />;
  if (error && !data) return <p className="py-20 text-center font-mono text-xs text-rose-400">{error}</p>;

  const pending = data.schools.filter((s) => s.status === 'pending_review');
  const others = data.schools.filter((s) => s.status !== 'pending_review');
  const submitted = data.payments.filter((p) => p.status === 'submitted');
  const nameOf = (id) => data.schools.find((s) => s.id === id)?.name || id;

  return (
    <div className="space-y-6">
      <PageHeader title="School Requests" subtitle="Approve schools, record UPI payments and manage status." />
      {note && <p className="rounded-xl border border-bull-line bg-bull-raised p-3 font-mono text-xs text-slate-200">{note}</p>}

      <Panel title={`Pending review (${pending.length})`}>
        {pending.length === 0 && <p className="py-3 font-mono text-xs text-slate-500">Nothing waiting.</p>}
        <div className="space-y-3">
          {pending.map((s) => {
            const d = draft[s.id] || {};
            const suggested = calcSchoolPrice(s.student_count) || '';
            return (
              <div key={s.id} className="space-y-3 rounded-2xl border border-bull-line bg-bull-raised p-4 text-xs font-bold">
                <div>
                  <p className="text-sm font-black text-white">{s.name}</p>
                  <p className="font-mono font-medium text-slate-400">{s.area}, {s.city} {s.pincode}</p>
                  <p className="font-mono font-medium text-slate-400">{s.admin_name} | {s.admin_email} | {s.admin_phone}</p>
                  <p className="font-mono font-medium text-slate-400">Students: {s.student_count} | Suggested price: {suggested ? formatINR(suggested) : 'custom'}</p>
                  {s.letter_url
                    ? <a href={s.letter_url} target="_blank" rel="noreferrer" className="text-bull-lime hover:underline">View appointment letter (link expires in 1 hour)</a>
                    : <span className="text-rose-400">No letter found</span>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input className={`${inputCls} w-44`} placeholder="School code e.g. DPS-MUM" value={d.code || ''} onChange={(e) => setD(s.id, 'code', e.target.value)} />
                  <input className={`${inputCls} w-32`} placeholder={`Price ${suggested}`} value={d.price ?? ''} onChange={(e) => setD(s.id, 'price', e.target.value)} />
                  <button disabled={busy} className={btn} onClick={() => act({ action: 'approve', school_id: s.id, code: d.code, price: d.price || suggested }, `Approve ${s.name}?`)}>Approve</button>
                  <button disabled={busy} className={btn} onClick={() => { const r = prompt('Reason for rejection:'); if (r) act({ action: 'reject', school_id: s.id, reason: r }); }}>Reject</button>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel title={`Payments awaiting confirmation (${submitted.length})`}>
        {submitted.length === 0 && <p className="py-3 font-mono text-xs text-slate-500">None. Use "Record payment" on a school below when you receive a UPI payment.</p>}
        <div className="space-y-2">
          {submitted.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-bull-line bg-bull-raised p-3 text-xs font-bold">
              <span className="text-white">{nameOf(p.school_id)} | {formatINR(p.amount)} | UTR {p.utr}</span>
              <span className="flex gap-2">
                <button disabled={busy} className={btn} onClick={() => act({ action: 'confirm_payment', payment_id: p.id }, 'Confirm this payment?')}>Confirm</button>
                <button disabled={busy} className={btn} onClick={() => { const r = prompt('Reason (optional):') ?? null; if (r !== null) act({ action: 'reject_payment', payment_id: p.id, reason: r }); }}>Reject</button>
              </span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel
        title={`All other schools (${others.length})`}
        right={<button disabled={busy} className={btn} onClick={() => act({ action: 'run_states' }, 'Run the status check now? Overdue schools will be expired or suspended.')}>Run state check</button>}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-bull-raised font-mono text-[10px] font-black uppercase tracking-wider text-slate-400">
                <th className="p-3">School</th><th className="p-3">Code</th><th className="p-3">Status</th>
                <th className="p-3 text-right">Seats</th><th className="p-3 text-right">Price</th><th className="p-3">Due / Paid until</th><th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody className="font-bold text-slate-300">
              {others.map((s) => (
                <tr key={s.id} className="border-t border-bull-line">
                  <td className="p-3 font-black text-white">{s.name}</td>
                  <td className="p-3 font-mono">{s.code || '-'}</td>
                  <td className="p-3 font-mono">{s.status}</td>
                  <td className="p-3 text-right font-mono">{s.seats}/{s.student_count}</td>
                  <td className="p-3 text-right font-mono">{s.locked_price ? formatINR(s.locked_price) : '-'}</td>
                  <td className="p-3 font-mono">{s.status === 'approved_unpaid' ? fmt(s.payment_due_at) : fmt(s.paid_until)}</td>
                  <td className="space-x-1 p-3">
                    {['approved_unpaid', 'active', 'grace', 'suspended'].includes(s.status) && s.locked_price && (
                      <button disabled={busy} className={btn} onClick={() => { const u = prompt('UPI reference number (UTR):'); if (u) act({ action: 'record_payment', school_id: s.id, utr: u }); }}>Record payment</button>
                    )}
                    {['active', 'grace'].includes(s.status) && (
                      <button disabled={busy} className={btn} onClick={() => act({ action: 'suspend', school_id: s.id, reason: 'manual' }, `Suspend ${s.name}? All its members will be frozen.`)}>Suspend</button>
                    )}
                    {s.status === 'suspended' && (
                      <button disabled={busy} className={btn} onClick={() => act({ action: 'reactivate', school_id: s.id }, `Reactivate ${s.name}?`)}>Reactivate</button>
                    )}
                    {s.status === 'expired' && (
                      <button disabled={busy} className={btn} onClick={() => act({ action: 'restart', school_id: s.id }, `Give ${s.name} another 3 days to pay?`)}>Restart</button>
                    )}
                    {s.status === 'rejected' && <span className="font-mono text-[11px] text-slate-500">{s.rejection_reason}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
