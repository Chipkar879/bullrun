'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import Mascot from '@/components/Mascot';

const STORE_PREFIX = 'bullrun_progress_v3_';
let storeKey = STORE_PREFIX + 'guest';
const XP_PER_LESSON = 100;
const XP_PER_LEVEL = 500;
const LEVELS = ['Rookie Saver', 'Smart Spender', 'Market Explorer', 'Strategy Builder', 'Wall Street Architect'];

const CSS = `
@keyframes brFall{0%{transform:translateY(-10vh) rotate(0);opacity:1}100%{transform:translateY(110vh) rotate(540deg);opacity:0}}
@keyframes brSlide{from{opacity:0;transform:translateX(24px) scale(.98)}to{opacity:1;transform:none}}
@keyframes brPop{0%{transform:scale(.5);opacity:0}60%{transform:scale(1.2)}100%{transform:scale(1);opacity:1}}
@keyframes brFloat{0%{transform:translateY(0);opacity:1}100%{transform:translateY(-80px);opacity:0}}
@keyframes brGlow{0%,100%{box-shadow:0 0 0 0 rgba(163,230,53,0)}50%{box-shadow:0 0 28px 2px rgba(163,230,53,.35)}}
.br-fall{position:fixed;top:0;animation-name:brFall;animation-timing-function:linear;animation-fill-mode:forwards}
.br-slide{animation:brSlide .35s ease-out}
.br-pop{display:inline-block;animation:brPop .5s ease-out}
.br-float{animation:brFloat 1.8s ease-out forwards}
.br-glow{animation:brGlow 2.2s ease-in-out infinite}
.br-noscroll{scrollbar-width:none;-ms-overflow-style:none}
.br-noscroll::-webkit-scrollbar{display:none}
`;

const KIND = {
  mission:  { icon: '\ud83d\ude80', label: 'Mission Briefing', box: 'bg-gradient-to-br from-lime-200 via-lime-100 to-white border-lime-500 text-slate-800 shadow-md shadow-lime-500/20' },
  intel:    { icon: '\u26a1',       label: 'Financial Intel',  box: 'bg-gradient-to-br from-slate-200 via-slate-100 to-white border-slate-400 text-slate-800 shadow-md shadow-slate-500/20' },
  wow:      { icon: '\ud83e\udd2f', label: 'Wow Fact',         box: 'bg-gradient-to-br from-fuchsia-300 via-fuchsia-100 to-white border-fuchsia-500 text-fuchsia-950 shadow-md shadow-fuchsia-500/20' },
  try:      { icon: '\ud83e\uddea', label: 'Try It',           box: 'bg-gradient-to-br from-sky-300 via-sky-100 to-white border-sky-500 text-sky-950 shadow-md shadow-sky-500/20' },
  case:     { icon: '\ud83c\udf55', label: 'Mini Case',        box: 'bg-gradient-to-br from-amber-300 via-amber-100 to-white border-amber-500 text-amber-950 shadow-md shadow-amber-500/20' },
  takeaway: { icon: '\ud83d\udca1', label: 'Core Takeaway',    box: 'bg-gradient-to-br from-emerald-300 via-emerald-100 to-white border-emerald-600 text-emerald-950 shadow-md shadow-emerald-500/20' },
};

function parseBlocks(content) {
  return (content || '')
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map((b) => {
      const lines = b.split('\n');
      const head = lines[0].replace(/^[^A-Za-z0-9]+/, '').replace(/:\s*$/, '').trim();
      const up = head.toUpperCase();
      let kind = 'intel';
      if (up.indexOf('CORE TAKEAWAY') === 0) kind = 'takeaway';
      else if (up.indexOf('TRY IT') === 0) kind = 'try';
      else if (up.indexOf('WOW') === 0) kind = 'wow';
      else if (up.indexOf('MINI CASE') === 0 || up.indexOf('CASE STUDY') === 0) kind = 'case';
      else if (up.indexOf('MISSION') === 0) kind = 'mission';
      return { kind, head, body: lines.slice(1).map((l) => l.trim()).filter(Boolean) };
    });
}

