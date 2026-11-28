'use client';
import { useState, useEffect, useReducer, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Mascot from '@/components/Mascot';
import {
  START_CASH, DAYS, MODES, MISSIONS, TROPHIES,
  reducer, standings, netWorth, finalScore, newsTouches, money, signed,
} from '@/lib/arenaGame';

const SAVE_KEY = 'bullrun_arena_v3';
const SIZES = [
  { v: 0.25, label: '25%' },
  { v: 0.5, label: '50%' },
  { v: 1, label: 'MAX' },
];

// Short sound effects made in the browser: [pitch, start, length]
const SOUNDS = {
  tick: [[520, 0, 0.09]],
  go: [[660, 0, 0.1], [990, 0.1, 0.25]],
  buy: [[440, 0, 0.07], [660, 0.06, 0.08]],
  sell: [[600, 0, 0.08], [500, 0.07, 0.08]],
  win: [[660, 0, 0.09], [880, 0.08, 0.09], [1175, 0.16, 0.18]],
  streak: [[660, 0, 0.07], [880, 0.07, 0.07], [1175, 0.14, 0.07], [1568, 0.21, 0.25]],
  loss: [[260, 0, 0.14], [180, 0.12, 0.2]],
  deny: [[200, 0, 0.12]],
  alert: [[988, 0, 0.08], [988, 0.13, 0.08]],
  newsUp: [[523, 0, 0.1], [784, 0.09, 0.16]],
  newsDown: [[392, 0, 0.1], [262, 0.09, 0.18]],
  mission: [[784, 0, 0.1], [1047, 0.1, 0.1], [1319, 0.2, 0.24]],
  overtake: [[587, 0, 0.1], [880, 0.1, 0.22]],
  finish: [[523, 0, 0.14], [659, 0.14, 0.14], [784, 0.28, 0.14], [1047, 0.42, 0.45]],
};

const CSS = `
@keyframes ar-pop { 0% { transform: scale(.6); opacity: 0; } 70% { transform: scale(1.08); opacity: 1; } 100% { transform: scale(1); } }
@keyframes ar-up { from { opacity: 0; transform: translateY(16px) scale(.9); } to { opacity: 1; transform: none; } }
@keyframes ar-fire { 0%, 100% { box-shadow: 0 0 0 0 rgba(251,146,60,.7); } 60% { box-shadow: 0 0 22px 6px rgba(251,146,60,.35); } }
@keyframes ar-alert { 0%, 100% { box-shadow: 0 0 0 0 rgba(250,204,21,.55); } 50% { box-shadow: 0 0 26px 4px rgba(250,204,21,.45); } }
@keyframes ar-flash-up { from { background-color: rgba(20,184,166,.35); } to { background-color: transparent; } }
@keyframes ar-flash-down { from { background-color: rgba(244,85,59,.30); } to { background-color: transparent; } }
@keyframes ar-drain { from { transform: scaleX(1); } to { transform: scaleX(0); } }
@keyframes ar-fall { 0% { transform: translateY(-10vh) rotate(0); opacity: 1; } 100% { transform: translateY(110vh) rotate(540deg); opacity: 0; } }
@keyframes ar-count { 0% { transform: scale(2.2); opacity: 0; } 35% { transform: scale(1); opacity: 1; } 100% { transform: scale(.85); opacity: .7; } }
.ar-pop { animation: ar-pop .45s ease-out both; }
.ar-up { animation: ar-up .3s ease-out both; }
.ar-fire { animation: ar-fire 1.1s ease-out infinite; }
.ar-alert { animation: ar-alert 1s ease-in-out infinite; }
.ar-flash-up { animation: ar-flash-up .8s ease-out; }
.ar-flash-down { animation: ar-flash-down .8s ease-out; }
.ar-drain { transform-origin: left; animation: ar-drain linear forwards; }
.ar-fall { position: fixed; top: 0; animation: ar-fall linear both; }
.ar-count { animation: ar-count 1s ease-out both; }
@media (prefers-reduced-motion: reduce) {
  .ar-pop, .ar-up, .ar-fire, .ar-alert, .ar-flash-up, .ar-flash-down, .ar-count { animation: none !important; }
  .ar-fall { display: none; }
}
`;

const readSave = () => {
  const empty = { best: {}, trophies: [], matches: 0, mute: false };
  try {
    return { ...empty, ...JSON.parse(window.localStorage.getItem(SAVE_KEY) || '{}') };
  } catch (e) {
    return empty;
  }
};
const writeSave = (data) => {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Could not save arena progress', e);
  }
};

