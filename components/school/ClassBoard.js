'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

async function api(method, body) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = '/signup?mode=login';
    throw new Error('Please log in again');
  }
  const res = await fetch('/api/school/classes', {
    method,
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Something went wrong');
  return json;
}

const grad = (i) => {
  const h = (i * 47 + 78) % 360;
  return 'linear-gradient(135deg, hsl(' + h + ' 85% 62%), hsl(' + ((h + 45) % 360) + ' 85% 55%))';
};
const initials = (name) => {
  const tokens = String(name).match(/[A-Za-z]+|\d+/g) || ['?'];
  let out = tokens.map((t) => (/^\d/.test(t) ? t : t[0])).join('');
  if (out.length < 2 && /^[A-Za-z]{2,}$/.test(tokens[0])) out = tokens[0].slice(0, 2);
  return out.slice(0, 4).toUpperCase();
};

const inputCls =
  'w-full rounded-xl border border-bull-line bg-bull-bg px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-bull-lime focus:ring-2 focus:ring-bull-lime/30';

const TONES = {
  green: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
  amber: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
  slate: 'border-bull-line bg-bull-raised text-slate-300',
};

function Chip({ tone = 'slate', children }) {
  return (
    <span className={'inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-bold ' + TONES[tone]}>
      {children}
    </span>
  );
}

function Styles() {
  return (
    <style>{`
      @keyframes cb-rise { from { opacity: 0; transform: translateY(16px) scale(.98); } to { opacity: 1; transform: none; } }
      @keyframes cb-pop { from { opacity: 0; transform: translateY(26px) scale(.96); } to { opacity: 1; transform: none; } }
      @keyframes cb-fade { from { opacity: 0; } to { opacity: 1; } }
      @keyframes cb-toast { from { opacity: 0; transform: translate(-50%, 12px); } to { opacity: 1; transform: translate(-50%, 0); } }
      .cb-rise { animation: cb-rise .5s cubic-bezier(.2,.8,.2,1) backwards; }
      .cb-pop { animation: cb-pop .35s cubic-bezier(.2,.8,.2,1); }
      .cb-fade { animation: cb-fade .25s ease-out; }
      .cb-toast { animation: cb-toast .3s ease-out; }
      @media (prefers-reduced-motion: reduce) {
        .cb-rise, .cb-pop, .cb-fade, .cb-toast { animation: none; }
      }
    `}</style>
  );
}

function Modal({ onClose, tab, children }) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') closeRef.current(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div
      className="cb-fade fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-3 pt-12 backdrop-blur-sm sm:items-center sm:p-6"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="cb-pop relative flex max-h-[88vh] w-full max-w-lg flex-col rounded-2xl border border-bull-line bg-bull-surface shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]">
        {tab && (
          <div className="absolute -top-7 left-6 rounded-t-xl border border-b-0 border-bull-line bg-bull-surface px-4 py-1.5 text-[11px] font-black uppercase tracking-widest text-bull-lime">
            {tab}
          </div>
        )}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-bull-raised hover:text-white"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
        <div className="overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</span>
      {children}
    </label>
  );
}

function NewClassDialog({ onClose, onData }) {
  const [className, setClassName] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [teacherEmail, setTeacherEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const p = await api('POST', {
        action: 'create_class',
        class_name: className,
        teacher_name: teacherName,
        teacher_email: teacherEmail,
      });
      onData(p, true);
    } catch (ex) {
      setErr(ex.message);
      setBusy(false);
    }
  }

  return (
    <Modal onClose={onClose} tab="New class file">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <h3 className="text-xl font-black text-white">Add a class</h3>
          <p className="mt-1 text-sm text-slate-400">Three details and the class is ready. You add its students next.</p>
        </div>
        <Field label="Class name">
          <input autoFocus className={inputCls} placeholder="e.g. Grade 8" value={className} onChange={(e) => setClassName(e.target.value)} maxLength={40} />
        </Field>
        <Field label="Class teacher name">
          <input className={inputCls} placeholder="e.g. Sukhada Patil" value={teacherName} onChange={(e) => setTeacherName(e.target.value)} />
        </Field>
        <Field label="Class teacher email">
          <input type="email" className={inputCls} placeholder="teacher@school.edu" value={teacherEmail} onChange={(e) => setTeacherEmail(e.target.value)} />
        </Field>
        {err && <p className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-300">{err}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-bull-lime px-4 py-3 text-sm font-black text-bull-ink transition hover:brightness-110 active:scale-[.99] disabled:opacity-60"
        >
          {busy ? 'Creating...' : 'Create class'}
        </button>
        <p className="text-center text-xs text-slate-500">When the teacher registers with this email, the class is linked to them automatically.</p>
      </form>
    </Modal>
  );
}

