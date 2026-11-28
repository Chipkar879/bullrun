'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import Mascot from '@/components/Mascot';

const STORE_PREFIX = 'bullrun_progress_v3_';
let storeKey = STORE_PREFIX + 'guest';

// XP plan: every module is worth exactly 1200 XP (12 modules x 1200 = 14,400 XP in total).
// Early lessons in a module are easier, so they give less XP. The last lessons are the hardest and give the most.
const MODULE_XP = 1200;
const LESSON_XP_12 = [70, 75, 80, 85, 90, 95, 100, 105, 110, 120, 130, 140];

function lessonXpTable(n) {
  if (n === 12) return LESSON_XP_12;
  if (n <= 0) return [];
  const raw = Array.from({ length: n }).map((_, i) => 0.6 + 0.8 * (n > 1 ? i / (n - 1) : 0.5));
  const sum = raw.reduce((a, b) => a + b, 0);
  const out = raw.map((r) => Math.max(5, Math.round((r * MODULE_XP) / sum / 5) * 5));
  out[n - 1] += MODULE_XP - out.reduce((a, b) => a + b, 0);
  return out;
}

// Levels: each one needs more XP than the one before. "min" is the total XP needed to reach it.
const LEVELS = [
  { name: 'Rookie Saver', min: 0 },
  { name: 'Smart Spender', min: 500 },
  { name: 'Market Explorer', min: 1000 },
  { name: 'Strategy Builder', min: 1700 },
  { name: 'Chart Reader', min: 2500 },
  { name: 'Value Hunter', min: 3500 },
  { name: 'Portfolio Pilot', min: 4700 },
  { name: 'Risk Manager', min: 6000 },
  { name: 'Wall Street Architect', min: 7500 },
  { name: 'Market Strategist', min: 9200 },
  { name: 'Money Mentor', min: 11000 },
  { name: 'Bull Run Master', min: 12800 },
  { name: 'Bull Run Legend', min: 14400 },
];

const CSS = `
@keyframes brFall{0%{transform:translateY(-10vh) rotate(0);opacity:1}100%{transform:translateY(110vh) rotate(540deg);opacity:0}}
@keyframes brSlide{from{opacity:0;transform:translateX(24px) scale(.98)}to{opacity:1;transform:none}}
@keyframes brPop{0%{transform:scale(.5);opacity:0}60%{transform:scale(1.2)}100%{transform:scale(1);opacity:1}}
@keyframes brFloat{0%{transform:translateY(0);opacity:1}100%{transform:translateY(-80px);opacity:0}}
@keyframes brGlow{0%,100%{box-shadow:0 0 0 0 rgba(163,230,53,0)}50%{box-shadow:0 0 28px 2px rgba(163,230,53,.35)}}
@keyframes brHop{0%{transform:translateY(36px) scale(.55) rotate(-10deg);opacity:0}55%{transform:translateY(-16px) scale(1.1) rotate(5deg);opacity:1}78%{transform:translateY(4px) scale(.97)}100%{transform:none;opacity:1}}
@keyframes brTalk{0%,100%{transform:translateY(0) rotate(0)}25%{transform:translateY(-5px) rotate(-3deg)}50%{transform:translateY(0) rotate(0)}75%{transform:translateY(-3px) rotate(3deg)}}
@keyframes brIdle{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-4px) scale(1.02)}}
@keyframes brBubble{0%{opacity:0;transform:scale(.7) translateX(-14px)}70%{transform:scale(1.04) translateX(0)}100%{opacity:1;transform:none}}
@keyframes brMsg{0%{opacity:0;transform:translateY(14px) scale(.94)}70%{transform:translateY(-2px) scale(1.01)}100%{opacity:1;transform:none}}
@keyframes brDots{0%,80%,100%{transform:translateY(0);opacity:.35}40%{transform:translateY(-5px);opacity:1}}
@keyframes brSpark{0%{transform:scale(0) rotate(0);opacity:0}50%{transform:scale(1.2) rotate(20deg);opacity:1}100%{transform:scale(0) rotate(60deg);opacity:0}}
.br-fall{position:fixed;top:0;animation-name:brFall;animation-timing-function:linear;animation-fill-mode:forwards}
.br-slide{animation:brSlide .35s ease-out}
.br-pop{display:inline-block;animation:brPop .5s ease-out}
.br-float{animation:brFloat 1.8s ease-out forwards}
.br-glow{animation:brGlow 2.2s ease-in-out infinite}
.br-hop{display:inline-block;animation:brHop .7s cubic-bezier(.34,1.56,.64,1) both}
.br-talk{display:inline-block;animation:brTalk .55s ease-in-out infinite}
.br-idle{display:inline-block;animation:brIdle 2.4s ease-in-out infinite}
.br-bubble{animation:brBubble .45s ease-out .35s both}
.br-msg{animation:brMsg .4s cubic-bezier(.34,1.56,.64,1) both}
.br-dot{display:inline-block;width:7px;height:7px;border-radius:9999px;background:currentColor;animation:brDots 1s infinite}
.br-spark{animation:brSpark 1.6s ease-in-out infinite}
.br-noscroll{scrollbar-width:none;-ms-overflow-style:none}
.br-noscroll::-webkit-scrollbar{display:none}
`;