// Default mascot mood per card type. A lesson can set its own opening mood
// with a "mascot" field in the JSON (used on the first card).
const MOOD_BY_KIND = { mission: 'curious', intel: 'explaining', wow: 'excited', try: 'thinking', case: 'curious', takeaway: 'proud' };

function Confetti() {
  const bits = useMemo(
    () =>
      Array.from({ length: 36 }).map((_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.8,
        dur: 2 + Math.random() * 1.6,
        size: 14 + Math.random() * 16,
        ch: ['\ud83c\udf89', '\u2728', '\u26a1', '\ud83d\udcb0', '\ud83d\udd25'][i % 5],
      })),
    []
  );
  return (
    <div className="pointer-events-none fixed inset-0 z-[70] overflow-hidden">
      {bits.map((b, i) => (
        <span key={i} className="br-fall" style={{ left: b.left + '%', animationDelay: b.delay + 's', animationDuration: b.dur + 's', fontSize: b.size }}>
          {b.ch}
        </span>
      ))}
    </div>
  );
}

function CardBody({ lines, big }) {
  return (
    <div className="space-y-2">
      {lines.map((l, i) => {
        const isBullet = l.charAt(0) === '\u2022' || /^\d+\.\s/.test(l);
        if (isBullet) {
          return (
            <div key={i} className="flex items-start gap-2.5 bg-white/80 border border-slate-300 rounded-xl p-3 text-xs sm:text-sm">
              <span className="text-lime-600 font-black font-mono">{'\u27a4'}</span>
              <span className="leading-relaxed text-[#1e293b]">{l.replace(/^[\u2022]\s*/, '')}</span>
            </div>
          );
        }
        return (
          <p key={i} className={(big ? 'text-base sm:text-lg font-bold ' : 'text-xs sm:text-sm font-medium ') + 'leading-relaxed'}>
            {l}
          </p>
        );
      })}
    </div>
  );
}