function PersonRow({ name, email, children }) {
  const letter = String(name || email || '?')[0].toUpperCase();
  return (
    <li className="flex items-center gap-3 rounded-xl border border-bull-line bg-bull-bg/60 px-3 py-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bull-raised text-sm font-black text-white">{letter}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-white">{name || email}</span>
        <span className="block truncate text-xs text-slate-400">{email}</span>
      </span>
      {children}
    </li>
  );
}

const TEACHER_CHIP = {
  registered: ['green', 'Registered'],
  pending: ['amber', 'Waiting for approval'],
  invited: ['amber', 'Invited - not registered yet'],
  none: ['slate', 'No teacher yet'],
};

function Dossier({ cls, index, onClose, onData }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [chipTone, chipText] = TEACHER_CHIP[cls.teacher.status] || TEACHER_CHIP.none;

  async function add(e) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const p = await api('POST', { action: 'add_student', class_id: cls.id, name, email });
      onData(p);
      setName('');
      setEmail('');
    } catch (ex) {
      setErr(ex.message);
    }
    setBusy(false);
  }

  async function removeInvite(id) {
    setErr('');
    try {
      onData(await api('POST', { action: 'remove_invite', invite_id: id }));
    } catch (ex) {
      setErr(ex.message);
    }
  }

  return (
    <Modal onClose={onClose} tab="Class file">
      <div className="space-y-5">
        <div className="flex items-center gap-3 pr-8">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-black text-bull-ink" style={{ background: grad(index) }}>
            {initials(cls.class_name)}
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-xl font-black text-white">{cls.class_name}</h3>
            <p className="text-sm text-slate-400">{cls.students.length} registered | {cls.invites.length} invited</p>
          </div>
        </div>

        <div className="rounded-xl border border-bull-line bg-bull-bg/60 p-3">
          <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">Class teacher</p>
          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-white">{cls.teacher.name || 'Not set'}</p>
              <p className="truncate text-xs text-slate-400">{cls.teacher.email}</p>
            </div>
            <Chip tone={chipTone}>{chipText}</Chip>
          </div>
        </div>

        <form onSubmit={add} className="space-y-2.5">
          <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">Add a student</p>
          <div className="grid gap-2.5 sm:grid-cols-2">
            <input className={inputCls} placeholder="Student name" value={name} onChange={(e) => setName(e.target.value)} />
            <input type="email" className={inputCls} placeholder="Student email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-bull-lime px-4 py-2.5 text-sm font-black text-bull-ink transition hover:brightness-110 active:scale-[.99] disabled:opacity-60"
          >
            {busy ? 'Adding...' : '+ Add student'}
          </button>
          {err && <p className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-300">{err}</p>}
        </form>

        <div className="space-y-2">
          <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">Students</p>
          {cls.students.length === 0 && cls.invites.length === 0 && (
            <p className="rounded-xl border border-dashed border-bull-line px-3 py-6 text-center text-sm text-slate-500">No students yet. Add the first one above.</p>
          )}
          <ul className="space-y-2">
            {cls.students.map((s) => (
              <PersonRow key={s.id} name={s.name} email={s.email}>
                <Chip tone="green">Registered</Chip>
              </PersonRow>
            ))}
            {cls.invites.map((i) => (
              <PersonRow key={'i' + i.id} name={i.name} email={i.email}>
                <Chip tone="amber">Not registered yet</Chip>
                <button
                  onClick={() => removeInvite(i.id)}
                  aria-label="Remove invite"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-rose-400/10 hover:text-rose-400"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
                </button>
              </PersonRow>
            ))}
          </ul>
        </div>
      </div>
    </Modal>
  );
}