const KIND = {
  mission:  { icon: '\ud83d\ude80', label: 'Mission Briefing', box: 'bg-gradient-to-br from-bull-raised to-bull-bg border-bull-lime/50 text-slate-200' },
  intel:    { icon: '\u26a1',       label: 'Financial Intel',  box: 'bg-bull-surface border-bull-line text-slate-200' },
  wow:      { icon: '\ud83e\udd2f', label: 'Wow Fact',         box: 'bg-gradient-to-br from-[#f5d0fe] to-[#e9d5ff] border-fuchsia-500 text-[#4a044e] shadow-md' },
  try:      { icon: '\ud83e\uddea', label: 'Try It',           box: 'bg-gradient-to-br from-[#bae6fd] to-[#e0f2fe] border-sky-500 text-[#0c4a6e] shadow-md' },
  case:     { icon: '\ud83c\udf55', label: 'Mini Case',        box: 'bg-gradient-to-br from-amber-950/50 to-bull-bg border-amber-500/50 text-amber-100' },
  takeaway: { icon: '\ud83d\udca1', label: 'Core Takeaway',    box: 'bg-gradient-to-br from-emerald-950/60 to-bull-bg border-emerald-500/60 text-emerald-100' },
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
// with a "mascot" field in the JSON (used on the first card). Without one, Bulzo waves hello.
const MOOD_BY_KIND = { mission: 'curious', intel: 'explaining', wow: 'excited', try: 'thinking', case: 'curious', takeaway: 'proud' };

// Bulzo opens every lesson with one of these (picked from the lesson id, so it stays the same on reload).
const INTROS = [
  'Hey! Bulzo here. Let me break this down for you. \ud83d\udc02',
  'Ready for a mission? I will explain it step by step.',
  'New lesson unlocked! I will make it super easy.',
  'Psst... this is simpler than it looks. Watch!',
];

// Fixed title colours so dark mode cannot turn them white.
const TITLE_COLOR = { wow: '#4a044e', try: '#0c4a6e' };
const LIGHT_BUBBLE = { background: 'rgba(255,255,255,0.72)', borderColor: 'rgba(0,0,0,0.12)' };

function Confetti({ count = 36 }) {
  const bits = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.8,
        dur: 2 + Math.random() * 1.6,
        size: 14 + Math.random() * 16,
        ch: ['\ud83c\udf89', '\u2728', '\u26a1', '\ud83d\udcb0', '\ud83d\udd25'][i % 5],
      })),
    [count]
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

