'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import SchoolShell from '@/components/school/SchoolShell';
import { supabase } from '@/lib/supabase';
import { inr, hm, worth } from '@/components/school/format';

const when = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-');
const day = (d) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '-');

function Card({ label, value }) {
  return (
    <div className="rounded-2xl border border-bull-line bg-bull-surface p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-black text-white">{value}</p>
    </div>
  );
}

function Section({ title, empty, rows, children }) {
  return (
    <section className="rounded-2xl border border-bull-line bg-bull-surface p-4">
      <h2 className="mb-3 text-base font-black text-white">{title}</h2>
      {rows === 0 ? (
        <p className="text-sm text-slate-500">{empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">{children}</table>
        </div>
      )}
    </section>
  );
}

const th = 'p-2 text-xs font-bold uppercase tracking-wider text-slate-400';

function Detail({ id }) {
  const router = useRouter();
  const [d, setD] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = '/signup?mode=login'; return; }
      const res = await fetch('/api/school/student?id=' + encodeURIComponent(id), {
        headers: { Authorization: 'Bearer ' + session.access_token },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setError(json.error || 'Could not load this student.'); return; }
      setD(json);
    })();
  }, [id]);

  if (error) return <p className="rounded-2xl border border-bull-line bg-bull-surface p-6 text-sm text-slate-300">{error}</p>;
  if (!d) return <p className="py-10 text-center text-sm text-slate-400">Loading student...</p>;

  const s = d.student;
  const week = d.activity.reduce((a, r) => a + Number(r.seconds || 0), 0);

  return (
    <div className="space-y-6">
      <button onClick={() => router.back()} className="rounded-lg border border-bull-line bg-bull-raised px-4 py-2 text-sm font-bold text-slate-300 hover:text-white">
        Back
      </button>
      <div>
        <h2 className="text-xl font-black text-white">{s.name || 'Unnamed'}</h2>
        <p className="font-mono text-sm text-slate-400">{s.email} | {s.class_name || 'No class'} | {s.is_frozen ? 'Frozen' : 'Active'}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card label="Net worth" value={inr(worth(s))} />
        <Card label="Cash" value={inr(s.wallet_balance)} />
        <Card label="Quiz points" value={Number(s.quiz_points || 0).toLocaleString('en-IN')} />
        <Card label="Last 14 days" value={hm(week)} />
      </div>

      <Section title={'Holdings (' + d.holdings.length + ')'} empty="No holdings." rows={d.holdings.length}>
        <thead><tr><th className={th}>Symbol</th><th className={th + ' text-right'}>Shares</th><th className={th + ' text-right'}>Avg price</th><th className={th + ' text-right'}>Cost</th></tr></thead>
        <tbody className="divide-y divide-bull-line">
          {d.holdings.map((h) => (
            <tr key={h.sym}>
              <td className="p-2 font-bold text-white">{h.sym}</td>
              <td className="p-2 text-right font-mono">{Number(h.shares)}</td>
              <td className="p-2 text-right font-mono">{inr(h.avg_price)}</td>
              <td className="p-2 text-right font-mono">{inr(Number(h.shares) * Number(h.avg_price))}</td>
            </tr>
          ))}
        </tbody>
      </Section>

      <Section title={'Recent trades (' + d.trades.length + ')'} empty="No trades yet." rows={d.trades.length}>
        <thead><tr><th className={th}>When</th><th className={th}>Symbol</th><th className={th}>Side</th><th className={th + ' text-right'}>Qty</th><th className={th + ' text-right'}>Price</th><th className={th + ' text-right'}>Fees</th></tr></thead>
        <tbody className="divide-y divide-bull-line">
          {d.trades.map((t) => (
            <tr key={t.id}>
              <td className="p-2 text-slate-400">{when(t.created_at)}</td>
              <td className="p-2 font-bold text-white">{t.sym}</td>
              <td className={'p-2 font-bold ' + (String(t.side).toLowerCase() === 'buy' ? 'text-emerald-400' : 'text-rose-400')}>{t.side}</td>
              <td className="p-2 text-right font-mono">{Number(t.qty)}</td>
              <td className="p-2 text-right font-mono">{inr(t.price)}</td>
              <td className="p-2 text-right font-mono">{inr(t.fees_total)}</td>
            </tr>
          ))}
        </tbody>
      </Section>

      <Section title={'Quiz history (' + d.quizzes.length + ')'} empty="No quizzes taken." rows={d.quizzes.length}>
        <thead><tr><th className={th}>Date</th><th className={th + ' text-right'}>Score</th><th className={th + ' text-right'}>Points</th><th className={th + ' text-right'}>Time</th></tr></thead>
        <tbody className="divide-y divide-bull-line">
          {d.quizzes.map((q) => (
            <tr key={q.id}>
              <td className="p-2">{day(q.quiz_date)}</td>
              <td className="p-2 text-right font-mono">{q.score} / {q.total}</td>
              <td className="p-2 text-right font-mono">{q.points}</td>
              <td className="p-2 text-right font-mono">{hm(Number(q.time_spent || 0))}</td>
            </tr>
          ))}
        </tbody>
      </Section>

      <Section title={'Open and past orders (' + d.orders.length + ')'} empty="No pending orders." rows={d.orders.length}>
        <thead><tr><th className={th}>Created</th><th className={th}>Symbol</th><th className={th}>Type</th><th className={th + ' text-right'}>Qty</th><th className={th + ' text-right'}>Trigger</th><th className={th}>Status</th></tr></thead>
        <tbody className="divide-y divide-bull-line">
          {d.orders.map((o) => (
            <tr key={o.id}>
              <td className="p-2 text-slate-400">{when(o.created_at)}</td>
              <td className="p-2 font-bold text-white">{o.sym}</td>
              <td className="p-2">{o.kind}</td>
              <td className="p-2 text-right font-mono">{Number(o.qty)}</td>
              <td className="p-2 text-right font-mono">{inr(o.trigger_price)}</td>
              <td className="p-2">{o.status}</td>
            </tr>
          ))}
        </tbody>
      </Section>

      <Section title="Activity (last 14 days)" empty="No activity." rows={d.activity.length}>
        <thead><tr><th className={th}>Day</th><th className={th + ' text-right'}>Time</th><th className={th}>Last seen</th></tr></thead>
        <tbody className="divide-y divide-bull-line">
          {d.activity.map((r) => (
            <tr key={r.day}>
              <td className="p-2">{day(r.day)}</td>
              <td className="p-2 text-right font-mono">{hm(Number(r.seconds || 0))}</td>
              <td className="p-2 text-slate-400">{when(r.last_seen)}</td>
            </tr>
          ))}
        </tbody>
      </Section>
    </div>
  );
}

export default function StudentDetailPage() {
  const { id } = useParams();
  return <SchoolShell active="student">{() => <Detail id={id} />}</SchoolShell>;
}
