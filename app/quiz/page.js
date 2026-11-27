'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';

/* ---------- helpers ---------- */
const toLocalDateStr = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

const lastSevenDays = () => {
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push({
      key: toLocalDateStr(d),
      weekday: d.toLocaleDateString('en-IN', { weekday: 'short' }),
      day: d.getDate(),
      isToday: i === 0,
    });
  }
  return out;
};

/* ---------- growth candles built from the user's real history ---------- */
const GROWTH_DAYS = 14;

const buildGrowth = (rows, balance) => {
  const keys = [];
  for (let i = GROWTH_DAYS - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    keys.push({ key: toLocalDateStr(d), label: d.toLocaleDateString('en-IN', { weekday: 'narrow' }) });
  }

  const byDate = {};
  let total = 0;
  rows.forEach((r) => {
    byDate[r.quiz_date] = r.points || 0;
    total += r.points || 0;
  });

  let running = Math.max(0, balance - total);
  rows.forEach((r) => {
    if (r.quiz_date < keys[0].key) running += r.points || 0;
  });

  const raw = keys.map((k) => {
    const pts = byDate[k.key] || 0;
    const open = running;
    running += pts;
    return { ...k, pts, open, close: running };
  });

  // DAILY_BARS: bar height = that day's score, so a missed day is an empty slot
  const top = Math.max(15, ...raw.map((c) => c.pts));
  const step = 480 / GROWTH_DAYS;
  const candles = raw.map((c, i) => {
    const h = c.pts > 0 ? Math.max(4, (c.pts / top) * 140) : 0;
    return { ...c, x: 20 + i * step + step / 2, bodyTop: 170 - h, bodyHeight: h, wickTop: 170, wickBottom: 170, closeY: 170 - h };
  });

  return {
    candles,
    path: '',
    gained: raw[raw.length - 1].close - raw[0].open,
    balance: raw[raw.length - 1].close,
    hasData: rows.length > 0,
  };
};
const TICKER_ITEMS = [
  '📈 NIFTY 50', '💹 SENSEX', '🏦 Bull Run', '🪙 DIVIDEND', '📊 P/E RATIO', '🚀 IPO',
  '🛡️ DIVERSIFY', '⚡ T+1', '🧮 BETA', '💼 MUTUAL FUNDS', '🔔 BREAKOUT', '🏆 BULL RUN',
];