// One chat message from Bulzo
function Msg({ line, big }) {
  const isBullet = line.charAt(0) === '\u2022' || /^\d+\.\s/.test(line);
  return (
    <div className="br-msg flex items-start gap-2.5 bg-bull-bg/70 border border-bull-line rounded-2xl rounded-tl-md p-3 text-slate-100">
      {isBullet && <span className="text-bull-lime font-black font-mono">{'\u27a4'}</span>}
      <span className={(big ? 'text-base sm:text-lg font-bold ' : 'text-sm font-medium ') + 'leading-relaxed'}>
        {line.replace(/^[\u2022]\s*/, '')}
      </span>
    </div>
  );
}

function Typing() {
  return (
    <div className="br-msg inline-flex items-center gap-1.5 bg-bull-bg/70 border border-bull-line rounded-2xl rounded-tl-md px-4 py-3 text-slate-400" aria-label="Bulzo is typing">
      <span className="br-dot" />
      <span className="br-dot" style={{ animationDelay: '.15s' }} />
      <span className="br-dot" style={{ animationDelay: '.3s' }} />
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
  const [shown, setShown] = useState(0);
  const [replay, setReplay] = useState(0);
  const [react, setReact] = useState(null);
  const [small, setSmall] = useState(false);
  const [simple, setSimple] = useState({});
  const [explaining, setExplaining] = useState(false);
  const touchX = useRef(null);
  const trackRef = useRef(null);
  const bodyRef = useRef(null);
  const reducedRef = useRef(false);
  const gridRef = useRef(null);

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

  // Phone size and reduced-motion preference
  useEffect(() => {
    const narrow = window.matchMedia('(max-width: 640px)');
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      setSmall(narrow.matches);
      reducedRef.current = calm.matches;
    };
    update();
    narrow.addEventListener('change', update);
    return () => narrow.removeEventListener('change', update);
  }, []);

  // When a module opens, glide down to its lessons
  useEffect(() => {
    if (!trackId) return undefined;
    const t = setTimeout(() => {
      if (gridRef.current) gridRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
    return () => clearTimeout(t);
  }, [trackId]);

  const scrollTracks = (dir) => {
    if (trackRef.current) {
      trackRef.current.scrollBy({ left: dir === 'left' ? -320 : 320, behavior: 'smooth' });
    }
  };

  const allLessons = initialTracks.flatMap((t) => (t.modules || []).flatMap((m) => m.submodules || []));

  // XP for every lesson, worked out per module so each module adds up to exactly 1200 XP
  const xpByLesson = useMemo(() => {
    const map = {};
    initialTracks.forEach((track) => {
      (track.modules || []).forEach((m) => {
        const subs = m.submodules || [];
        const table = lessonXpTable(subs.length);
        subs.forEach((s, i) => { map[s.id] = table[i]; });
      });
    });
    return map;
  }, [initialTracks]);
  const xpFor = (id) => xpByLesson[id] || 0;

  const xp = done.reduce((sum, id) => sum + xpFor(id), 0);
  let levelIdx = 0;
  for (let i = 0; i < LEVELS.length; i += 1) {
    if (xp >= LEVELS[i].min) levelIdx = i;
  }
  const curLevel = LEVELS[levelIdx];
  const nextLevel = LEVELS[levelIdx + 1] || null;
  const levelName = curLevel.name;
  const levelPct = nextLevel ? ((xp - curLevel.min) / (nextLevel.min - curLevel.min)) * 100 : 100;

  const activeTrack = initialTracks.find((t) => t.id === trackId);
  const blocks = useMemo(() => parseBlocks(lesson ? lesson.content : ''), [lesson]);

  // The messages Bulzo says on the current card (the first card starts with a greeting)
  const curLines = useMemo(() => {
    const b = blocks[card];
    if (!b) return [];
    const sKey = lesson ? lesson.id + ':' + card : '';
    if (simple[sKey]) {
      const hasBullets = b.body.some((l) => l.charAt(0) === '\u2022');
      return simple[sKey].map((l) => (hasBullets && l.charAt(0) !== '\u2022' ? '\u2022 ' + l : l));
    }
    if (card === 0 && lesson) {
      let h = 0;
      for (let i = 0; i < lesson.id.length; i += 1) h = (h * 31 + lesson.id.charCodeAt(i)) % 997;
      return [INTROS[h % INTROS.length]].concat(b.body);
    }
    return b.body;
  }, [blocks, card, lesson, simple]);

  const total = curLines.length;
  const allShown = shown >= total;
  const skipAll = () => { if (explaining) return; setShown((s) => Math.max(s, total)); };

  // Bulzo "types" the messages one by one
  useEffect(() => {
    if (!lesson || mode !== 'read') return undefined;
    const list = curLines;
    if (reducedRef.current || list.length === 0) {
      setShown(list.length);
      return undefined;
    }
    setShown(0);
    let i = 0;
    let t = null;
    const step = () => {
      const len = String(list[i] || '').length;
      t = setTimeout(() => {
        i += 1;
        setShown((s) => Math.max(s, i));
        if (i < list.length) step();
      }, 450 + Math.min(len * 6, 650));
    };
    const start = setTimeout(step, 650);
    return () => {
      clearTimeout(start);
      if (t) clearTimeout(t);
    };
  }, [lesson, mode, card, replay, curLines]);

  // Keep the newest message in view
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    if (shown === 0) el.scrollTop = 0;
    else el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [shown, card, mode, qIdx]);

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
    setReact(null);
    setShown(0);
  };

  const closeLesson = () => setLesson(null);

  const restartQuiz = () => {
    setAnswers({});
    setResult(null);
    setQIdx(0);
    setErr('');
  };

  // First tap finishes the typing, the next tap moves on
  const goNext = () => {
    if (!allShown) {
      skipAll();
      return;
    }
    if (card < blocks.length - 1) setCard(card + 1);
    else {
      setMode('quiz');
      setQIdx(0);
    }
  };

  const onReact = async (kind) => {
    if (!lesson || explaining) return;
    if (kind === 'got') { goNext(); return; }
    const key = lesson.id + ':' + card;
    const src = simple[key] || blocks[card].body;
    setExplaining(true);
    setShown(0);
    setReact({ lessonId: lesson.id, card, mood: 'thinking', say: 'Hmm, let me think of an easier way...' });
    if (bodyRef.current) bodyRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    const started = Date.now();
    let fresh = null;
    try {
      const headers = await authHeaders();
      if (headers) {
        const res = await fetch('/api/explain-again', {
          method: 'POST',
          headers,
          body: JSON.stringify({ title: lesson.title, head: blocks[card].head, lines: src }),
        });
        if (res.ok) {
          const d = await res.json();
          if (Array.isArray(d.lines) && d.lines.length) fresh = d.lines;
        }
      }
    } catch (err2) { /* fall back to replaying the same card */ }
    const wait = 1400 - (Date.now() - started);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    if (fresh) setSimple((p) => ({ ...p, [key]: fresh }));
    setReact({ lessonId: lesson.id, card, mood: 'encouraging', say: 'Okay, here is the easy version! \ud83d\udd01' });
    setExplaining(false);
    setReplay((r) => r + 1);
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
    if (touchX.current === null || mode !== 'read') return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (dx < -50) goNext();
    if (dx > 50 && card > 0) setCard(card - 1);
  };

  const quiz = lesson && lesson.quiz ? lesson.quiz : [];
  const answeredAll = quiz.length > 0 && Object.keys(answers).length >= quiz.length;
  const nextLessonObj = lesson ? allLessons[allLessons.findIndex((s) => s.id === lesson.id) + 1] : null;

  const curBlock = blocks[card] || null;
  const rx = react && lesson && react.lessonId === lesson.id && react.card === card ? react : null;
  const takeawayDone = mode === 'read' && curBlock && curBlock.kind === 'takeaway' && allShown;
  const mascotSize = small ? 92 : 128;
  const lastCard = card >= blocks.length - 1;

  return (
    <div className="space-y-8 relative antialiased font-sans">
      <style>{CSS}</style>

      {/* PLAYER CARD */}
      <div className="bg-gradient-to-r from-bull-surface via-bull-raised to-bull-surface border border-bull-line p-5 rounded-3xl shadow-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-bull-bg border border-bull-lime/50 flex items-center justify-center text-2xl br-glow"><Mascot mood="cool" size={40} fallback={'\ud83d\udc02'} /></div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white">{levelName}</h3>
              <span className="text-xs font-mono text-slate-500">LEVEL {levelIdx + 1} / {LEVELS.length}</span>
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
            <span>{nextLevel ? 'NEXT: ' + nextLevel.name.toUpperCase() : 'MAX LEVEL'}</span>
            <span>{nextLevel ? (xp - curLevel.min) + ' / ' + (nextLevel.min - curLevel.min) + ' XP' : xp + ' XP'}</span>
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
        <section ref={gridRef} className="scroll-mt-4 bg-bull-surface p-5 sm:p-8 rounded-3xl border border-bull-lime/30 space-y-6 br-slide">
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
                        ? 'bg-emerald-950/20 border-emerald-800/60 hover:border-emerald-500'
                        : 'bg-bull-raised border-bull-line hover:border-bull-lime hover:scale-[1.02]'
                      : 'bg-bull-surface/40 border-bull-line/40 opacity-30 cursor-not-allowed')}
                >
                  <div className={'h-9 w-9 shrink-0 rounded-xl flex items-center justify-center font-mono font-black text-sm ' +
                    (ok ? 'bg-emerald-500 text-bull-ink' : open ? 'bg-bull-lime text-bull-ink br-glow' : 'bg-bull-bg text-slate-600')}>
                    {ok ? '\u2713' : open ? i + 1 : '\ud83d\udd12'}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-black text-sm text-white leading-tight">{s.title.replace(/^\d+\.\s*/, '')}</h4>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{s.intro}</p>
                    <span className="text-xs font-mono font-black text-amber-400 mt-1.5 block">{ok ? 'PASSED' : '+' + xpFor(s.id) + ' XP'}</span>
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
          {takeawayDone && <Confetti key={lesson.id + '-t'} count={24} />}
          <div className="bg-bull-surface border border-bull-lime/50 rounded-3xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh] shadow-[0_0_60px_rgba(163,230,53,0.2)] br-slide relative">
            {xpPop && (
              <div className="br-float absolute right-8 top-16 z-10 font-mono font-black text-amber-400 text-2xl">+{xpFor(lesson.id)} XP</div>
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
                <button onClick={closeLesson} aria-label="Close lesson" className="h-9 w-9 shrink-0 rounded-xl bg-bull-surface border border-bull-line text-slate-400 hover:text-white font-black">
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
            <div ref={bodyRef} className="p-4 sm:p-6 overflow-y-auto flex-1" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
              {mode === 'read' && curBlock && (() => {
                const b = curBlock;
                const st = KIND[b.kind];
                const light = b.kind === 'wow' || b.kind === 'try';
                const mood = rx
                  ? rx.mood
                  : card === 0
                    ? (lesson.mascot || 'hello')
                    : MOOD_BY_KIND[b.kind];
                const sparkle = (b.kind === 'wow' || b.kind === 'takeaway') && allShown;
                const bubbleCls = light ? '' : ' bg-bull-bg/70 border-bull-line text-slate-100';
                return (
                  <div
                    key={lesson.id + '-' + card + '-' + replay}
                    onClick={() => { if (!allShown) skipAll(); }}
                    role="log"
                    aria-live="polite"
                    className={'br-slide rounded-3xl border p-4 sm:p-6 space-y-4 ' + st.box}
                  >
                    {/* Bulzo and his title bubble */}
                    <div className="flex items-end gap-3 sm:gap-4">
                      <div className="relative shrink-0">
                        <span className="br-hop">
                          <span className={allShown ? 'br-idle' : 'br-talk'}>
                            <Mascot key={mood} mood={mood} size={mascotSize} fallback={st.icon} eager />
                          </span>
                        </span>
                        <span aria-hidden="true" className="block mx-auto mt-0.5 h-2 w-14 rounded-full bg-black/20 blur-[2px]" />
                        {sparkle && (
                          <>
                            <span aria-hidden="true" className="br-spark absolute -top-1 -right-1 text-lg">{'\u2728'}</span>
                            <span aria-hidden="true" className="br-spark absolute top-8 -left-2 text-base" style={{ animationDelay: '.5s' }}>{'\u2b50'}</span>
                          </>
                        )}
                      </div>
                      <div
                        className={'br-bubble relative flex-1 min-w-0 rounded-2xl rounded-bl-md border px-4 py-3' + bubbleCls}
                        style={light ? { ...LIGHT_BUBBLE, color: TITLE_COLOR[b.kind] } : undefined}
                      >
                        <span
                          aria-hidden="true"
                          className={'absolute -left-1.5 bottom-5 h-3 w-3 rotate-45 border-b border-l' + (light ? '' : ' bg-bull-bg/70 border-bull-line')}
                          style={light ? LIGHT_BUBBLE : undefined}
                        />
                        <div className="text-xs font-mono font-black uppercase tracking-widest opacity-70">{st.label}</div>
                        <h4 className={'font-black text-base sm:text-xl leading-tight' + (light ? '' : ' text-white')}>{b.head}</h4>
                        {rx && <p className="mt-1.5 text-sm font-bold">{rx.say}</p>}
                      </div>
                    </div>

                    {/* Bulzo's messages */}
                    <div className="space-y-2.5">
                      {curLines.slice(0, shown).map((l, i) => (
                        <Msg key={i} line={l} big={(b.kind === 'wow' || b.kind === 'takeaway') && !(card === 0 && i === 0)} />
                      ))}
                      {!allShown && <Typing />}
                    </div>

                    {/* Reactions */}
                    {allShown && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {[
                          ['got', '\ud83d\udc4d Got it', 0],
                          ['again', '\ud83e\udd14 Explain again', 0.16],
                        ].map(([k, label, delay]) => (
                          <button
                            key={k}
                            onClick={(e) => { e.stopPropagation(); onReact(k); }}
                            className="br-msg px-3.5 py-2 rounded-full border border-bull-line bg-bull-surface text-slate-100 text-xs font-black hover:border-bull-lime/60 active:scale-95 transition"
                            style={{ animationDelay: delay + 's' }}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {mode === 'quiz' && !result && quiz[qIdx] && (
                <div key={qIdx} className="space-y-4">
                  <div className="flex items-center justify-between font-mono text-xs font-black uppercase tracking-widest text-slate-400">
                    <span>QUESTION {qIdx + 1} / {quiz.length}</span>
                    <span className="text-amber-400">{Object.keys(answers).length} ANSWERED</span>
                  </div>
                  <div className="flex items-end gap-3">
                    <div className="relative shrink-0">
                      <span className="br-hop">
                        <span className="br-idle">
                          <Mascot key={answers[qIdx] === undefined ? 'thinking' : 'cool'} mood={answers[qIdx] === undefined ? 'thinking' : 'cool'} size={small ? 84 : 108} fallback={'\ud83d\udc02'} eager />
                        </span>
                      </span>
                      <span aria-hidden="true" className="block mx-auto mt-0.5 h-2 w-12 rounded-full bg-black/20 blur-[2px]" />
                    </div>
                    <div className="br-bubble relative flex-1 min-w-0 rounded-2xl rounded-bl-md border border-bull-line bg-bull-raised px-4 py-3">
                      <span aria-hidden="true" className="absolute -left-1.5 bottom-5 h-3 w-3 rotate-45 border-b border-l border-bull-line bg-bull-raised" />
                      <h4 className="text-white font-black text-base sm:text-lg leading-snug">{quiz[qIdx].question}</h4>
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    {quiz[qIdx].options.map((opt, oi) => {
                      const sel = answers[qIdx] === oi;
                      return (
                        <button
                          key={oi}
                          onClick={() => setAnswers((p) => ({ ...p, [qIdx]: oi }))}
                          className={'br-msg w-full text-left p-3.5 rounded-2xl border text-sm flex items-center gap-3 transition-all ' +
                            (sel
                              ? 'bg-bull-lime/20 border-bull-lime text-white font-bold scale-[1.01]'
                              : 'bg-bull-raised border-bull-line text-slate-300 hover:border-bull-lime/60')}
                          style={{ animationDelay: (0.35 + oi * 0.08) + 's' }}
                        >
                          <span className={'h-7 w-7 shrink-0 rounded-lg flex items-center justify-center font-mono font-black text-xs ' + (sel ? 'bg-bull-lime text-bull-ink' : 'bg-bull-bg text-slate-400')}>
                            {String.fromCharCode(65 + oi)}
                          </span>
                          <span>{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                  {err && <p className="text-xs text-rose-400 font-bold">{err}</p>}
                </div>
              )}

              {mode === 'quiz' && result && (
                <div className="space-y-5 br-slide">
                  <div className="text-center space-y-2 py-2">
                    <div className="flex justify-center">
                      <span className="br-hop">
                        <Mascot mood={result.passed ? (result.correctCount === quiz.length ? 'trophy' : 'celebrating') : 'oops'} size={small ? 120 : 150} fallback={result.passed ? '\ud83c\udfc6' : '\ud83d\udcaa'} eager />
                      </span>
                    </div>
                    <h4 className="text-white font-black text-2xl">{result.passed ? 'MISSION COMPLETE!' : 'So close! Try again.'}</h4>
                    <p className="font-mono text-sm text-slate-300">
                      Score: <span className="font-black text-bull-lime">{result.correctCount} / {quiz.length}</span> (need {result.needed})
                    </p>
                    {result.passed && <p className="font-mono font-black text-amber-400">+{xpFor(lesson.id)} XP {'\ud83d\udd25'}</p>}
                  </div>
                  <div className="space-y-3">
                    {quiz.map((q, qi) => {
                      const r = result.results[qi];
                      return (
                        <div key={qi} className={'p-4 rounded-2xl border space-y-2 ' + (r.correct ? 'bg-emerald-950/30 border-emerald-700/60' : 'bg-rose-950/30 border-rose-700/60')}>
                          <p className="text-sm font-bold text-white">{r.correct ? '\u2705' : '\u274c'} {qi + 1}. {q.question}</p>
                          <p className="text-xs text-slate-300">
                            Answer: <span className="font-black text-emerald-300">{q.options[r.correctIndex]}</span>
                          </p>
                          <p className="text-xs text-slate-400 leading-relaxed">{'\ud83d\udca1'} {r.explanation}</p>
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
                    <button
                      onClick={goNext}
                      className={'flex-1 py-3 rounded-2xl text-bull-ink font-black text-xs uppercase tracking-wider font-mono active:scale-95 transition ' +
                        (allShown && lastCard ? 'bg-emerald-500 br-glow' : 'bg-bull-lime')}
                    >
                      {!allShown ? 'SKIP \u23e9' : lastCard ? '\ud83c\udfaf START QUIZ (' + quiz.length + ' QUESTIONS)' : 'NEXT \u2192'}
                    </button>
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