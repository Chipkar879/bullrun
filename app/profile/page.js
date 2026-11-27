'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { supabase } from '@/lib/supabase';
import { AVATARS, BADGES, LEVELS, RARITY, BB_TO_CASH, MIN_BB, avatarById } from '@/lib/gamification';

const inr = (n) => '\u20B9' + Math.round(Number(n) || 0).toLocaleString('en-IN');
const announceAvatar = (id) => window.dispatchEvent(new CustomEvent('bullrun-avatar', { detail: id }));

function Avatar({ id, size = 'h-24 w-24', text = 'text-5xl' }) {
  const a = avatarById(id);
  return (
    <div
      className={size + ' ' + text + ' rounded-3xl grid place-items-center shadow-lg select-none'}
      style={{ background: 'linear-gradient(135deg, ' + a.from + ', ' + a.to + ')' }}
      role="img"
      aria-label={a.name}
    >
      {a.emoji}
    </div>
  );
}

function BadgeTile({ b, got }) {
  const r = RARITY[b.rarity] || RARITY.common;
  return (
    <div
      className={'rounded-2xl border p-3 text-center transition-transform ' + (got ? 'hover:-translate-y-1' : 'border-bull-line bg-bull-bg')}
      style={got ? { borderColor: r.color, background: 'linear-gradient(160deg, ' + b.c[0] + '26, ' + b.c[1] + '40)', boxShadow: '0 0 20px ' + b.c[1] + '55' } : undefined}
    >
      <div
        className={'mx-auto h-16 w-16 rounded-full grid place-items-center text-3xl ' + (got ? 'badge-pop' : 'bg-bull-raised border border-bull-line')}
        style={got ? { background: 'linear-gradient(135deg, ' + b.c[0] + ', ' + b.c[1] + ')', boxShadow: '0 0 0 3px ' + r.color + ', 0 6px 16px ' + b.c[1] + '99' } : undefined}
        aria-hidden="true"
      >
        <span className={got ? '' : 'grayscale opacity-40'}>{got ? b.icon : '\u{1F512}'}</span>
      </div>
      <p className={'text-sm font-black mt-2 ' + (got ? 'text-white' : 'text-slate-400')}>{b.name}</p>
      <span
        className="inline-block mt-1 rounded-full px-2 py-0.5 text-xs font-black"
        style={{ color: got ? '#0B1220' : r.color, background: got ? r.color : 'transparent', border: got ? 'none' : '1px solid ' + r.color + '66' }}
      >
        {r.label}
      </span>
      <p className="text-xs text-slate-400 mt-1">{got ? 'Earned' : b.hint}</p>
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState(null);
  const [data, setData] = useState(null);
  const [rank, setRank] = useState(null);
  const [toast, setToast] = useState('');
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [status, setStatus] = useState({ message: '', ok: false, busy: false });
  const [picker, setPicker] = useState(false);
  const [bbInput, setBbInput] = useState('');
  const [conv, setConv] = useState({ message: '', ok: false, busy: false });

  const api = useCallback(async (url, body) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (session?.access_token || '') },
      body: JSON.stringify(body || {}),
    });
    const out = await res.json().catch(() => ({}));
    return { ok: res.ok, out };
  }, []);

  const loadAll = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { router.push('/signup?mode=login'); return; }
    const { data: p } = await supabase
      .from('profiles')
      .select('name, created_at, quiz_points, role, wallet_balance, net_worth, avatar')
      .eq('id', session.user.id)
      .maybeSingle();
    const staff = p?.role === 'school_admin' || p?.role === 'teacher';
    const next = {
      name: p?.name || 'Bull Run trader',
      email: session.user.email,
      joined: new Date(p?.created_at || session.user.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }),
      role: p?.role || 'student',
      staff,
      bb: Number(p?.quiz_points || 0),
      cash: Number(p?.wallet_balance || 0),
      netWorth: Number(p?.net_worth || 0),
      avatar: p?.avatar || 'calf',
    };
    setMe(next);
    setEditName(next.name);
    if (!staff) {
      const { ok, out } = await api('/api/badges');
      if (ok) {
        setData(out);
        if (out.newlyEarned && out.newlyEarned.length) {
          setToast('New badge: ' + out.newlyEarned.map((id) => BADGES.find((x) => x.id === id)?.name).filter(Boolean).join(', '));
        }
      }
      const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', next.role).gt('net_worth', next.netWorth);
      setRank((count || 0) + 1);
    }
  }, [api, router]);

  useEffect(() => {
    loadAll().catch((e) => console.error('Profile load error', e)).finally(() => setLoading(false));
  }, [loadAll]);

  const saveName = async (e) => {
    e.preventDefault();
    if (!editName.trim()) return;
    setStatus({ message: '', ok: false, busy: true });
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.from('profiles').update({ name: editName.trim() }).eq('id', session.user.id);
    if (error) { setStatus({ message: error.message, ok: false, busy: false }); return; }
    setMe((m) => ({ ...m, name: editName.trim() }));
    setStatus({ message: 'Name updated.', ok: true, busy: false });
    setTimeout(() => { setEditing(false); setStatus({ message: '', ok: false, busy: false }); }, 1200);
  };

  // Instant switch: update the screen and the header first, save in the background, roll back if refused
  const chooseAvatar = async (id) => {
    const prev = me.avatar;
    if (id === prev) { setPicker(false); return; }
    setMe((m) => ({ ...m, avatar: id }));
    announceAvatar(id);
    setPicker(false);
    const { ok, out } = await api('/api/badges', { action: 'avatar', id });
    if (!ok) {
      setMe((m) => ({ ...m, avatar: prev }));
      announceAvatar(prev);
      setToast(out.error || 'Could not change avatar');
    }
  };

  const convert = async () => {
    const bb = Math.floor(Number(bbInput));
    setConv({ message: '', ok: false, busy: true });
    const { ok, out } = await api('/api/convert-bb', { bb });
    if (!ok) { setConv({ message: out.error || 'Conversion failed', ok: false, busy: false }); return; }
    setConv({ message: 'Converted ' + out.bb_spent + ' BB into ' + inr(out.cash_added) + ' of practice cash.', ok: true, busy: false });
    setBbInput('');
    await loadAll();
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      window.localStorage.clear();
      window.sessionStorage.clear();
    } catch (err) {
      console.error('Sign out error', err);
    } finally {
      window.location.href = '/signup';
    }
  };

  if (loading || !me) {
    return (
      <main className="min-h-screen bg-bull-bg text-slate-100 antialiased font-sans">
        <Navbar />
        <div className="max-w-5xl mx-auto px-6 pt-32 pb-24 flex justify-center">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 border-4 border-bull-lime border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-slate-400 text-sm">Loading your profile...</p>
          </div>
        </div>
      </main>
    );
  }

  const lvl = data ? data.level : null;
  const earnedCount = data ? data.badges.filter((x) => x.earned).length : 0;
  const bbNum = Math.floor(Number(bbInput)) || 0;
  const capLeft = data ? Math.max(0, data.bb.cap - data.bb.used30) : 0;
  const card = 'bg-bull-surface border border-bull-line rounded-3xl';

  return (
    <main className="min-h-screen bg-bull-bg text-slate-100 antialiased font-sans relative max-w-full overflow-x-hidden pt-24 pb-20">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-5 animate-fadeInFast">

        {toast && (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-bull-lime/50 bg-bull-raised px-4 py-3 text-sm font-bold text-white" role="status">
            <span>{toast}</span>
            <button onClick={() => setToast('')} className="text-xs text-slate-400 hover:text-white" aria-label="Dismiss">Close</button>
          </div>
        )}

        {/* Header */}
        <section className={card + ' p-6 sm:p-8 relative overflow-hidden'}>
          <div className="absolute -top-20 -right-16 w-64 h-64 rounded-full bg-bull-lime/15 blur-3xl pointer-events-none" />
          <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="relative self-center sm:self-auto">
              <Avatar id={me.avatar} />
              {!me.staff && (
                <button onClick={() => setPicker(true)} aria-label="Edit avatar" className="absolute -bottom-2 -right-2 h-9 w-9 rounded-full bg-bull-lime text-bull-ink font-black text-xs shadow-lg grid place-items-center hover:scale-105 transition-transform">
                  Edit
                </button>
              )}
            </div>
            <div className="flex-1 min-w-0 text-center sm:text-left space-y-2">
              {lvl && <span className="inline-block bg-bull-raised border border-bull-line text-bull-lime text-xs font-bold px-3 py-1 rounded-full">Level {lvl.index + 1} of {LEVELS.length} - {lvl.name}</span>}
              <h1 className="text-2xl sm:text-3xl font-black text-white break-words">{me.name}</h1>
              {lvl && (
                <div className="max-w-sm mx-auto sm:mx-0">
                  <div className="h-3 rounded-full bg-bull-raised border border-bull-line overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={lvl.pct} aria-label="XP progress">
                    <div className="h-full rounded-full transition-all" style={{ width: lvl.pct + '%', background: 'linear-gradient(90deg, #B7F34A, #19C6B4)' }} />
                  </div>
                  <p className="text-sm text-slate-400 mt-1.5"><b className="font-black text-white">{data.xp.toLocaleString('en-IN')} XP</b>{lvl.next ? ' (' + lvl.toNext.toLocaleString('en-IN') + ' XP left to ' + lvl.next + ')' : ' (top level reached)'}</p>
                </div>
              )}
            </div>
            <div className="flex gap-2 justify-center">
              <button onClick={() => setEditing(!editing)} className="text-sm font-bold text-slate-200 border border-bull-line bg-bull-raised hover:border-bull-lime/50 px-4 py-2 rounded-xl transition">{editing ? 'Cancel' : 'Edit name'}</button>
              <button onClick={signOut} className="text-sm font-bold text-rose-400 border border-rose-900/40 bg-rose-950/20 hover:bg-rose-950/50 px-4 py-2 rounded-xl transition">Sign out</button>
            </div>
          </div>
        </section>

        {editing && (
          <form onSubmit={saveName} className={card + ' p-6 space-y-3 animate-scaleUp border-bull-lime/50'}>
            <label htmlFor="dn" className="text-sm font-bold text-slate-300">Display name</label>
            <input id="dn" value={editName} onChange={(e) => setEditName(e.target.value)} required maxLength={40} className="w-full px-4 py-3 bg-bull-raised border border-bull-line text-white rounded-xl text-sm font-bold focus:outline-none focus:border-bull-lime" />
            {status.message && <p className={'text-sm font-bold ' + (status.ok ? 'text-emerald-400' : 'text-rose-400')}>{status.message}</p>}
            <button type="submit" disabled={status.busy} className="px-5 py-2.5 bg-bull-lime hover:bg-bull-lime-light text-bull-ink text-sm font-black rounded-xl disabled:opacity-50">{status.busy ? 'Saving...' : 'Save name'}</button>
          </form>
        )}

        {me.staff ? (
          <section className={card + ' p-6 space-y-2'}>
            <h2 className="text-lg font-black text-white">Your account</h2>
            <p className="text-sm text-slate-300">Email: <span className="font-mono">{me.email}</span></p>
            <p className="text-sm text-slate-300">Role: {me.role === 'teacher' ? 'Teacher' : 'School admin'}</p>
            <p className="text-sm text-slate-300">Joined: {me.joined}</p>
          </section>
        ) : (
          <>
            {/* Stats */}
            <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {[
                ['Net worth', inr(me.netWorth), 'text-white'],
                ['Practice cash', inr(me.cash), 'text-white'],
                ['Bazaar Bucks', me.bb + ' BB', 'text-bull-lime'],
                ['Quiz streak', (data ? data.streak : 0) + ' days', 'text-amber-300'],
                ['Rank', rank ? '#' + rank : '-', 'text-emerald-400'],
              ].map(([l, v, c]) => (
                <div key={l} className={card + ' p-4'}>
                  <p className="text-xs font-bold text-slate-400">{l}</p>
                  <p className={'text-xl font-black font-mono tabular-nums mt-1 break-words ' + c}>{v}</p>
                </div>
              ))}
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Learning and trading */}
              <section className={card + ' p-6 space-y-4'}>
                <h2 className="text-lg font-black text-white">Your progress</h2>
                {data && (
                  <>
                    <div>
                      <div className="flex justify-between text-sm"><span className="text-slate-300">Lessons passed</span><span className="font-mono font-bold">{data.stats.lessons} / {data.stats.totalLessons}</span></div>
                      <div className="h-2.5 mt-1.5 rounded-full bg-bull-raised border border-bull-line overflow-hidden"><div className="h-full bg-bull-lime" style={{ width: (data.stats.totalLessons ? (data.stats.lessons / data.stats.totalLessons) * 100 : 0) + '%' }} /></div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      {[['Trades', data.stats.trades], ['Sectors', data.stats.sectors], ['Quiz days', data.stats.quizDays]].map(([l, v]) => (
                        <div key={l} className="bg-bull-raised border border-bull-line rounded-2xl py-3">
                          <p className="text-xl font-black font-mono">{v}</p>
                          <p className="text-xs text-slate-400">{l}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  <a href="/modules" className="px-4 py-2 rounded-xl bg-bull-lime text-bull-ink text-sm font-black hover:bg-bull-lime-light">Continue learning</a>
                  <a href="/simulator" className="px-4 py-2 rounded-xl border border-bull-line bg-bull-raised text-sm font-bold hover:border-bull-lime/50">Open simulator</a>
                </div>
              </section>

              {/* BB wallet */}
              <section className={card + ' p-6 space-y-3'}>
                <h2 className="text-lg font-black text-white">Bazaar Bucks wallet</h2>
                <p className="text-sm text-slate-300">1 BB = {inr(BB_TO_CASH)} of practice cash. You have <span className="font-mono font-bold text-bull-lime">{me.bb} BB</span>.</p>
                <div className="flex gap-2">
                  <input type="number" min={MIN_BB} step="1" value={bbInput} onChange={(e) => setBbInput(e.target.value)} placeholder={'Min ' + MIN_BB + ' BB'} aria-label="BB to convert" className="flex-1 min-w-0 px-4 py-2.5 bg-bull-raised border border-bull-line rounded-xl text-sm font-bold focus:outline-none focus:border-bull-lime" />
                  <button onClick={convert} disabled={conv.busy || bbNum < MIN_BB || bbNum > me.bb} className="px-4 py-2.5 rounded-xl bg-bull-lime text-bull-ink text-sm font-black disabled:opacity-40">{conv.busy ? 'Converting...' : 'Convert'}</button>
                </div>
                {bbNum >= MIN_BB && <p className="text-sm text-slate-300">You will get {inr(bbNum * BB_TO_CASH)} of practice cash.</p>}
                {conv.message && <p className={'text-sm font-bold ' + (conv.ok ? 'text-emerald-400' : 'text-rose-400')}>{conv.message}</p>}
                {data && <p className="text-xs text-slate-400">You can still convert {capLeft} BB in the next 30 days.</p>}
                {data && data.bb.history.length > 0 && (
                  <ul className="divide-y divide-bull-line border border-bull-line rounded-2xl overflow-hidden text-sm">
                    {data.bb.history.map((h, i) => (
                      <li key={i} className="flex justify-between px-3 py-2 bg-bull-raised/50">
                        <span className="text-slate-300">{new Date(h.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                        <span className="font-mono">-{h.bb_spent} BB, +{inr(h.cash_added)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            {/* Badges */}
            <section className={card + ' p-6 space-y-4'}>
              <style>{'@keyframes badgePop{0%,100%{transform:scale(1) rotate(0)}50%{transform:scale(1.07) rotate(-3deg)}}.badge-pop{animation:badgePop 2.6s ease-in-out infinite}@media (prefers-reduced-motion:reduce){.badge-pop{animation:none}}'}</style>
              <div className="flex items-baseline justify-between">
                <h2 className="text-lg font-black text-white">Badges</h2>
                <span className="text-sm font-bold text-bull-lime">{earnedCount} of {BADGES.length} earned</span>
              </div>
              <div className="h-2.5 rounded-full bg-bull-raised border border-bull-line overflow-hidden">
                <div className="h-full rounded-full" style={{ width: Math.round((earnedCount / BADGES.length) * 100) + '%', background: 'linear-gradient(90deg, #B7F34A, #19C6B4, #B28DFF)' }} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {BADGES
                  .map((x) => ({ b: x, got: !!(data && data.badges.find((y) => y.id === x.id)?.earned) }))
                  .sort((p, q) => Number(q.got) - Number(p.got))
                  .map(({ b, got }) => <BadgeTile key={b.id} b={b} got={got} />)}
              </div>
            </section>
          </>
        )}

        <section className={card + ' p-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm'}>
          <div><p className="text-xs font-bold text-slate-400">Email</p><p className="font-mono break-all">{me.email}</p></div>
          <div><p className="text-xs font-bold text-slate-400">Joined</p><p>{me.joined}</p></div>
          <div><p className="text-xs font-bold text-slate-400">About the money</p><p className="text-slate-300">All cash here is practice money. Nothing is bought with real money.</p></div>
        </section>
      </div>

      {picker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bull-bg/80 backdrop-blur-md p-4" role="dialog" aria-modal="true" aria-label="Choose your avatar" onClick={() => setPicker(false)}>
          <div className={card + ' w-full max-w-lg max-h-[85vh] overflow-y-auto p-6 space-y-4 shadow-2xl'} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-white">Choose your avatar</h2>
              <button onClick={() => setPicker(false)} className="text-sm text-slate-400 hover:text-white" aria-label="Close">Close</button>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {AVATARS.map((a) => {
                const locked = a.minLevel > 0 && (!lvl || lvl.index < a.minLevel);
                return (
                  <button key={a.id} disabled={locked} onClick={() => chooseAvatar(a.id)} className={'rounded-2xl border p-2 text-center transition ' + (me.avatar === a.id ? 'border-bull-lime bg-bull-raised' : 'border-bull-line bg-bull-bg hover:border-bull-lime/50') + (locked ? ' opacity-50 cursor-not-allowed' : '')}>
                    <Avatar id={a.id} size="h-16 w-16 mx-auto" text="text-3xl" />
                    <p className="text-xs font-bold mt-1.5">{a.name}</p>
                    <p className="text-xs text-slate-400">{locked ? 'Level ' + (a.minLevel + 1) : a.minLevel > 0 ? 'Unlocked' : 'Free'}</p>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-slate-400">Earn XP from lessons, quizzes, trades and badges to level up and unlock more avatars.</p>
          </div>
        </div>
      )}
    </main>
  );
}