export default function InteractiveCourseWrapper({ initialTracks = [] }) {
  const [done, setDone] = useState([]);
  const [trackId, setTrackId] = useState(null);
  const [lesson, setLesson] = useState(null);
  const [mode, setMode] = useState('read');
  const [card, setCard] = useState(0);
  const [qIdx, setQIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [checking, setChecking] = useState(false);
  const [err, setErr] = useState('');
  const [xpPop, setXpPop] = useState(false);
  const touchX = useRef(null);
  const trackRef = useRef(null);

  // The browser copy is only a cache so the page shows something instantly.
  // The database is the truth, so progress follows the student to any device.
  const save = (list) => {
    try {
      localStorage.setItem(storeKey, JSON.stringify(list));
    } catch (e) {
      console.warn('Could not save progress', e);
    }
  };

  const authHeaders = async () => {
    const { data } = await supabase.auth.getSession();
    const token = data && data.session ? data.session.access_token : null;
    return token ? { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token } : null;
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let local = [];
      try {
        const { data: sess } = await supabase.auth.getSession();
        const uid = sess && sess.session ? sess.session.user.id : null;
        storeKey = STORE_PREFIX + (uid || 'guest');
        try { localStorage.removeItem('bullrun_progress_v2'); } catch (e) { /* ignore */ }
        const saved = localStorage.getItem(storeKey);
        if (saved) {
          const p = JSON.parse(saved);
          if (Array.isArray(p)) local = p;
        }
      } catch (e) {
        console.warn('Could not read saved progress', e);
      }
      if (local.length > 0) setDone(local);

      try {
        const headers = await authHeaders();
        if (!headers) return;
        const res = await fetch('/api/progress', {
          method: 'POST',
          headers,
          body: JSON.stringify({}),
        });
        if (!res.ok) throw new Error('Progress sync failed (' + res.status + ')');
        const data = await res.json();
        if (!cancelled && Array.isArray(data.done)) {
          setDone(data.done);
          save(data.done);
        }
      } catch (e) {
        console.warn('Could not sync progress', e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const scrollTracks = (dir) => {
    if (trackRef.current) {
      trackRef.current.scrollBy({ left: dir === 'left' ? -320 : 320, behavior: 'smooth' });
    }
  };

  const allLessons = initialTracks.flatMap((t) => (t.modules || []).flatMap((m) => m.submodules || []));
  const xp = done.length * XP_PER_LESSON;
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const levelName = LEVELS[Math.min(level - 1, LEVELS.length - 1)];
  const levelPct = ((xp % XP_PER_LEVEL) / XP_PER_LEVEL) * 100;

  const activeTrack = initialTracks.find((t) => t.id === trackId);
  const blocks = useMemo(() => parseBlocks(lesson ? lesson.content : ''), [lesson]);

  const lessonUnlocked = (id) => {
    const i = allLessons.findIndex((s) => s.id === id);
    if (i <= 0) return true;
    return done.includes(allLessons[i - 1].id);
  };

  const trackUnlocked = (idx) => {
    if (idx === 0) return true;
    const prev = initialTracks[idx - 1];
    const subs = ((prev && prev.modules) || []).flatMap((m) => m.submodules || []);
    if (subs.length === 0) return false;
    return subs.every((s) => done.includes(s.id));
  };

  const openLesson = (l) => {
    setLesson(l);
    setMode('read');
    setCard(0);
    setQIdx(0);
    setAnswers({});
    setResult(null);
    setErr('');
    setXpPop(false);
  };

  const closeLesson = () => setLesson(null);

  const restartQuiz = () => {
    setAnswers({});
    setResult(null);
    setQIdx(0);
    setErr('');
  };

  const submitQuiz = async () => {
    if (!lesson || checking) return;
    setChecking(true);
    setErr('');
    try {
      const headers = await authHeaders();
      if (!headers) throw new Error('Not logged in');
      const res = await fetch('/api/quiz-check', {
        method: 'POST',
        headers,
        body: JSON.stringify({ submoduleId: lesson.id, answers }),
      });
      if (!res.ok) throw new Error('Check failed');
      const data = await res.json();
      setResult(data);
      if (data.passed && !done.includes(lesson.id)) {
        const updated = Array.isArray(data.done) ? data.done : [...done, lesson.id];
        setDone(updated);
        save(updated);
        setXpPop(true);
      }
    } catch (e) {
      setErr('Could not check your answers. Please check your internet and try again.');
    } finally {
      setChecking(false);
    }
  };

  const onTouchStart = (e) => {
    touchX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e) => {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (dx < -50 && card < blocks.length - 1) setCard(card + 1);
    if (dx > 50 && card > 0) setCard(card - 1);
  };

  const quiz = lesson && lesson.quiz ? lesson.quiz : [];
  const answeredAll = quiz.length > 0 && Object.keys(answers).length >= quiz.length;
  const nextLessonObj = lesson ? allLessons[allLessons.findIndex((s) => s.id === lesson.id) + 1] : null;

  return (
    <div className="space-y-8 relative antialiased font-sans">
      <style>{CSS}</style>

      {/* PLAYER CARD */}
      <div className="bg-gradient-to-r from-bull-surface via-bull-raised to-bull-surface border border-bull-line p-5 rounded-3xl shadow-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-bull-bg border border-bull-lime/50 flex items-center justify-center text-2xl br-glow"><Mascot mood="cool" size={40} fallback={'\ud83d\udc02'} /></div>
            <div>
              <span className="text-xs font-black tracking-widest text-bull-lime uppercase block font-mono">LEVEL {level}</span>
              <h3 className="text-base sm:text-lg font-black text-white">{levelName}</h3>
            </div>
          </div>
          <div className="flex items-center gap-3 font-mono text-xs">
            <div className="bg-bull-bg border border-bull-line px-3.5 py-1.5 rounded-xl">
              <span className="text-slate-500 text-xs block uppercase font-black font-sans">Total XP</span>
              <span className="font-black text-amber-400">{'\ud83d\udd25'} {xp}</span>
            </div>
            <div className="bg-bull-bg border border-bull-line px-3.5 py-1.5 rounded-xl">
              <span className="text-slate-500 text-xs block uppercase font-black font-sans">Lessons</span>
              <span className="font-black text-emerald-400">{done.length} / {allLessons.length}</span>
            </div>
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs font-mono text-slate-500 mb-1">
            <span>NEXT LEVEL</span>
            <span>{xp % XP_PER_LEVEL} / {XP_PER_LEVEL} XP</span>
          </div>
          <div className="h-2.5 bg-bull-bg rounded-full overflow-hidden border border-bull-line">
            <div className="h-full bg-gradient-to-r from-bull-lime to-emerald-400 transition-all duration-700" style={{ width: levelPct + '%' }} />
          </div>
        </div>
      </div>

      {/* MODULE CARDS - HORIZONTAL SCROLL */}
      <div className="relative flex items-center">
        <button
          onClick={() => scrollTracks('left')}
          aria-label="Scroll modules left"
          className="mr-3 shrink-0 w-10 h-10 rounded-full bg-bull-raised border border-bull-lime text-bull-lime hover:bg-bull-lime hover:text-bull-ink font-black flex items-center justify-center shadow-xl transition active:scale-95"
        >
          {'\u25c0'}
        </button>

        <div ref={trackRef} className="br-noscroll flex gap-4 overflow-x-auto py-2 px-1 flex-1 scroll-smooth">
          {initialTracks.map((track, idx) => {
            const unlocked = trackUnlocked(idx);
            const selected = trackId === track.id;
            const subs = (track.modules || []).flatMap((m) => m.submodules || []);
            const got = subs.filter((s) => done.includes(s.id)).length;
            const pct = subs.length ? (got / subs.length) * 100 : 0;
            return (
              <button
                key={track.id}
                disabled={!unlocked}
                onClick={() => {
                  setTrackId(selected ? null : track.id);
                }}
                className={'text-left p-5 rounded-3xl border transition-all duration-300 flex flex-col justify-between min-h-[190px] min-w-[260px] sm:min-w-[290px] max-w-[320px] shrink-0 ' +
                  (unlocked
                    ? selected
                      ? 'bg-gradient-to-br from-bull-raised to-bull-bg border-bull-lime scale-[1.02] shadow-[0_0_30px_rgba(163,230,53,0.25)]'
                      : 'bg-bull-surface border-bull-line hover:border-bull-lime/60 hover:scale-[1.02] cursor-pointer'
                    : 'bg-bull-surface/40 border-bull-line opacity-40 cursor-not-allowed')}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono font-black text-3xl text-bull-lime">{String(idx + 1).padStart(2, '0')}</span>
                    <span className="text-xl">{unlocked ? (pct === 100 ? '\ud83c\udfc6' : '\ud83d\ude80') : '\ud83d\udd12'}</span>
                  </div>
                  <h2 className="font-black text-base text-white leading-tight">{track.title}</h2>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-xs font-mono text-slate-400 mb-1">
                    <span>{got}/{subs.length} DONE</span>
                    <span>{Math.round(pct)}%</span>
                  </div>
                  <div className="h-1.5 bg-bull-bg rounded-full overflow-hidden">
                    <div className="h-full bg-bull-lime transition-all duration-700" style={{ width: pct + '%' }} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => scrollTracks('right')}
          aria-label="Scroll modules right"
          className="ml-3 shrink-0 w-10 h-10 rounded-full bg-bull-raised border border-bull-lime text-bull-lime hover:bg-bull-lime hover:text-bull-ink font-black flex items-center justify-center shadow-xl transition active:scale-95"
        >
          {'\u25b6'}
        </button>
      </div>

      {/* LESSON MAP (GRID) */}
      {activeTrack && (
        <section className="bg-bull-surface p-5 sm:p-8 rounded-3xl border border-bull-lime/30 space-y-6 br-slide">
          <div className="flex justify-between items-center border-b border-bull-line pb-4">
            <h2 className="font-black text-xl sm:text-2xl text-white">{activeTrack.title}</h2>
            <button onClick={() => setTrackId(null)} className="text-xs font-black text-slate-400 hover:text-white bg-bull-raised border border-bull-line px-3 py-1.5 rounded-xl font-mono">
              {'\u2715'} CLOSE
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(activeTrack.modules || []).flatMap((m) => m.submodules || []).map((s, i) => {
              const open = lessonUnlocked(s.id);
              const ok = done.includes(s.id);
              return (
                <button
                  key={s.id}
                  disabled={!open}
                  onClick={() => openLesson(s)}
                  className={'text-left p-4 rounded-2xl border transition-all flex gap-3 items-start ' +
                    (open
                      ? ok
                        ? 'bg-emerald-50 border-emerald-500 hover:border-emerald-600'
                        : 'bg-bull-raised border-bull-line hover:border-bull-lime hover:scale-[1.02]'
                      : 'bg-bull-surface/40 border-bull-line/40 opacity-30 cursor-not-allowed')}
                >
                  <div className={'h-9 w-9 shrink-0 rounded-xl flex items-center justify-center font-mono font-black text-sm ' +
                    (ok ? 'bg-emerald-500 text-bull-ink' : open ? 'bg-bull-lime text-bull-ink br-glow' : 'bg-bull-bg text-slate-600')}>
                    {ok ? '\u2713' : open ? i + 1 : '\ud83d\udd12'}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-black text-sm text-[#0f172a] leading-tight">{s.title.replace(/^\d+\.\s*/, '')}</h4>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2">{s.intro}</p>
                    <span className="text-xs font-mono font-black text-amber-600 mt-1.5 block">{ok ? 'PASSED' : '+100 XP'}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* LESSON PLAYER */}
      {lesson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xl bg-bull-bg/90">
          {result && result.passed && <Confetti />}
          <div className="bg-bull-surface border border-bull-lime/50 rounded-3xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh] shadow-[0_0_60px_rgba(163,230,53,0.2)] br-slide relative">
            {xpPop && (
              <div className="br-float absolute right-8 top-16 z-10 font-mono font-black text-amber-400 text-2xl">+100 XP</div>
            )}

            {/* header */}
            <div className="px-5 pt-4 pb-3 bg-bull-raised border-b border-bull-line">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-xs font-black uppercase text-bull-lime tracking-widest font-mono">
                    {mode === 'read' ? 'STORY MODE' : 'QUIZ MODE'}
                  </span>
                  <h3 className="font-black text-base sm:text-lg text-white leading-tight truncate">{lesson.title}</h3>
                </div>
                <button onClick={closeLesson} className="h-9 w-9 shrink-0 rounded-xl bg-bull-surface border border-bull-line text-slate-400 hover:text-white font-black">
                  {'\u2715'}
                </button>
              </div>
              <div className="h-1.5 mt-3 bg-bull-bg rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-bull-lime to-emerald-400 transition-all duration-500"
                  style={{
                    width:
                      (mode === 'read'
                        ? ((card + 1) / Math.max(blocks.length, 1)) * 50
                        : 50 + ((result ? quiz.length : qIdx) / Math.max(quiz.length, 1)) * 50) + '%',
                  }}
                />
              </div>
            </div>

            {/* body */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
              {mode === 'read' && blocks[card] && (() => {
                const b = blocks[card];
                const st = KIND[b.kind];
                return (
                  <div key={card} className={'br-slide rounded-3xl border p-5 sm:p-6 space-y-4 ' + st.box}>
                    <div className="flex items-center gap-3">
                      <Mascot mood={card === 0 && lesson.mascot ? lesson.mascot : MOOD_BY_KIND[b.kind]} size={72} fallback={st.icon} />
                      <div>
                        <div className={'font-mono font-black uppercase tracking-widest ' + (b.head.toUpperCase() === st.label.toUpperCase() ? 'text-base sm:text-xl text-[#0f172a]' : 'text-xs opacity-70')}>{st.label}</div>
                        {b.head.toUpperCase() !== st.label.toUpperCase() && (
                          <h4 className="text-[#0f172a] font-black text-base sm:text-xl leading-tight">{b.head}</h4>
                        )}
                      </div>
                    </div>
                    <CardBody lines={b.body} big={b.kind === 'wow' || b.kind === 'takeaway'} />
                  </div>
                );
              })()}

              {mode === 'quiz' && !result && quiz[qIdx] && (
                <div key={qIdx} className="br-slide space-y-4">
                  <div className="flex items-center justify-between font-mono text-xs font-black uppercase tracking-widest text-slate-600">
                    <span>QUESTION {qIdx + 1} / {quiz.length}</span>
                    <span className="text-amber-700">{Object.keys(answers).length} ANSWERED</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Mascot mood="encouraging" size={56} fallback={'\ud83d\udc02'} />
                    <h4 className="text-[#0f172a] font-black text-base sm:text-lg leading-snug">{quiz[qIdx].question}</h4>
                  </div>
                  <div className="space-y-2.5">
                    {quiz[qIdx].options.map((opt, oi) => {
                      const sel = answers[qIdx] === oi;
                      return (
                        <button
                          key={oi}
                          onClick={() => setAnswers((p) => ({ ...p, [qIdx]: oi }))}
                          className={'w-full text-left p-3.5 rounded-2xl border text-sm flex items-center gap-3 transition-all ' +
                            (sel
                              ? 'bg-lime-200 border-lime-500 text-[#0f172a] font-bold scale-[1.01] shadow-md'
                              : 'bg-white border-slate-300 text-[#1e293b] hover:border-lime-500')}
                        >
                          <span className={'h-7 w-7 shrink-0 rounded-lg flex items-center justify-center font-mono font-black text-xs ' + (sel ? 'bg-lime-500 text-[#0f172a]' : 'bg-slate-200 text-slate-600')}>
                            {String.fromCharCode(65 + oi)}
                          </span>
                          <span>{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                  {err && <p className="text-xs text-rose-600 font-bold">{err}</p>}
                </div>
              )}

              {mode === 'quiz' && result && (
                <div className="space-y-5 br-slide">
                  <div className="text-center space-y-2 py-2">
                    <div className="flex justify-center"><Mascot mood={result.passed ? (result.correctCount === quiz.length ? 'trophy' : 'celebrating') : 'oops'} size={140} fallback={result.passed ? '\ud83c\udfc6' : '\ud83d\udcaa'} /></div>
                    <h4 className="text-[#0f172a] font-black text-2xl">{result.passed ? 'MISSION COMPLETE!' : 'So close! Try again.'}</h4>
                    <p className="font-mono text-sm text-slate-700">
                      Score: <span className="font-black text-lime-700">{result.correctCount} / {quiz.length}</span> (need {result.needed})
                    </p>
                    {result.passed && <p className="font-mono font-black text-amber-600">+100 XP {'\ud83d\udd25'}</p>}
                  </div>
                  <div className="space-y-3">
                    {quiz.map((q, qi) => {
                      const r = result.results[qi];
                      return (
                        <div key={qi} className={'p-4 rounded-2xl border space-y-2 ' + (r.correct ? 'bg-emerald-50 border-emerald-500' : 'bg-rose-50 border-rose-400')}>
                          <p className="text-sm font-bold text-[#0f172a]">{r.correct ? '\u2705' : '\u274c'} {qi + 1}. {q.question}</p>
                          <p className="text-xs text-slate-700">
                            Answer: <span className="font-black text-emerald-700">{q.options[r.correctIndex]}</span>
                          </p>
                          <p className="text-xs text-slate-600 leading-relaxed">{'\ud83d\udca1'} {r.explanation}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* footer */}
            <div className="p-4 border-t border-bull-line bg-bull-raised">
              {mode === 'read' && (
                <div className="space-y-3">
                  <div className="flex justify-center gap-1.5">
                    {blocks.map((_, i) => (
                      <button key={i} onClick={() => setCard(i)} aria-label={'Card ' + (i + 1)} className={'h-2 rounded-full transition-all ' + (i === card ? 'w-6 bg-bull-lime' : 'w-2 bg-bull-line')} />
                    ))}
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setCard(Math.max(0, card - 1))}
                      disabled={card === 0}
                      className="px-5 py-3 rounded-2xl border border-bull-line bg-bull-surface text-slate-300 font-mono font-bold text-xs disabled:opacity-30"
                    >
                      {'\u2190'} BACK
                    </button>
                    {card < blocks.length - 1 ? (
                      <button onClick={() => setCard(card + 1)} className="flex-1 py-3 rounded-2xl bg-bull-lime text-bull-ink font-black text-xs uppercase tracking-wider font-mono active:scale-95 transition">
                        NEXT {'\u2192'}
                      </button>
                    ) : (
                      <button onClick={() => { setMode('quiz'); setQIdx(0); }} className="flex-1 py-3 rounded-2xl bg-emerald-500 text-bull-ink font-black text-xs uppercase tracking-wider font-mono active:scale-95 transition br-glow">
                        {'\ud83c\udfaf'} START QUIZ ({quiz.length} QUESTIONS)
                      </button>
                    )}
                  </div>
                </div>
              )}

              {mode === 'quiz' && !result && (
                <div className="flex gap-3">
                  <button
                    onClick={() => (qIdx === 0 ? setMode('read') : setQIdx(qIdx - 1))}
                    className="px-5 py-3 rounded-2xl border border-bull-line bg-bull-surface text-slate-300 font-mono font-bold text-xs"
                  >
                    {'\u2190'} BACK
                  </button>
                  {qIdx < quiz.length - 1 ? (
                    <button
                      onClick={() => setQIdx(qIdx + 1)}
                      disabled={answers[qIdx] === undefined}
                      className="flex-1 py-3 rounded-2xl bg-bull-lime text-bull-ink font-black text-xs uppercase tracking-wider font-mono disabled:opacity-30 active:scale-95 transition"
                    >
                      NEXT {'\u2192'}
                    </button>
                  ) : (
                    <button
                      onClick={submitQuiz}
                      disabled={!answeredAll || checking}
                      className="flex-1 py-3 rounded-2xl bg-emerald-500 text-bull-ink font-black text-xs uppercase tracking-wider font-mono disabled:opacity-30 active:scale-95 transition"
                    >
                      {checking ? 'CHECKING...' : '\u26a1 SUBMIT & CLAIM XP'}
                    </button>
                  )}
                </div>
              )}

              {mode === 'quiz' && result && (
                <div className="flex gap-3">
                  {result.passed ? (
                    <>
                      <button onClick={closeLesson} className="px-5 py-3 rounded-2xl border border-bull-line bg-bull-surface text-slate-300 font-mono font-bold text-xs">
                        CLOSE
                      </button>
                      <button
                        onClick={() => (nextLessonObj ? openLesson(nextLessonObj) : closeLesson())}
                        className="flex-1 py-3 rounded-2xl bg-bull-lime text-bull-ink font-black text-xs uppercase tracking-wider font-mono active:scale-95 transition"
                      >
                        {nextLessonObj ? 'NEXT LESSON \u2192' : 'FINISH'}
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => { setMode('read'); setCard(0); restartQuiz(); }} className="px-5 py-3 rounded-2xl border border-bull-line bg-bull-surface text-slate-300 font-mono font-bold text-xs">
                        RE-READ
                      </button>
                      <button onClick={restartQuiz} className="flex-1 py-3 rounded-2xl bg-bull-lime text-bull-ink font-black text-xs uppercase tracking-wider font-mono active:scale-95 transition">
                        {'\ud83d\udd01'} RETRY QUIZ
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
