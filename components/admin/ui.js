'use client';

export const pill = (on) =>
  `cursor-pointer rounded-xl border px-3.5 py-1.5 text-xs font-black uppercase font-mono ${
    on ? 'border-bull-lime-dark bg-bull-lime text-bull-ink' : 'border-bull-line bg-bull-raised text-slate-300 hover:border-bull-lime/50'
  }`;

export const inputCls =
  'rounded-xl border border-bull-line bg-bull-raised px-4 py-2.5 text-xs font-bold text-white font-mono focus:border-bull-lime focus:outline-none';

export function Loading({ text = 'Loading...' }) {
  return <p className="py-20 text-center text-xs font-bold text-slate-400 animate-pulse font-mono">{text}</p>;
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="flex flex-col gap-3 border-b border-bull-line pb-4 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-white">{title}</h1>
        {subtitle && <p className="mt-1 text-xs font-medium text-slate-400">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function Panel({ title, right, children, className = '' }) {
  return (
    <div className={`space-y-4 rounded-3xl border-2 border-bull-line bg-bull-surface p-6 shadow-2xl ${className}`}>
      {(title || right) && (
        <div className="flex items-center justify-between gap-3 border-b border-bull-line pb-3">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-300 font-mono">{title}</h2>
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

export function Kpi({ label, value, sub, tone = 'text-white' }) {
  return (
    <div className="rounded-2xl border-2 border-bull-line bg-bull-surface p-4 shadow-xl">
      <p className="text-xs font-black uppercase tracking-wider text-slate-400 font-mono">{label}</p>
      <p className={`mt-1 font-mono text-3xl font-black ${tone}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs font-mono text-slate-500">{sub}</p>}
    </div>
  );
}

export function SetupNote({ table, message }) {
  return (
    <div className="rounded-2xl border border-amber-700/60 bg-amber-950/40 p-4 text-xs font-bold text-amber-300">
      The <span className="font-mono">{table}</span> table is not ready: {message}. Run the SQL setup block in the Supabase SQL Editor, then refresh.
    </div>
  );
}