export default function ClassBoard() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [toast, setToast] = useState('');
  const toastTimer = useRef(null);
  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);
  const [pending, setPending] = useState(null);
  const [moving, setMoving] = useState(false);

  const flash = useCallback((m) => {
    setToast(m);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 3200);
  }, []);

  const load = useCallback(async () => {
    try {
      setData(await api('GET'));
      setErr('');
    } catch (e) {
      setErr(e.message);
    }
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  function apply(payload, openCreated) {
    const { created_id, message, ...rest } = payload;
    setData(rest);
    if (message) flash(message);
    if (openCreated && created_id) {
      setShowNew(false);
      setOpenId(created_id);
    }
  }

  async function assign(studentId, classId) {
    if (!classId) return;
    try {
      apply(await api('POST', { action: 'assign', student_id: studentId, class_id: classId }));
    } catch (e) {
      flash(e.message);
    }
  }

  function askMove(student, cls) {
    if (!student || !cls) return;
    setPending({ student, cls });
  }

  async function confirmMove() {
    if (!pending) return;
    setMoving(true);
    try {
      apply(await api('POST', { action: 'assign', student_id: pending.student.id, class_id: pending.cls.id }));
    } catch (e) {
      flash(e.message);
    }
    setMoving(false);
    setPending(null);
  }

  if (err && !data) {
    return (
      <div className="rounded-2xl border border-bull-line bg-bull-surface p-6 text-center text-sm">
        <p className="text-rose-300">{err}</p>
        <button onClick={load} className="mt-3 rounded-lg border border-bull-line px-4 py-2 font-bold text-slate-300 hover:text-white">Try again</button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[188px] animate-pulse rounded-2xl border border-bull-line bg-bull-surface" />
        ))}
      </div>
    );
  }

  const totalRegistered = data.classes.reduce((n, c) => n + c.students.length, 0);
  const totalInvited = data.classes.reduce((n, c) => n + c.invites.length, 0);
  const openIndex = data.classes.findIndex((c) => String(c.id) === String(openId));
  const openClass = openIndex >= 0 ? data.classes[openIndex] : null;

  return (
    <section className="space-y-5">
      <Styles />
      <div>
        <h2 className="text-lg font-black text-white">Classes</h2>
        <p className="text-sm text-slate-400">
          {data.classes.length} {data.classes.length === 1 ? 'class' : 'classes'} | {totalRegistered} registered | {totalInvited} waiting to register
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.classes.map((c, i) => {
          const total = c.students.length + c.invites.length;
          const pct = total ? Math.round((c.students.length / total) * 100) : 0;
          return (
            <button
              key={c.id}
              onClick={() => setOpenId(c.id)}
              onDragOver={(e) => { if (dragId) { e.preventDefault(); setOverId(c.id); } }}
              onDragLeave={() => setOverId((v) => (String(v) === String(c.id) ? null : v))}
              onDrop={(e) => {
                e.preventDefault();
                const st = data.unassigned.find((s) => String(s.id) === String(dragId));
                setOverId(null);
                setDragId(null);
                askMove(st, c);
              }}
              className="cb-rise group relative overflow-hidden rounded-2xl border border-bull-line bg-bull-surface p-5 text-left transition duration-300 hover:-translate-y-1 hover:border-bull-lime/60 hover:shadow-[0_18px_40px_-18px_rgba(190,242,100,0.35)]"
              style={{ animationDelay: i * 60 + 'ms', ...(overId !== null && String(overId) === String(c.id) ? { borderColor: '#bef264', transform: 'scale(1.03)', boxShadow: '0 0 0 3px rgba(190,242,100,.35)' } : null) }}
            >
              <div className="absolute inset-x-0 top-0 h-1" style={{ background: grad(i) }} />
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-base font-black text-bull-ink" style={{ background: grad(i) }}>
                  {initials(c.class_name)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-lg font-black text-white">{c.class_name}</p>
                  <p className="truncate text-xs text-slate-400">{c.teacher.name || 'No teacher yet'}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Chip tone="green">{c.students.length} registered</Chip>
                {c.invites.length > 0 && <Chip tone="amber">{c.invites.length} invited</Chip>}
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-bull-raised">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: pct + '%', background: grad(i) }} />
              </div>
              <p className="mt-3 text-xs font-bold text-slate-500 transition group-hover:text-bull-lime">Open class file &rarr;</p>
            </button>
          );
        })}

        {data.unassigned.length > 0 && (
          <div
            className="cb-rise relative overflow-hidden rounded-2xl border-2 border-dashed border-amber-400/50 bg-amber-400/5 p-5"
            style={{ animationDelay: data.classes.length * 60 + 'ms' }}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-lg font-black text-white">Unassigned</p>
              <Chip tone="amber">{data.unassigned.length}</Chip>
            </div>
            <p className="mt-1 text-xs text-slate-400">Drag a student onto a class to place them.</p>
            <ul className="mt-3 max-h-52 space-y-2 overflow-y-auto pr-1">
              {data.unassigned.map((s) => (
                <li
                  key={s.id}
                  draggable
                  onDragStart={(e) => {
                    setDragId(s.id);
                    e.dataTransfer.setData('text/plain', String(s.id));
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragEnd={() => { setDragId(null); setOverId(null); }}
                  className="flex cursor-grab items-center gap-2 rounded-xl border border-bull-line bg-bull-bg/70 px-2.5 py-2 active:cursor-grabbing"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bull-raised text-xs font-black text-white">
                    {String(s.name || s.email || '?')[0].toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-white">{s.name || s.email}</span>
                    <span className="block truncate text-[11px] text-slate-400">{s.email}</span>
                  </span>
                  <select
                    value=""
                    onChange={(e) => askMove(s, data.classes.find((x) => String(x.id) === e.target.value))}
                    className="max-w-[92px] rounded-lg border border-bull-line bg-bull-bg px-1.5 py-1 text-[11px] font-bold text-slate-200 outline-none focus:border-bull-lime"
                  >
                    <option value="" disabled>Move to...</option>
                    {data.classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.class_name}</option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
          </div>
        )}

        {data.canCreate !== false && (
        <button
          onClick={() => setShowNew(true)}
          className="cb-rise group flex min-h-[188px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-bull-line bg-bull-surface/40 p-5 text-slate-400 transition duration-300 hover:border-bull-lime hover:bg-bull-lime/5 hover:text-bull-lime"
          style={{ animationDelay: data.classes.length * 60 + 'ms' }}
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full border border-current transition duration-300 group-hover:rotate-90 group-hover:scale-110">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          </span>
          <span className="text-sm font-black">Add class</span>
        </button>
        )}
      </div>

      {pending && (
        <Modal onClose={() => { if (!moving) setPending(null); }} tab="Confirm move">
          <div className="space-y-5">
            <h3 className="pr-8 text-xl font-black text-white">Are you sure?</h3>
            <p className="text-sm text-slate-300">
              Move <strong className="text-white">{pending.student.name || pending.student.email}</strong> into{' '}
              <strong className="text-bull-lime">{pending.cls.class_name}</strong>?
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPending(null)}
                disabled={moving}
                className="rounded-xl border border-bull-line bg-bull-raised px-4 py-3 text-sm font-black text-slate-200 transition hover:text-white disabled:opacity-60"
              >
                No
              </button>
              <button
                type="button"
                onClick={confirmMove}
                disabled={moving}
                className="rounded-xl bg-bull-lime px-4 py-3 text-sm font-black text-bull-ink transition hover:brightness-110 disabled:opacity-60"
              >
                {moving ? 'Moving...' : 'Yes'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showNew && <NewClassDialog onClose={() => setShowNew(false)} onData={apply} />}
      {openClass && <Dossier cls={openClass} index={openIndex} onClose={() => setOpenId(null)} onData={apply} />}

      {toast && (
        <div className="cb-toast fixed bottom-6 left-1/2 z-[110] max-w-[90vw] -translate-x-1/2 rounded-xl border border-bull-lime/40 bg-bull-surface px-4 py-3 text-sm font-bold text-white shadow-2xl">
          {toast}
        </div>
      )}
    </section>
  );
}