function Confetti() {
  const [bits] = useState(() =>
    Array.from({ length: 30 }).map((_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.4,
      duration: 1.6 + Math.random() * 1.2,
      size: 14 + Math.random() * 14,
      icon: ['\u{1F389}', '\u{2728}', '\u{1F4B0}', '\u{1F525}', '\u{2B50}'][i % 5],
    }))
  );
  const [over, setOver] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setOver(true), 3200);
    return () => clearTimeout(t);
  }, []);
  if (over) return null;
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[80] overflow-hidden">
      {bits.map((b, i) => (
        <span key={i} className="ar-fall" style={{ left: b.left + '%', fontSize: b.size, animationDelay: b.delay + 's', animationDuration: b.duration + 's' }}>
          {b.icon}
        </span>
      ))}
    </div>
  );
}

function Spark({ values, up, className = 'h-10' }) {
  const min = Math.min(...values);
  const range = Math.max(...values) - min || 1;
  const points = values.map((v, i) => `${(i / (values.length - 1)) * 100},${36 - ((v - min) / range) * 32}`).join(' ');
  const colour = up ? 'var(--color-bull-teal, #19C6B4)' : 'var(--color-bull-coral, #FF765E)';
  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className={'w-full ' + className} aria-hidden="true">
      <polygon points={`0,40 ${points} 100,40`} fill={colour} fillOpacity="0.16" />
      <polyline points={points} fill="none" stroke={colour} strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

const dayChange = (st) => {
  const pct = ((st.price - st.prevClose) / st.prevClose) * 100;
  return { up: pct >= 0, text: (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%' };
};

const card = 'bg-bull-surface border border-bull-line rounded-2xl';
const buyBtn = 'rounded-xl bg-bull-lime text-bull-ink font-black text-xs uppercase py-2.5 transition active:scale-90 hover:brightness-105 disabled:opacity-30 cursor-pointer';
const sellBtn = 'rounded-xl bg-rose-700 text-white font-black text-xs uppercase py-2.5 transition active:scale-90 hover:brightness-110 disabled:opacity-25 cursor-pointer disabled:cursor-not-allowed';

function Lobby({ save, onStart, onClose }) {
  const [mode, setMode] = useState('classic');
  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 space-y-5">
      <div className={card + ' relative rounded-3xl p-6 sm:p-8 text-center space-y-5 border-2 border-b-4 border-b-bull-lime-dark ar-pop'}>
        <button type="button" onClick={onClose} title="Close and return home" aria-label="Close and return home" className="absolute top-4 right-4 h-9 w-9 rounded-xl bg-bull-raised border border-bull-line text-slate-400 hover:text-white font-black cursor-pointer">
          {'\u{2715}'}
        </button>
        <div className="flex justify-center"><Mascot mood="excited" size={130} eager /></div>
        <div className="space-y-2">
          <span className="inline-block rounded-full border border-bull-line bg-bull-raised px-4 py-1.5 text-xs font-black uppercase tracking-widest text-bull-lime">
            {'\u{26A1}'} 30-day speed trading
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-white">Enter The Arena</h1>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Read the headlines, pick your moment and beat four computer rivals. All money here is practice money.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {Object.values(MODES).map((m) => (
            <button
              key={m.id}
              type="button"
              aria-pressed={mode === m.id}
              onClick={() => setMode(m.id)}
              className={'rounded-2xl border-2 p-4 transition cursor-pointer ' + (mode === m.id ? 'border-bull-lime bg-bull-raised scale-[1.02]' : 'border-bull-line hover:border-bull-lime/60')}
            >
              <span className="block text-lg font-black text-white">{m.id === 'fast' ? '\u{1F525} ' : '\u{1F9E0} '}{m.name}</span>
              <span className="block text-xs text-slate-400">{m.blurb}</span>
              <span className="mt-2 block text-xs font-black text-bull-lime">
                {save.best[m.id] ? 'Best score: ' + save.best[m.id].toLocaleString('en-IN') : 'No score yet'}
              </span>
            </button>
          ))}
        </div>

        <button type="button" onClick={() => onStart(mode)} className="w-full py-4 rounded-2xl bg-bull-lime text-bull-ink font-black uppercase tracking-wider text-base border-b-4 border-bull-lime-dark transition active:scale-95 hover:brightness-105 cursor-pointer">
          {'\u{25B6}'} Start match
        </button>

        <ul className="grid gap-2 sm:grid-cols-3 text-left text-xs text-slate-300">
          {[
            ['\u{1F4F0}', 'Headlines drop without warning, like real life. Read them, then decide.'],
            ['\u{1F3E2}', 'Spread your money across 12 companies in 6 sectors.'],
            ['\u{1F3AF}', 'Finish 3 secret missions each match for bonus points.'],
          ].map(([icon, text]) => (
            <li key={icon} className="rounded-xl border border-bull-line bg-bull-raised p-3"><span className="mr-1">{icon}</span>{text}</li>
          ))}
        </ul>
      </div>

      <div className={card + ' rounded-3xl p-5 space-y-3'}>
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-black uppercase tracking-wider text-white">Trophy cabinet</h2>
          <span className="text-xs font-black text-bull-lime">{TROPHIES.filter((t) => save.trophies.includes(t.id)).length} of {TROPHIES.length}</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {TROPHIES.map((t) => {
            const got = save.trophies.includes(t.id);
            return (
              <div key={t.id} className={'rounded-xl border p-3 text-center ' + (got ? 'border-bull-lime bg-bull-raised' : 'border-bull-line')}>
                <div className={'text-3xl ' + (got ? '' : 'grayscale opacity-30')}>{t.icon}</div>
                <p className="text-xs font-black text-white">{t.name}</p>
                <p className="text-xs text-slate-400">{got ? 'Unlocked' : t.hint}</p>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-slate-500">Best scores and trophies are saved in this browser.</p>
      </div>
    </div>
  );
}

function NewsDesk({ game }) {
  const log = game.newsLog;
  const n = log[0];
  const age = n ? game.clock - n.at : 0;
  const fresh = !!n && age < 12;
  const who = (x) => {
    const st = x.sym ? game.stocks.find((s) => s.sym === x.sym) : null;
    return st ? st.name : x.sector === 'ALL' ? 'Whole market' : x.sector + ' sector';
  };
  // Fixed height, so nothing jumps around while you are tapping
  return (
    <div className="min-h-[92px] flex" aria-live="polite">
      {n ? (
        <div key={n.id} className={'ar-pop w-full rounded-2xl border-2 bg-bull-surface p-3 sm:p-4 ' + (fresh ? 'ar-alert border-amber-500' : 'border-bull-line')}>
          <div className="flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-wider">
            <span className={fresh ? 'text-amber-400' : 'text-slate-400'}>{'\u{1F4F0}'} {fresh ? 'Just in' : 'Latest news'}</span>
            <span className="rounded-full border border-bull-line px-2 py-0.5 text-slate-300">{who(n)}</span>
            <span className="text-slate-500">Day {n.day}, {age}s ago</span>
          </div>
          <p className="mt-1 text-base sm:text-lg font-black text-white leading-tight">{n.text}</p>
          {log.length > 1 && (
            <p className="hidden sm:block mt-1 truncate text-xs text-slate-500">Earlier: {log.slice(1, 3).map((x) => x.text).join('  |  ')}</p>
          )}
        </div>
      ) : (
        <div className="w-full rounded-2xl border-2 border-dashed border-bull-line p-4 grid place-items-center text-xs font-black uppercase tracking-widest text-slate-500">
          {'\u{1F4E1}'} Newsroom is quiet. Headlines can land at any moment...
        </div>
      )}
    </div>
  );
}function Results({ game, save, record, onAgain, onLobby }) {
  const r = game.result;
  const headline = r.place === 1 ? 'Arena Champion!' : r.place === 2 ? 'So close to the crown!' : r.worth >= START_CASH ? 'Match complete!' : 'Tough market!';
  const best = save.best[game.mode] || 0;
  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 space-y-5">
      <div className="ar-pop rounded-3xl border-2 border-bull-lime bg-bull-surface p-6 sm:p-8 text-center space-y-4">
        <div className="flex justify-center">
          <Mascot mood={r.place === 1 ? 'trophy' : r.worth >= START_CASH ? 'celebrating' : 'encouraging'} size={160} eager />
        </div>
        <h1 className="text-3xl font-black text-white">{headline}</h1>
        <div className="flex items-center justify-center gap-4">
          <div className="ar-pop grid h-24 w-24 place-items-center rounded-3xl bg-bull-lime text-bull-ink" style={{ animationDelay: '.3s' }}>
            <span className="text-5xl font-black">{r.grade}</span>
          </div>
          <div className="text-left">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Score</p>
            <p className="font-mono text-4xl font-black text-white">{r.score.toLocaleString('en-IN')}</p>
            <p className="text-xs font-black text-bull-lime">
              {record ? '\u{1F31F} New personal best!' : Math.max(0, best - r.score).toLocaleString('en-IN') + ' points from your best'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            ['Net worth', money(r.worth)],
            ['Profit / loss', signed(r.worth - START_CASH)],
            ['Place', '#' + r.place + ' of 5'],
            ['Missions', game.missions.filter((m) => m.done).length + ' of ' + game.missions.length],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-bull-line bg-bull-raised p-3">
              <p className="text-xs text-slate-400">{label}</p>
              <p className="font-mono text-sm font-black text-white break-words">{value}</p>
            </div>
          ))}
        </div>

        {r.trophies.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2">
            {r.trophies.map((id, i) => {
              const t = TROPHIES.find((x) => x.id === id);
              return (
                <span key={id} className="ar-pop rounded-full border border-bull-lime bg-bull-raised px-3 py-1.5 text-xs font-black text-white" style={{ animationDelay: 0.5 + i * 0.15 + 's' }}>
                  {t.icon} {t.name}
                </span>
              );
            })}
          </div>
        )}

        <p className="rounded-xl border border-bull-line bg-bull-raised p-3 text-sm text-slate-300">{'\u{1F4A1}'} {r.tip}</p>

        <div className="flex flex-col sm:flex-row gap-3">
          <button type="button" onClick={onAgain} className="flex-1 py-4 rounded-2xl bg-bull-lime text-bull-ink font-black uppercase tracking-wider text-sm border-b-4 border-bull-lime-dark active:scale-95 cursor-pointer">
            {'\u{1F501}'} Play again
          </button>
          <button type="button" onClick={onLobby} className="py-4 px-6 rounded-2xl border border-bull-line bg-bull-raised text-slate-300 font-black uppercase text-xs cursor-pointer">
            Trophy cabinet
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ArenaPage() {
  const router = useRouter();
  const [game, dispatch] = useReducer(reducer, null);
  const [save, setSave] = useState({ best: {}, trophies: [], matches: 0, mute: false });
  const [countdown, setCountdown] = useState(null); // { n, mode }
  const [size, setSize] = useState(0.25);
  const [openSym, setOpenSym] = useState(null);
  const [qty, setQty] = useState(1);
  const [exitTo, setExitTo] = useState(null);
  const [record, setRecord] = useState(false);

  const audioRef = useRef(null);
  const muteRef = useRef(false);
  const playedRef = useRef(0);

  const phase = game ? game.phase : 'LOBBY';
  const live = phase === 'RUNNING' || !!countdown;

  const play = (name) => {
    const ctx = audioRef.current;
    if (!ctx || muteRef.current) return;
    (SOUNDS[name] || []).forEach(([pitch, start, length]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const at = ctx.currentTime + start;
      osc.type = 'triangle';
      osc.frequency.value = pitch;
      gain.gain.setValueAtTime(0.12, at);
      gain.gain.exponentialRampToValueAtTime(0.001, at + length);
      osc.connect(gain).connect(ctx.destination);
      osc.start(at);
      osc.stop(at + length);
    });
  };

  useEffect(() => {
    const data = readSave();
    setSave(data);
    muteRef.current = data.mute;
  }, []);

  const startMatch = (mode) => {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx && !audioRef.current) audioRef.current = new Ctx();
      audioRef.current?.resume();
    } catch (e) {
      console.warn('Sound is not available', e);
    }
    playedRef.current = 0;
    setOpenSym(null);
    setRecord(false);
    dispatch({ type: 'quit' });
    setCountdown({ n: 3, mode });
    window.scrollTo({ top: 0 });
  };

  // 3, 2, 1, GO
  useEffect(() => {
    if (!countdown) return undefined;
    play(countdown.n > 0 ? 'tick' : 'go');
    const t = setTimeout(() => {
      if (countdown.n > 0) setCountdown({ ...countdown, n: countdown.n - 1 });
      else {
        dispatch({ type: 'start', mode: countdown.mode, seed: Math.floor(Math.random() * 2 ** 31) });
        setCountdown(null);
      }
    }, countdown.n > 0 ? 800 : 600);
    return () => clearTimeout(t);
  }, [countdown]);

  // One game second at a time. The match pauses while the "leave?" box is open.
  useEffect(() => {
    if (phase !== 'RUNNING' || exitTo) return undefined;
    const t = setInterval(() => dispatch({ type: 'tick' }), 1000);
    return () => clearInterval(t);
  }, [phase, exitTo]);

  // Play any new sound cues
  const fx = game ? game.fx : null;
  useEffect(() => {
    if (!fx) return;
    fx.filter((c) => c.id > playedRef.current).forEach((c) => {
      playedRef.current = c.id;
      play(c.name);
    });
  }, [fx]);

  // Save best score and trophies once the match ends
  const result = game ? game.result : null;
  useEffect(() => {
    if (!result) return;
    const old = readSave();
    const before = old.best[game.mode] || 0;
    const next = {
      ...old,
      matches: old.matches + 1,
      best: { ...old.best, [game.mode]: Math.max(before, result.score) },
      trophies: [...new Set([...old.trophies, ...result.trophies])],
    };
    writeSave(next);
    setSave(next);
    setRecord(result.score > before);
    setOpenSym(null);
    setExitTo(null);
    window.scrollTo({ top: 0 });
  }, [result]);

  useEffect(() => {
    const warn = (e) => {
      if (live) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [live]);

  useEffect(() => {
    if (!live) return undefined;
    const intercept = (e) => {
      const link = e.target.closest('a');
      if (link && link.href && new URL(link.href).pathname !== '/arena') {
        e.preventDefault();
        setExitTo(link.href);
      }
    };
    document.addEventListener('click', intercept, true);
    return () => document.removeEventListener('click', intercept, true);
  }, [live]);

  const toggleMute = () => {
    const next = { ...save, mute: !save.mute };
    muteRef.current = next.mute;
    setSave(next);
    writeSave({ ...readSave(), mute: next.mute });
  };

  const leave = () => {
    const to = exitTo;
    setExitTo(null);
    setCountdown(null);
    setOpenSym(null);
    dispatch({ type: 'quit' });
    if (to && to !== 'lobby') router.push(to);
  };

  const worth = game ? netWorth(game) : START_CASH;
  const profit = worth - START_CASH;
  const table = game ? standings(game) : [];
  const place = table.findIndex((p) => p.id === 'you') + 1;
  const ahead = place > 1 ? table[place - 2] : null;
  const open = game && openSym ? game.stocks.find((s) => s.sym === openSym) : null;
  const openHold = open ? game.holdings[open.sym] : null;
  

  return (
    <main className={'min-h-screen bg-bull-bg text-slate-100 antialiased font-sans relative max-w-full overflow-x-hidden pt-20 ' + (phase === 'RUNNING' ? 'pb-52 sm:pb-44' : 'pb-24')}>
      <style>{CSS}</style>
      <Navbar />
      {game && game.party > 0 && <Confetti key={game.party} />}

      {countdown ? (
        <div className="min-h-[70vh] grid place-items-center text-center">
          <div>
            <div key={countdown.n} className="ar-count font-mono text-8xl font-black text-bull-lime">{countdown.n > 0 ? countdown.n : 'GO!'}</div>
            <p className="mt-6 text-sm font-black uppercase tracking-widest text-slate-400">Get your trading finger ready</p>
          </div>
        </div>
      ) : phase === 'LOBBY' ? (
        <Lobby save={save} onStart={startMatch} onClose={() => router.push('/')} />
      ) : phase === 'FINISHED' ? (
        <Results game={game} save={save} record={record} onAgain={() => startMatch(game.mode)} onLobby={() => dispatch({ type: 'quit' })} />
      ) : (
        <div className="max-w-[1240px] mx-auto px-3 sm:px-4 pt-3 space-y-3">
          {/* Status bar */}
          <div className={card + ' p-3 space-y-2'}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-black text-white">Day {game.day} / {DAYS}</span>
              <span className="font-mono text-xs font-black text-slate-400">next in {game.secsLeft}s</span>
              <div className="ml-auto flex items-center gap-2">
                <span key={finalScore(game)} className="rounded-xl border border-bull-line bg-bull-raised px-3 py-1.5 font-mono text-xs font-black text-white">
                  {'\u{2B50}'} {finalScore(game).toLocaleString('en-IN')}
                </span>
                
                <button type="button" onClick={toggleMute} aria-label={save.mute ? 'Turn sound on' : 'Turn sound off'} className="h-9 w-9 rounded-xl border border-bull-line bg-bull-raised cursor-pointer">
                  {save.mute ? '\u{1F507}' : '\u{1F50A}'}
                </button>
                <button type="button" onClick={() => setExitTo('lobby')} aria-label="Quit match" className="h-9 w-9 rounded-xl border border-bull-line bg-bull-raised text-slate-300 font-black cursor-pointer">
                  {'\u{2715}'}
                </button>
              </div>
            </div>
            <div className="h-2 rounded-full bg-bull-raised overflow-hidden">
              <div className="h-full bg-gradient-to-r from-bull-lime to-emerald-400 transition-all duration-1000 ease-linear" style={{ width: (Math.min(1, game.clock / (DAYS * MODES[game.mode].daySecs)) * 100) + '%' }} />
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            {[
              ['Net worth', money(worth), 'text-white'],
              ['Cash', money(game.cash), 'text-white'],
              ['Profit / loss', signed(profit), profit >= 0 ? 'text-emerald-400' : 'text-rose-400'],
              ['Place', '#' + place + (ahead ? ', ' + money(ahead.worth - worth) + ' to pass ' + ahead.name : ', leading!'), 'text-bull-lime'],
            ].map(([label, value, tone]) => (
              <div key={label} className={card + ' p-3'}>
                <span className="text-xs font-black uppercase tracking-wider text-slate-500">{label}</span>
                <div className={'mt-0.5 font-mono font-black tabular-nums break-words ' + (label === 'Place' ? 'text-xs sm:text-sm ' : 'text-lg sm:text-2xl ') + tone}>{value}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-3">
            <div className="min-w-0 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-400">Buy size</span>
                {SIZES.map((s) => (
                  <button key={s.v} type="button" aria-pressed={size === s.v} onClick={() => setSize(s.v)} className={'flex-1 sm:flex-none rounded-xl border px-4 py-2 text-xs font-black cursor-pointer ' + (size === s.v ? 'bg-bull-lime border-bull-lime text-bull-ink' : 'border-bull-line bg-bull-surface text-slate-300')}>
                    {s.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                {game.stocks.map((st) => {
                  const hold = game.holdings[st.sym];
                  const ch = dayChange(st);
                  const gain = hold ? Math.round((st.price - hold.avg) * hold.shares) : 0;
                  const hot = newsTouches(game.news, st);
                  const last = st.history[st.history.length - 2];
                  return (
                    <div key={st.sym} className={'rounded-2xl border-2 bg-bull-surface p-2.5 flex flex-col gap-2 min-w-0 ' + (hot ? 'ar-alert border-amber-500' : hold ? (gain >= 0 ? 'border-emerald-500' : 'border-rose-500') : 'border-bull-line')}>
                      <button type="button" onClick={() => { setOpenSym(st.sym); setQty(1); }} aria-label={'Details for ' + st.name} className="text-left space-y-1 cursor-pointer">
                        <span className="flex items-center justify-between gap-1">
                          <span className="font-black text-sm text-white truncate">{st.icon} {st.sym}</span>
                          <span className={'font-mono text-xs font-black ' + (ch.up ? 'text-emerald-400' : 'text-rose-400')}>{ch.text}</span>
                        </span>
                        <span key={st.price} className={'block rounded-md font-mono text-lg font-black text-white tabular-nums ' + (st.price > last ? 'ar-flash-up' : st.price < last ? 'ar-flash-down' : '')}>
                          {money(st.price)}
                        </span>
                        <Spark values={st.history} up={st.price >= st.history[0]} />
                        <span className={'block h-4 text-xs font-black ' + (hold ? (gain >= 0 ? 'text-emerald-400' : 'text-rose-400') : 'text-slate-500')}>
                          {hold ? hold.shares + ' owned, ' + signed(gain) : 'Not owned'}
                        </span>
                      </button>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button type="button" className={buyBtn} disabled={game.cash < st.price} onClick={() => dispatch({ type: 'buy', sym: st.sym, size })}>Buy</button>
                        <button type="button" className={sellBtn} disabled={!hold} onClick={() => dispatch({ type: 'sell', sym: st.sym })}>Sell</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <div className={card + ' p-4 space-y-3'}>
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">{'\u{1F3AF}'} Missions</h2>
                {game.missions.map((m) => {
                  const rule = MISSIONS.find((x) => x.id === m.id);
                  const value = m.done ? rule.goal : Math.min(rule.goal, rule.read(game));
                  const from = m.id === 'rich' ? START_CASH : 0;
                  return (
                    <div key={m.id} className={'rounded-xl border p-3 ' + (m.done ? 'ar-pop border-bull-lime bg-bull-lime/20' : 'border-bull-line')}>
                      <p className="text-xs font-black text-white">{m.done ? '\u{2705}' : rule.icon} {rule.text}</p>
                      <div className="mt-2 h-1.5 rounded-full bg-bull-raised overflow-hidden">
                        <div className="h-full bg-bull-lime transition-all duration-500" style={{ width: Math.max(0, ((value - from) / (rule.goal - from)) * 100) + '%' }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className={card + ' p-4 space-y-2'}>
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">{'\u{1F3C1}'} Live standings</h2>
                {table.map((p, i) => (
                  <div key={p.id} className={'flex items-center justify-between gap-2 rounded-xl border p-2.5 text-xs transition-all ' + (p.id === 'you' ? 'border-bull-lime bg-bull-lime/25 font-black text-white' : 'border-bull-line text-slate-300')}>
                    <span className="truncate"><span className="mr-2 font-mono font-black">#{i + 1}</span>{p.icon} {p.name}{p.id === 'you' ? '' : ' (bot)'}</span>
                    <span className="font-mono font-black">{money(p.worth)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* News desk: docked at the bottom, so it is always in reach while you scroll */}
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-bull-line bg-bull-bg p-2 sm:p-3 shadow-2xl">
            <div className="mx-auto max-w-3xl">
              <NewsDesk game={game} size={size} dispatch={dispatch} />
            </div>
          </div>

          {/* Pop-up messages */}
          <div className="pointer-events-none fixed inset-x-0 top-20 z-[60] flex flex-col items-center gap-2 px-4" aria-live="polite">
            {game.toasts.map((t) => (
              <div key={t.id} className={'ar-up max-w-md rounded-2xl border-2 px-4 py-2.5 text-center text-sm font-black shadow-2xl ' +
                (t.tone === 'good' ? 'border-emerald-300 bg-[#0f766e] text-[#ffffff]' : t.tone === 'bad' ? 'border-rose-300 bg-[#9f1239] text-[#ffffff]' : t.tone === 'gold' ? 'border-amber-200 bg-[#facc15] text-[#1c1917]' : 'border-bull-line bg-[#0B1220] text-[#ffffff]')}>
                {t.text}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Company details and exact-quantity trading */}
      {open && phase === 'RUNNING' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bull-bg/80 backdrop-blur-md p-4 overflow-y-auto" onClick={() => setOpenSym(null)}>
          <div role="dialog" aria-modal="true" aria-label={open.name} className="ar-pop my-auto w-full max-w-lg rounded-3xl border-2 border-bull-line bg-bull-surface p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-bull-lime">{open.sector}</span>
                <h2 className="text-xl font-black text-white">{open.icon} {open.name} ({open.sym})</h2>
              </div>
              <button type="button" onClick={() => setOpenSym(null)} aria-label="Close company details" className="h-9 w-9 shrink-0 rounded-xl border border-bull-line bg-bull-raised text-slate-400 font-black cursor-pointer">{'\u{2715}'}</button>
            </div>
            <p className="text-xs text-slate-300">{open.desc}</p>
            <div className="rounded-2xl border border-bull-line bg-bull-raised p-3">
              <p className="font-mono text-2xl font-black text-white">{money(open.price)}</p>
              <Spark values={open.history} up={open.price >= open.history[0]} className="h-36" />
              <p className="text-xs text-slate-500">Made-up prices for practice, not live exchange data. Previous close {money(open.prevClose)}.</p>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="ar-qty" className="text-xs font-black uppercase text-slate-400">Units</label>
              <input id="ar-qty" type="number" min="1" value={qty} onChange={(e) => setQty(Math.max(1, parseInt(e.target.value, 10) || 1))} className="min-w-0 flex-1 rounded-xl border border-bull-line bg-bull-raised px-3 py-2 font-mono text-sm font-bold text-white focus:outline-none focus:border-bull-lime" />
              <button type="button" onClick={() => setQty(Math.max(1, Math.floor(game.cash / open.price)))} className="rounded-xl border border-bull-line bg-bull-raised px-3 py-2 text-xs font-black text-bull-lime cursor-pointer">MAX</button>
            </div>
            <p className="text-xs text-slate-400">Cost {money(qty * open.price)}. Cash {money(game.cash)}. Owned {openHold ? openHold.shares : 0}.</p>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" className={buyBtn} onClick={() => dispatch({ type: 'buy', sym: open.sym, qty })}>Buy</button>
              <button type="button" className={sellBtn} disabled={!openHold} onClick={() => dispatch({ type: 'sell', sym: open.sym, qty })}>Sell</button>
            </div>
            {game.toasts.length > 0 && <p className="text-center text-xs font-black text-white">{game.toasts[game.toasts.length - 1].text}</p>}
          </div>
        </div>
      )}

      {exitTo && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-bull-bg/80 backdrop-blur-md p-4">
          <div role="dialog" aria-modal="true" aria-label="Leave the match" className="ar-pop w-full max-w-md rounded-3xl border border-bull-lime/50 bg-bull-surface p-6 text-center space-y-4">
            <div className="flex justify-center"><Mascot mood="warning" size={90} eager /></div>
            <h2 className="text-xl font-black text-white">Leave this match?</h2>
            <p className="text-xs text-slate-400">The match is paused. If you leave, this match is not saved.</p>
            <div className="flex gap-3">
              <button type="button" onClick={leave} className="flex-1 rounded-xl bg-rose-700 py-3 text-xs font-black uppercase text-white cursor-pointer">Leave</button>
              <button type="button" onClick={() => setExitTo(null)} className="flex-1 rounded-xl bg-bull-lime py-3 text-xs font-black uppercase text-bull-ink cursor-pointer">Keep playing</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