export default function DailyQuiz() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [userRank, setUserRank] = useState('Unranked');
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);
  const [hasPlayedToday, setHasPlayedToday] = useState(false);

  // Game states
  const [quizActive, setQuizActive] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [score, setScore] = useState(0);
  const [pointsEarned, setPointsEarned] = useState(0);

  // Power-ups
  const [powerUps, setPowerUps] = useState({ fiftyFifty: 1, freezeTime: 1, skipQuestion: 1 });
  const [hiddenOptions, setHiddenOptions] = useState([]);
  const [isTimerFrozen, setIsTimerFrozen] = useState(false);

  // Timer
  const [timeLeft, setTimeLeft] = useState(300);
  const [totalTimeSpent, setTotalTimeSpent] = useState(0);
  const timerRef = useRef(null);

  // Refs avoid stale closures when the quiz ends from a timer / timeout
  const scoreRef = useRef(0);
  const timeSpentRef = useRef(0);
  const endedRef = useRef(false);
  const profileRef = useRef(null);
  const userRef = useRef(null);
  const questionsLenRef = useRef(15);

  // Leaderboard + history
  const [showQuizLeaderboard, setShowQuizLeaderboard] = useState(false);
  const [quizLeaderboard, setQuizLeaderboard] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyRows, setHistoryRows] = useState([]);
  const [growthRows, setGrowthRows] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Countdown to next quiz
  const [nextQuizIn, setNextQuizIn] = useState('');

  useEffect(() => { profileRef.current = profile; }, [profile]);
  useEffect(() => { userRef.current = user; }, [user]);

  /* ---------- data fetchers ---------- */
  const fetchQuizLeaderboard = useCallback(async (currentUserId) => {
    const { data: topPlayers } = await supabase
      .from('profiles')
      .select('id, name, quiz_points, role')
      .order('quiz_points', { ascending: false, nullsFirst: false })
      .limit(10);
    setQuizLeaderboard(topPlayers || []);

    const { data: allRanks } = await supabase
      .from('profiles')
      .select('id, quiz_points')
      .order('quiz_points', { ascending: false, nullsFirst: false });

    if (allRanks && currentUserId) {
      const idx = allRanks.findIndex((p) => p.id === currentUserId);
      if (idx !== -1) setUserRank(idx + 1);
    }
  }, []);

  const fetchHistory = useCallback(async (uid) => {
    if (!uid) return;
    setHistoryLoading(true);
    const from = new Date();
    from.setDate(from.getDate() - 6);
    const { data } = await supabase
      .from('quiz_history')
      .select('quiz_date, score, total, points, time_spent')
      .eq('user_id', uid)
      .gte('quiz_date', toLocalDateStr(from))
      .order('quiz_date', { ascending: true });
    setHistoryRows(data || []);
    setHistoryLoading(false);
  }, []);

  const fetchGrowth = useCallback(async (uid) => {
    if (!uid) return;
    const { data } = await supabase
      .from('quiz_history')
      .select('quiz_date, points')
      .eq('user_id', uid)
      .order('quiz_date', { ascending: true });
    setGrowthRows(data || []);
  }, []);

  useEffect(() => {
    const fetchUserSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        setProfile(prof);
        if (prof?.last_quiz_date === toLocalDateStr()) setHasPlayedToday(true);
        await fetchQuizLeaderboard(session.user.id);
        await fetchGrowth(session.user.id);
      }
      setLoading(false);
    };
    fetchUserSession();
  }, [fetchQuizLeaderboard, fetchGrowth]);

  /* ---------- next-quiz countdown (until local midnight) ---------- */
  useEffect(() => {
    if (!hasPlayedToday || quizActive) return;
    const tick = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      const diff = Math.max(0, Math.floor((midnight - now) / 1000));
      const h = String(Math.floor(diff / 3600)).padStart(2, '0');
      const m = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
      const s = String(diff % 60).padStart(2, '0');
      setNextQuizIn(`${h}:${m}:${s}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [hasPlayedToday, quizActive]);

  /* ---------- quiz end ---------- */
  const handleQuizEnd = useCallback(async () => {
    if (endedRef.current) return;
    endedRef.current = true;
    clearInterval(timerRef.current);
    setQuizCompleted(true);
    setQuizActive(false);

    const finalScore = scoreRef.current;
    const spent = timeSpentRef.current;
    const total = questionsLenRef.current;
    const calculatedPoints = finalScore * 1;
    setPointsEarned(calculatedPoints);

    const u = userRef.current;
    if (u) {
      const todayStr = toLocalDateStr();
      let updatedPoints = profileRef.current?.quiz_points || 0;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch('/api/quiz-complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (session?.access_token || '') },
          body: JSON.stringify({ score: finalScore, total, timeSpent: spent }),
        });
        const out = await res.json().catch(() => ({}));
        if (res.ok && typeof out.quizPoints === 'number') updatedPoints = out.quizPoints;
      } catch (err) {
        console.error('Quiz save failed', err);
      }

      setProfile((prev) => ({ ...prev, quiz_points: updatedPoints, last_quiz_date: todayStr }));
      setHasPlayedToday(true);
      fetchHistory(u.id);
      fetchGrowth(u.id);
    }
    await fetchQuizLeaderboard(u?.id);
  }, [fetchHistory, fetchGrowth, fetchQuizLeaderboard]);

  /* ---------- countdown engine ---------- */
  useEffect(() => {
    if (!quizActive || quizCompleted) return;
    timerRef.current = setInterval(() => {
      if (isTimerFrozen) return;
      timeSpentRef.current += 1;
      setTotalTimeSpent(timeSpentRef.current);
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [quizActive, quizCompleted, isTimerFrozen]);

  useEffect(() => {
    if (quizActive && timeLeft === 0) handleQuizEnd();
  }, [timeLeft, quizActive, handleQuizEnd]);

  /* ---------- start quiz ---------- */
  const startDailyQuizStream = async () => {
    if (!user) return alert('Please login to attempt the Daily Quiz Arena!');
    if (hasPlayedToday) return alert('You have already completed your daily quiz challenge. Come back tomorrow for fresh questions!');

    setLoading(true);
    setApiError(false);
    let pool;
    try {
      const res = await fetch('/api/generate-quiz');
      if (!res.ok) throw new Error('API failure');
      const generated = await res.json();
      if (Array.isArray(generated) && generated.length === 15) pool = generated;
      else throw new Error('Invalid array data');
    } catch (err) {
      console.error('Quiz route issue, loading alternative pool:', err);
      setApiError(true);
      pool = generateSampleQuestionPool();
    }

    setQuestions(pool);
    questionsLenRef.current = pool.length;
    endedRef.current = false;
    scoreRef.current = 0;
    timeSpentRef.current = 0;

    setTimeLeft(300);
    setTotalTimeSpent(0);
    setScore(0);
    setCurrentIdx(0);
    setSelectedAnswer(null);
    setPointsEarned(0);
    setHiddenOptions([]);
    setIsTimerFrozen(false);
    setPowerUps({ fiftyFifty: 1, freezeTime: 1, skipQuestion: 1 });
    setShowHistory(false);
    setShowQuizLeaderboard(false);
    setQuizActive(true);
    setQuizCompleted(false);
    setLoading(false);
  };

  const handleAnswerSelection = (choice) => {
    if (selectedAnswer !== null || endedRef.current) return;
    setSelectedAnswer(choice);

    const currentQuestion = questions[currentIdx];
    if (choice === currentQuestion.correct_option) {
      scoreRef.current += 1;
      setScore(scoreRef.current);
    }

    setTimeout(() => {
      if (endedRef.current) return;
      if (currentIdx + 1 < questions.length) {
        setCurrentIdx((prev) => prev + 1);
        setSelectedAnswer(null);
        setHiddenOptions([]);
        setIsTimerFrozen(false);
      } else {
        handleQuizEnd();
      }
    }, 1500);
  };

  /* ---------- power-ups ---------- */
  const useFiftyFifty = () => {
    if (powerUps.fiftyFifty <= 0 || selectedAnswer !== null) return;
    const q = questions[currentIdx];
    const wrong = ['A', 'B', 'C', 'D'].filter((o) => o !== q.correct_option);
    setHiddenOptions(wrong.sort(() => 0.5 - Math.random()).slice(0, 2));
    setPowerUps((p) => ({ ...p, fiftyFifty: 0 }));
  };

  const useTimeFreeze = () => {
    if (powerUps.freezeTime <= 0 || selectedAnswer !== null) return;
    setIsTimerFrozen(true);
    setPowerUps((p) => ({ ...p, freezeTime: 0 }));
  };

  const useSkipQuestion = () => {
    if (powerUps.skipQuestion <= 0 || selectedAnswer !== null) return;
    setPowerUps((p) => ({ ...p, skipQuestion: 0 }));
    if (currentIdx + 1 < questions.length) {
      setCurrentIdx((prev) => prev + 1);
      setHiddenOptions([]);
      setIsTimerFrozen(false);
    } else {
      handleQuizEnd();
    }
  };

  const toggleHistory = async () => {
    if (!user) return alert('Please login to view your quiz history!');
    const next = !showHistory;
    setShowHistory(next);
    if (next) {
      setShowQuizLeaderboard(false);
      await fetchHistory(user.id);
    }
  };

  const shareAchievement = () => {
    const text = `🎯 I just scored ${score}/${questions.length} on the Bull Run Daily Quiz Arena and I'm currently Ranked #${userRank}! Can you beat my financial strategy? Check it out! 🚀`;
    navigator.clipboard.writeText(text);
    alert('Achievement copied to clipboard! Share it with your friends. 🙌');
  };

  const generateSampleQuestionPool = () => [
    { id: 201, question_text: "Which metric measures a stock's individual volatility relative to the broader market index layers?", option_a: 'Alpha Value', option_b: 'Delta Level', option_c: 'Beta Coefficient', option_d: 'Gamma Delta', correct_option: 'C' },
    { id: 202, question_text: "What financial statement shows a company's structural assets, liabilities, and equity parameters?", option_a: 'Income Statement', option_b: 'Balance Sheet', option_c: 'Cash Flow Matrix', option_d: 'Ledger Accounts', correct_option: 'B' },
    { id: 203, question_text: 'What cash payout portion do corporations distribute directly out of net profits back to shareholders?', option_a: 'Bonus Issue', option_b: 'Retained Reserve', option_c: 'Dividend Balance', option_d: 'Premium Spread', correct_option: 'C' },
    { id: 204, question_text: 'What type of fast market order tells a system broker to execute an immediate buy/sell trade at standard spot prices?', option_a: 'Limit Order', option_b: 'Market Order', option_c: 'Stop Loss Anchor', option_d: 'Bracket Layer', correct_option: 'B' },
    { id: 205, question_text: 'Which primary regulatory council body oversees securities, derivative assets, and capital exchanges in India?', option_a: 'RBI Group', option_b: 'IRDAI Unit', option_c: 'SEBI Council', option_d: 'AMFI Registry', correct_option: 'C' },
    { id: 206, question_text: 'What parameter handles total outstanding share metrics multiplied against current market price values?', option_a: 'Asset Turnover', option_b: 'Market Capitalization', option_c: 'Net Asset Multiplier', option_d: 'Gross Book Revenue', correct_option: 'B' },
    { id: 207, question_text: 'What term describes the first public sale configuration of corporate equity shares to open retail markets?', option_a: 'Initial Public Offering (IPO)', option_b: 'Rights Issue Track', option_c: 'Private Placement Block', option_d: 'Bonus Dividend Split', correct_option: 'A' },
    { id: 208, question_text: 'What standard settlement sequence represents core share delivery timelines across modern local exchanges?', option_a: 'T+1 Sequence', option_b: 'T+3 Sequence', option_c: 'T+5 Sequence', option_d: 'Instantaneous Loop', correct_option: 'A' },
    { id: 209, question_text: 'When a stock chart breaks above a prominent historical resistance ceiling, what trading signal is typically formed?', option_a: 'Short Sell Alert', option_b: 'Breakout Signal', option_c: 'Mean Reversion Pivot', option_d: 'Dead Cat Bounce', correct_option: 'B' },
    { id: 210, question_text: 'Which primary stock index tracks the weighted baseline average of the 50 largest companies on the NSE?', option_a: 'Sensex Index', option_b: 'Nifty 50', option_c: 'Nifty Next Smallcap', option_d: 'BSE Midcap Track', correct_option: 'B' },
    { id: 211, question_text: 'What situation happens to existing outstanding coupon bond prices when macro market interest rates shift higher?', option_a: 'Bond prices appreciate', option_b: 'Bond prices depreciate', option_c: 'Values align static', option_d: 'Immediate default state', correct_option: 'B' },
    { id: 212, question_text: 'What core financial strategy spreads risk across non-correlated asset categories to lower systematic volatility downsides?', option_a: 'Short Leveraging', option_b: 'Diversification', option_c: 'Margin Compounding', option_d: 'Concentration Bias', correct_option: 'B' },
    { id: 213, question_text: 'What does a Price-to-Earnings (P/E) ratio explicitly compare to determine relative company valuation lines?', option_a: 'Price vs Equity Value', option_b: 'Stock Price vs Earnings Per Share', option_c: 'Profit vs Expense Margins', option_d: 'Premium Spread vs Debt Book', correct_option: 'B' },
    { id: 214, question_text: 'What structural adjustment increases total shares outstanding while dropping stock price proportionately without changing value?', option_a: 'Share Buyback Run', option_b: 'Stock Split Action', option_c: 'Rights Allotment Step', option_d: 'Delisting Audits', correct_option: 'B' },
    { id: 215, question_text: 'What form of high-liquidity mutual fund structure concentrates trades within ultra-short term money instruments?', option_a: 'Sector Growth Fund', option_b: 'Liquid Debt Fund', option_c: 'Balanced Hybrid Matrix', option_d: 'Contra Value Track', correct_option: 'B' },
  ];

  /* ---------- derived history data ---------- */
  const days = lastSevenDays();
  const growth = buildGrowth(growthRows, profile?.quiz_points || 0);
  const historyByDate = Object.fromEntries(historyRows.map((r) => [r.quiz_date, r]));
  const weekSeries = days.map((d) => ({ ...d, rec: historyByDate[d.key] || null }));
  const playedDays = weekSeries.filter((d) => d.rec);
  const weekPoints = playedDays.reduce((a, d) => a + d.rec.points, 0);
  const weekAvg = playedDays.length
    ? Math.round((playedDays.reduce((a, d) => a + d.rec.score / d.rec.total, 0) / playedDays.length) * 100)
    : 0;
  const bestDay = playedDays.reduce((best, d) => (!best || d.rec.score > best.rec.score ? d : best), null);
  let streak = 0;
  for (let i = weekSeries.length - 1; i >= 0; i--) {
    if (weekSeries[i].rec) streak++;
    else if (i === weekSeries.length - 1) continue; // today not played yet doesn't break streak
    else break;
  }
  const barColor = (s, t) => {
    const pct = s / t;
    if (pct >= 0.66) return 'linear-gradient(to top, #65a30d, #bef264)';
    if (pct >= 0.4) return 'linear-gradient(to top, #d97706, #fcd34d)';
    return 'linear-gradient(to top, #be123c, #fda4af)';
  };

  return (
    <main className="min-h-screen bg-bull-bg text-slate-100 antialiased font-sans relative max-w-full overflow-x-hidden pt-24 pb-20">
      <style>{`
        @keyframes candleGrow { from { transform: scaleY(0); opacity: 0; } to { transform: scaleY(1); opacity: 1; } }
        @keyframes drawLine { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
        @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes floaty { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes orbDrift { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(30px,-20px) scale(1.15); } }
        @keyframes shimmer { from { background-position: 0% 50%; } to { background-position: 200% 50%; } }
        @keyframes pulseRing { 0% { box-shadow: 0 0 0 0 rgba(190,242,100,0.55); } 100% { box-shadow: 0 0 0 18px rgba(190,242,100,0); } }
        @keyframes barRise { from { height: 0; } }
        .candle { transform-box: fill-box; transform-origin: center bottom; animation: candleGrow 0.6s ease-out both; }
        .pulse-line { stroke-dasharray: 1; stroke-dashoffset: 1; animation: drawLine 2.6s ease-out 0.9s forwards; }
        .marquee-track { animation: marquee 32s linear infinite; }
        .floaty { animation: floaty 4s ease-in-out infinite; }
        .orb { animation: orbDrift 12s ease-in-out infinite; }
        .shimmer-text { background: linear-gradient(90deg,#fcd34d,#bef264,#fcd34d,#bef264,#fcd34d); background-size: 200% auto; -webkit-background-clip: text; background-clip: text; color: transparent; animation: shimmer 6s linear infinite; }
        .cta-pulse { animation: pulseRing 1.8s ease-out infinite; }
        .bar-rise { animation: barRise 0.8s ease-out both; }
      `}</style>

      <Navbar />

      {/* ambient glow */}
      {!quizActive && (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[600px] overflow-hidden">
          <div className="orb absolute -top-24 left-1/4 h-72 w-72 rounded-full bg-lime-400/20 blur-3xl" />
          <div className="orb absolute top-10 right-1/4 h-64 w-64 rounded-full bg-amber-400/15 blur-3xl" style={{ animationDelay: '-4s' }} />
          <div className="orb absolute top-48 left-10 h-56 w-56 rounded-full bg-emerald-500/15 blur-3xl" style={{ animationDelay: '-8s' }} />
        </div>
      )}

      <section className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8 relative z-10 animate-fadeInFast">

        {/* PERSONAL STANDINGS CARD */}
        {profile && !quizActive && (
          <div className="max-w-md mx-auto bg-bull-surface border-2 border-bull-line border-b-2 border-b-bull-lime-dark text-white rounded-2xl p-4 flex items-center justify-between shadow-2xl">
            <div>
              <p className="text-xs uppercase font-black tracking-wider text-slate-400">Your Current Status</p>
              <h4 className="text-sm font-black text-white">{profile.name || 'Anonymous Trader'}</h4>
            </div>
            <div className="flex gap-4 text-right">
              <div>
                <p className="text-xs uppercase font-black tracking-wider text-slate-400">Rank</p>
                <p className="text-sm font-mono font-black text-amber-400">#{userRank}</p>
              </div>
              <div>
                <p className="text-xs uppercase font-black tracking-wider text-slate-400">Balance</p>
                <p className="text-sm font-mono font-black text-bull-lime">{profile.quiz_points || 0} BB</p>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="text-center text-xs font-bold text-slate-400 py-12 animate-pulse">
            Configuring Live Battleground Grid Parameters...
          </div>
        )}

        {/* ================= HERO (WOW) ================= */}
        {!quizActive && !quizCompleted && !loading && (
          <div className="space-y-6">
            {/* ticker tape */}
            <div className="relative overflow-hidden rounded-full border border-bull-line bg-bull-surface/80 backdrop-blur py-2">
              <div className="marquee-track flex w-max gap-8 whitespace-nowrap px-4 text-xs font-black uppercase tracking-widest text-slate-400">
                {[...TICKER_ITEMS, ...TICKER_ITEMS].map((t, i) => (
                  <span key={i} className={i % 3 === 0 ? 'text-bull-lime' : i % 3 === 1 ? 'text-amber-300' : 'text-slate-400'}>{t}</span>
                ))}
              </div>
              <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-bull-bg to-transparent" />
              <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-bull-bg to-transparent" />
            </div>

            <div className="text-center space-y-4 max-w-xl mx-auto">
              <span className="inline-flex items-center gap-2 bg-bull-raised border border-bull-line text-bull-lime text-xs uppercase tracking-widest font-black px-4 py-1.5 rounded-full shadow-inner">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-lime-400" />
                </span>
                Financial Intelligence Battleground · Live
              </span>
              <h1 className="shimmer-text text-5xl sm:text-6xl font-black tracking-tight leading-none font-poppins">
                Daily MCQ Arena
              </h1>
              <p className="text-slate-400 text-xs font-medium leading-relaxed">
                15 fresh stock and macro-economy questions, generated on the fly. Beat the clock, climb the board and stack Bazaar Bucks.
              </p>
            </div>

            {/* candlestick showcase */}
            <div className="relative mx-auto max-w-2xl overflow-hidden rounded-3xl border-2 border-bull-line bg-gradient-to-b from-bull-surface to-bull-bg p-4 sm:p-6 shadow-2xl">
              <div
                className="absolute inset-0 opacity-[0.07]"
                style={{
                  backgroundImage:
                    'linear-gradient(#bef264 1px, transparent 1px), linear-gradient(90deg, #bef264 1px, transparent 1px)',
                  backgroundSize: '32px 32px',
                }}
              />
              <div className="relative flex items-center justify-between text-xs font-black uppercase tracking-widest">
                <span className="text-slate-400">Your Growth · Last {GROWTH_DAYS} Days</span>
                <span className="rounded-full border border-emerald-800 bg-emerald-950/60 px-2 py-0.5 text-emerald-300">
                  {user ? `${growth.gained > 0 ? '▲' : '▬'} +${growth.gained} BB · Total ${growth.balance} BB` : 'Login to track growth'}
                </span>
              </div>

              <svg viewBox="0 0 520 210" className="relative mt-3 w-full" role="img" aria-label="Daily quiz score bars with your running BB total as a line">
                {/* GROWTH_V2 */}
                <defs>
                  <linearGradient id="lineGlow" x1="0" x2="1">
                    <stop offset="0%" stopColor="#fcd34d" />
                    <stop offset="100%" stopColor="#f59e0b" />
                  </linearGradient>
                </defs>
                {(() => {
                  const cs = growth.candles;
                  const L = 40, R = 470, B = 170, H = 140;
                  const step = (R - L) / cs.length;
                  const px = (i) => L + i * step + step / 2;
                  const lo = cs[0].open;
                  const hi = Math.max(cs[cs.length - 1].close, lo + 1);
                  const ty = (v) => B - ((v - lo) / (hi - lo)) * H;
                  const barColor2 = (p) => (p >= 10 ? '#a3e635' : p >= 5 ? '#fcd34d' : '#FF765E');
                  const line = cs.map((c, i) => (i ? 'L' : 'M') + px(i).toFixed(1) + ' ' + ty(c.close).toFixed(1)).join(' ');
                  return (
                    <g>
                      {[0, 5, 10, 15].map((v) => (
                        <g key={'g' + v}>
                          <line x1={L} x2={R} y1={B - (v / 15) * H} y2={B - (v / 15) * H} stroke="#64748b" strokeOpacity="0.25" strokeDasharray={v === 0 ? '0' : '3 4'} />
                          <text x={L - 8} y={B - (v / 15) * H + 4} textAnchor="end" fontSize="12" fontWeight="700" fill="#64748b">{v}</text>
                        </g>
                      ))}
                      {growth.hasData && (
                        <g>
                          <text x={R + 8} y={ty(hi) + 4} fontSize="12" fontWeight="800" fill="#d97706">{hi}</text>
                          <text x={R + 8} y={ty(lo) + 4} fontSize="12" fontWeight="800" fill="#d97706">{lo}</text>
                        </g>
                      )}
                      {cs.map((c, i) => {
                        const h = c.pts > 0 ? Math.max(4, (c.pts / 15) * H) : 0;
                        return (
                          <g key={c.key} className="candle" style={{ animationDelay: (i * 0.05) + 's' }}>
                            <title>{c.key + ': ' + (c.pts > 0 ? c.pts + ' BB' : 'No quiz played')}</title>
                            {c.pts > 0 ? (
                              <g>
                                <rect x={px(i) - 7} y={B - h} width="14" height={h} rx="4" fill={barColor2(c.pts)} />
                                
                              </g>
                            ) : (
                              <circle cx={px(i)} cy={B + 6} r="3.5" fill="#FF765E" opacity="0.9" />
                            )}
                          </g>
                        );
                      })}
                      {growth.hasData && (
                        <g>
                          <path d={line} pathLength="1" fill="none" stroke="url(#lineGlow)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="pulse-line" />
                          {cs.map((c, i) => <circle key={'d' + c.key} cx={px(i)} cy={ty(c.close)} r="3" fill="#f59e0b" stroke="#fff" strokeWidth="1" />)}
                        </g>
                      )}
                      {/* VALUE_LABELS */}
                      {cs.map((c, i) => {
                        if (!(c.pts > 0)) return null;
                        const h = Math.max(4, (c.pts / 15) * H);
                        const inside = h >= 26;
                        const cy = inside ? B - h + 15 : B - h - 14;
                        return (
                          <g key={'v' + c.key}>
                            {!inside && <rect x={px(i) - 12} y={cy - 9} width="24" height="18" rx="6" fill="#ffffff" opacity="0.92" />}
                            <text x={px(i)} y={cy + 4} textAnchor="middle" fontSize="13" fontWeight="900" fill={inside ? '#14210a' : '#334155'}>{c.pts}</text>
                          </g>
                        );
                      })}
                      {cs.map((c, i) => (
                        <text key={'l' + c.key} x={px(i)} y="198" textAnchor="middle" fontSize="12" fontWeight={i === cs.length - 1 ? '900' : '700'} fill={i === cs.length - 1 ? '#65a30d' : '#64748b'}>{c.label}</text>
                      ))}
                      {!growth.hasData && (
                        <text x="255" y="95" textAnchor="middle" fontSize="12" fontWeight="800" fill="#94a3b8">
                          {user ? 'Play your first quiz to start your growth chart' : 'Login to see your growth'}
                        </text>
                      )}
                    </g>
                  );
                })()}
              </svg>
              <div className="relative mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs font-bold text-slate-400">
                <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-bull-lime" />Daily score (left)</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-5 rounded bg-amber-400" />Running total (right)</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-bull-coral" />Missed day</span>
              </div>

              {/* floating badges */}
              <div className="floaty absolute right-4 top-14 hidden items-center gap-1.5 rounded-xl border border-amber-700/60 bg-amber-950/70 px-3 py-1.5 text-xs font-black text-amber-300 shadow-lg backdrop-blur">
                🏆 +1 BB per correct answer
              </div>
              <div className="floaty absolute left-4 bottom-4 hidden items-center gap-1.5 rounded-xl border border-sky-800/60 bg-sky-950/70 px-3 py-1.5 text-xs font-black text-sky-300 shadow-lg backdrop-blur" style={{ animationDelay: '-2s' }}>
                ❄️ Freeze time · 🌓 50:50 · ⏩ Skip
              </div>
            </div>

            {/* quick stats */}
            <div className="mx-auto grid max-w-2xl grid-cols-3 gap-3">
              {[
                { v: '15', l: 'Questions', c: 'text-bull-lime' },
                { v: '5:00', l: 'Minutes', c: 'text-amber-300' },
                { v: '15', l: 'Max BB', c: 'text-emerald-300' },
              ].map((s) => (
                <div key={s.l} className="rounded-2xl border border-bull-line bg-bull-surface/80 p-3 text-center backdrop-blur">
                  <p className={`font-mono text-2xl font-black ${s.c}`}>{s.v}</p>
                  <p className="text-xs font-black uppercase tracking-wider text-slate-400">{s.l}</p>
                </div>
              ))}
            </div>

            {/* actions */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              {hasPlayedToday ? (
                <div className="rounded-2xl border border-bull-line bg-bull-surface px-6 py-3 text-center shadow-inner">
                  <p className="text-xs font-black uppercase tracking-wider text-slate-500">🔒 Attempted today · next quiz in</p>
                  <p className="font-mono text-xl font-black text-bull-lime">{nextQuizIn}</p>
                </div>
              ) : (
                <button
                  onClick={startDailyQuizStream}
                  className="cta-pulse rounded-2xl border-b-2 border-b-bull-lime-dark bg-bull-lime px-8 py-4 text-xs font-black uppercase tracking-wider text-bull-ink shadow-xl transition-all hover:-translate-y-0.5 hover:bg-bull-lime-light"
                >
                  Launch Today&apos;s Quiz (5m) ⏱️
                </button>
              )}
              <button
                onClick={toggleHistory}
                className={`rounded-2xl border-2 px-6 py-4 text-xs font-bold uppercase tracking-wider shadow-md transition-all ${
                  showHistory
                    ? 'border-amber-400/70 bg-amber-950/40 text-amber-200'
                    : 'border-bull-line bg-bull-surface text-slate-300 hover:border-amber-400/50 hover:text-white'
                }`}
              >
                {showHistory ? 'Hide Last 7 Days' : '📅 Last 7 Days'}
              </button>
              <button
                onClick={() => { setShowQuizLeaderboard(!showQuizLeaderboard); setShowHistory(false); }}
                className="rounded-2xl border-2 border-bull-line bg-bull-surface px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-300 shadow-md transition-all hover:border-bull-lime/50 hover:text-white"
              >
                {showQuizLeaderboard ? 'Hide Standings' : 'Check Quiz Rank 🏆'}
              </button>
            </div>
          </div>
        )}

        {/* ================= LAST 7 DAYS ================= */}
        {showHistory && !quizActive && (
          <div className="animate-fadeInFast space-y-5 rounded-3xl border-2 border-bull-line bg-bull-surface p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-bull-line pb-3">
              <div>
                <h3 className="font-poppins text-base font-black text-white">Your Last 7 Days</h3>
                <p className="text-xs font-medium text-slate-400">Daily accuracy and Bazaar Bucks earned.</p>
              </div>
              <button onClick={() => setShowHistory(false)} className="text-xs font-bold text-bull-lime hover:underline">Close</button>
            </div>

            {historyLoading ? (
              <p className="animate-pulse py-8 text-center text-xs font-bold text-slate-400">Pulling your scorecards...</p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-xl border border-bull-line bg-bull-raised p-3">
                    <p className="text-xs font-black uppercase text-slate-400">Played</p>
                    <p className="font-mono text-xl font-black text-white">{playedDays.length}<span className="text-sm text-slate-500"> / 7</span></p>
                  </div>
                  <div className="rounded-xl border border-emerald-900/60 bg-emerald-950/40 p-3">
                    <p className="text-xs font-black uppercase text-emerald-400">Week Earned</p>
                    <p className="font-mono text-xl font-black text-emerald-300">+{weekPoints} BB</p>
                  </div>
                  <div className="rounded-xl border border-bull-line bg-bull-raised p-3">
                    <p className="text-xs font-black uppercase text-bull-lime">Avg Accuracy</p>
                    <p className="font-mono text-xl font-black text-white">{weekAvg}%</p>
                  </div>
                  <div className="rounded-xl border border-amber-900/60 bg-amber-950/40 p-3">
                    <p className="text-xs font-black uppercase text-amber-400">Streak</p>
                    <p className="font-mono text-xl font-black text-amber-300">🔥 {streak}d</p>
                  </div>
                </div>

                {/* bar chart */}
                <div className="rounded-2xl border border-bull-line bg-bull-bg/60 p-4">
                  <div className="flex h-44 items-end justify-between gap-2">
                    {weekSeries.map((d) => {
                      const pct = d.rec ? Math.max(8, (d.rec.score / d.rec.total) * 100) : 0;
                      return (
                        <div key={d.key} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                          <span className="font-mono text-xs font-black text-slate-300">{d.rec ? d.rec.score : '–'}</span>
                          <div className="relative flex w-full max-w-[44px] flex-1 items-end overflow-hidden rounded-t-lg bg-bull-raised/60">
                            {d.rec && (
                              <div
                                className="bar-rise w-full rounded-t-lg"
                                style={{ height: `${pct}%`, background: barColor(d.rec.score, d.rec.total) }}
                              />
                            )}
                          </div>
                          <div className={`text-center text-xs font-black uppercase leading-tight ${d.isToday ? 'text-bull-lime' : 'text-slate-500'}`}>
                            {d.weekday}
                            <div className="font-mono text-xs font-bold opacity-70">{d.day}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* list */}
                <div className="divide-y divide-bull-line overflow-hidden rounded-2xl border border-bull-line">
                  {[...weekSeries].reverse().map((d) => (
                    <div key={d.key} className={`flex items-center justify-between px-4 py-3 text-xs ${d.isToday ? 'bg-bull-lime/10' : 'bg-bull-raised/40'}`}>
                      <div className="flex items-center gap-3">
                        <span className="w-14 font-black text-white">{d.weekday} {d.day}</span>
                        {d.isToday && <span className="rounded bg-bull-lime px-1.5 py-0.5 text-xs font-black uppercase text-bull-ink">Today</span>}
                      </div>
                      {d.rec ? (
                        <div className="flex items-center gap-4 font-mono font-bold">
                          <span className="text-white">{d.rec.score}/{d.rec.total}</span>
                          <span className="hidden text-slate-400 sm:inline">⏱ {formatTime(d.rec.time_spent)}</span>
                          <span className="text-emerald-300">+{d.rec.points} BB</span>
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-slate-600">{d.isToday ? 'Not played yet' : 'Missed'}</span>
                      )}
                    </div>
                  ))}
                </div>

                {bestDay && (
                  <p className="text-center text-xs font-bold text-amber-300">
                    ⭐ Best day: {bestDay.weekday} {bestDay.day} with {bestDay.rec.score}/{bestDay.rec.total}
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {/* ================= COMPLETED ================= */}
        {quizCompleted && (
          <div className="animate-scaleUp mx-auto max-w-md space-y-6 rounded-3xl border-2 border-b-4 border-bull-line border-b-bull-lime-dark bg-bull-surface p-8 text-center shadow-2xl">
            <div className="text-6xl">🎯</div>
            <div className="space-y-1">
              <h2 className="font-poppins text-2xl font-black text-white">Arena Run Complete!</h2>
              <p className="text-xs font-medium text-slate-400">Your financial pipeline metrics are secured.</p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-left">
              <div className="rounded-xl border border-bull-line bg-bull-raised p-3.5">
                <p className="text-xs font-black uppercase text-slate-400">Accuracy</p>
                <p className="font-mono text-xl font-black text-white">{score} / {questions.length}</p>
              </div>
              <div className="rounded-xl border border-emerald-900/60 bg-emerald-950/40 p-3.5">
                <p className="text-xs font-black uppercase text-emerald-400">Earned Payout</p>
                <p className="font-mono text-xl font-black text-emerald-400">+{pointsEarned} BB</p>
              </div>
              <div className="col-span-2 rounded-xl border border-bull-line bg-bull-raised p-3.5 text-center">
                <p className="text-xs font-black uppercase text-bull-lime">Total Run Time Invested</p>
                <p className="font-mono text-lg font-black text-amber-300">{formatTime(totalTimeSpent)}</p>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button onClick={shareAchievement} className="w-full rounded-xl bg-bull-lime py-3 text-xs font-black uppercase tracking-wider text-bull-ink shadow-md transition-all hover:bg-bull-lime-light">
                Share Achievement Context 🚀
              </button>
              <button
                onClick={() => { setQuizCompleted(false); setShowHistory(true); fetchHistory(user?.id); }}
                className="w-full rounded-xl border border-bull-line bg-bull-raised py-3 text-xs font-bold uppercase tracking-wider text-slate-300 transition-all hover:border-amber-400/50 hover:text-white"
              >
                📅 View Last 7 Days
              </button>
              <button
                onClick={() => { setQuizCompleted(false); setShowQuizLeaderboard(true); }}
                className="w-full rounded-xl border border-bull-line bg-bull-raised py-3 text-xs font-bold uppercase tracking-wider text-slate-300 transition-all hover:border-bull-lime/50 hover:text-white"
              >
                Check Quiz Standing Map
              </button>
            </div>
          </div>
        )}

        {/* ================= ACTIVE QUIZ ================= */}
        {quizActive && questions.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between rounded-2xl border-2 border-bull-line bg-bull-surface px-6 py-4 shadow-xl">
              <div className="text-xs font-bold text-slate-300">
                Question <span className="font-mono text-sm font-black text-bull-lime">{currentIdx + 1}</span> / {questions.length}
                {apiError && <span className="ml-2 rounded border border-amber-900/60 bg-amber-950/40 px-2 py-0.5 text-xs text-amber-400">Local Mode</span>}
              </div>
              <div className={`flex items-center gap-1.5 rounded-full border px-4 py-1.5 font-mono text-xs font-black tracking-wider transition-all ${
                timeLeft <= 60 ? 'animate-pulse border-rose-900/80 bg-rose-950/60 text-rose-400' : 'border-bull-line bg-bull-raised text-white'
              }`}>
                ⏰ {formatTime(timeLeft)} {isTimerFrozen && <span className="ml-1 animate-bounce rounded bg-sky-600 px-1 py-0.5 text-xs text-white">FROZEN</span>}
              </div>
            </div>

            {/* progress bar */}
            <div className="h-1.5 overflow-hidden rounded-full bg-bull-raised">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${((currentIdx + (selectedAnswer ? 1 : 0)) / questions.length) * 100}%`, background: 'linear-gradient(90deg,#84cc16,#fcd34d)' }}
              />
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 rounded-2xl border border-bull-line bg-bull-surface p-3">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400">Tactical Add-ons:</span>
              {[
                { key: 'fiftyFifty', label: '🌓 50:50', fn: useFiftyFifty, extra: false },
                { key: 'freezeTime', label: '❄️ Time Freeze', fn: useTimeFreeze, extra: isTimerFrozen },
                { key: 'skipQuestion', label: '⏩ Skip Field', fn: useSkipQuestion, extra: false },
              ].map((p) => (
                <button
                  key={p.key}
                  disabled={powerUps[p.key] <= 0 || selectedAnswer !== null || p.extra}
                  onClick={p.fn}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-black uppercase tracking-wider transition-all ${
                    powerUps[p.key] > 0 ? 'border-bull-line bg-bull-raised text-slate-200 shadow-sm hover:border-bull-lime/50' : 'cursor-not-allowed border-transparent bg-bull-surface text-slate-600'
                  }`}
                >
                  {p.label} ({powerUps[p.key]})
                </button>
              ))}
            </div>

            <div className="space-y-6 rounded-3xl border-2 border-bull-line bg-bull-surface p-6 shadow-2xl sm:p-8">
              <h3 className="font-poppins text-base font-black leading-relaxed text-white sm:text-lg">
                {questions[currentIdx]?.question_text}
              </h3>

              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                {['A', 'B', 'C', 'D'].map((optionLetter) => {
                  const choiceString = questions[currentIdx][`option_${optionLetter.toLowerCase()}`];
                  const isHidden = hiddenOptions.includes(optionLetter);
                  const isSelected = selectedAnswer === optionLetter;
                  const isCorrectAnswer = optionLetter === questions[currentIdx].correct_option;

                  if (isHidden) return <div key={optionLetter} className="pointer-events-none hidden opacity-0 sm:block" />;

                  let optionStyle = 'bg-bull-raised border-bull-line text-slate-300 hover:bg-bull-line hover:border-bull-lime/50';
                  if (selectedAnswer !== null) {
                    if (isSelected) {
                      optionStyle = isCorrectAnswer
                        ? 'bg-emerald-950/60 border-emerald-600 text-emerald-300 font-bold shadow-md'
                        : 'bg-rose-950/60 border-rose-600 text-rose-300 font-bold shadow-md';
                    } else if (isCorrectAnswer) {
                      optionStyle = 'bg-emerald-950/60 border-emerald-600 text-emerald-300 font-bold shadow-md';
                    } else {
                      optionStyle = 'bg-bull-surface border-bull-line text-slate-600 opacity-50';
                    }
                  }

                  return (
                    <button
                      key={optionLetter}
                      disabled={selectedAnswer !== null}
                      onClick={() => handleAnswerSelection(optionLetter)}
                      className={`flex items-center justify-between rounded-2xl border-2 p-4 text-left text-xs font-bold transition-all sm:text-sm ${optionStyle}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`flex h-6 w-6 items-center justify-center rounded-lg border text-xs font-black ${
                          isSelected ? 'border-bull-lime bg-bull-lime text-bull-ink' : 'border-bull-line bg-bull-surface text-slate-400'
                        }`}>{optionLetter}</span>
                        <span>{choiceString}</span>
                      </div>
                      {selectedAnswer !== null && isCorrectAnswer && <span>✨</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ================= LEADERBOARD ================= */}
        {showQuizLeaderboard && !quizActive && (
          <div className="animate-fadeInFast space-y-4 overflow-hidden rounded-3xl border-2 border-bull-line bg-bull-surface p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-bull-line pb-3">
              <div>
                <h3 className="font-poppins text-base font-black text-white">Bazaar Bucks (BB) Standings</h3>
                <p className="text-xs font-medium text-slate-400">Top quiz masters ranked by cumulative correct payouts.</p>
              </div>
              <button onClick={() => setShowQuizLeaderboard(false)} className="text-xs font-bold text-bull-lime hover:underline">Close Table</button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-bull-raised text-xs font-black uppercase tracking-wider text-slate-400">
                    <th className="w-14 p-3 text-center">Rank</th>
                    <th className="p-3">Trader</th>
                    <th className="p-3">Track</th>
                    <th className="p-3 text-right">Quiz Payout Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-bull-line text-xs font-bold text-slate-300">
                  {quizLeaderboard.map((trader, idx) => (
                    <tr key={trader.id || idx} className={`hover:bg-bull-raised/80 ${trader.id === user?.id ? 'border-y border-bull-lime/50 bg-bull-lime/20' : ''}`}>
                      <td className="p-3 text-center font-mono font-black text-white">
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`} {trader.id === user?.id && '⭐'}
                      </td>
                      <td className="p-3 font-black text-white">{trader.name ? trader.name : 'Anonymous Trader'}</td>
                      <td className="p-3 font-mono text-xs uppercase text-slate-400">{trader.role}</td>
                      <td className="p-3 text-right font-mono font-black text-bull-lime">{trader.quiz_points || 0} BB</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}