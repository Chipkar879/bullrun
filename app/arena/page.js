
'use client';
import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { useRouter } from 'next/navigation';

// PRICE GRAPH
function ArenaPriceChart({ stock }) {
  const prices = stock.history;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const isUp = !stock.changePct.startsWith('-');

  const points = prices
    .map((price, index) => {
      const x = (index / Math.max(prices.length - 1, 1)) * 100;
      const y = 90 - ((price - min) / range) * 75;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="bg-[#0f0505] border border-[#2b0808] rounded-2xl p-4 min-w-0">
      <div className="flex justify-between items-start gap-2 mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-widest font-black text-slate-500">
            Simulated Price
          </p>
          <p className="text-2xl font-black font-mono text-white mt-1">
            ₹{stock.price.toLocaleString('en-IN')}
          </p>
        </div>
        <span className={`text-xs font-black ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
          {stock.changePct}
        </span>
      </div>

      <div className="h-[180px] w-full">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="w-full h-full overflow-visible"
          role="img"
          aria-label={`${stock.name} simulated price history`}
        >
          {[20, 40, 60, 80].map(y => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2="100"
              y2={y}
              stroke="#3b1515"
              strokeWidth="0.5"
              strokeDasharray="2 2"
            />
          ))}

          <polygon
            points={`0,100 ${points} 100,100`}
            fill={isUp ? 'rgba(16,185,129,0.12)' : 'rgba(244,63,94,0.12)'}
          />

          <polyline
            points={points}
            fill="none"
            stroke={isUp ? '#34d399' : '#fb7185'}
            strokeWidth="1.8"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />

          <circle
            cx="100"
            cy={90 - ((stock.price - min) / range) * 75}
            r="2"
            fill={isUp ? '#34d399' : '#fb7185'}
          />
        </svg>
      </div>

      <div className="flex justify-between text-[10px] text-slate-500 mt-3">
        <span>Earlier ticks</span>
        <span>Latest tick</span>
      </div>

      <div className="mt-4 pt-3 border-t border-[#2b0808] space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">Previous close</span>
          <span className="font-mono text-slate-300">
            ₹{stock.prevClose.toLocaleString('en-IN')}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">Current price</span>
          <span className="font-mono font-bold text-white">
            ₹{stock.price.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      <p className="text-[10px] text-slate-600 mt-4">
        Illustrative simulated prices, not live exchange data.
      </p>
    </div>
  );
}

// 40 DYNAMIC GAMIFIED EVENT ALERTS
const CHALLENGE_EVENTS_REGISTRY = [
  { msg: '🔥 Tech sector boom! TECH +22%', sym: 'TECH', pct: 0.22, col: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40' },
  { msg: '🤖 Breakthrough in AI neural models! TECH +35%', sym: 'TECH', pct: 0.35, col: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40' },
  { msg: '🤖 Autonomous robot launch! TECH +18%', sym: 'TECH', pct: 0.18, col: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40' },
  { msg: '💻 Quantum computing milestone! TECH +28%', sym: 'TECH', pct: 0.28, col: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40' },
  { msg: '💻 Major data center outage! TECH -16%', sym: 'TECH', pct: -0.16, col: 'text-rose-400 bg-rose-950/60 border-rose-500/40' },
  { msg: '📉 Global cloud server crash! TECH -24%', sym: 'TECH', pct: -0.24, col: 'text-rose-400 bg-rose-950/60 border-rose-500/40' },
  { msg: '💥 Semiconductor shortage! CHIP -18%', sym: 'CHIP', pct: -0.18, col: 'text-rose-400 bg-rose-950/60 border-rose-500/40' },
  { msg: '🔬 Breakthrough in 1nm micro-architecture! CHIP +32%', sym: 'CHIP', pct: 0.32, col: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40' },
  { msg: '🏭 Silicon foundry fire reported! CHIP -22%', sym: 'CHIP', pct: -0.22, col: 'text-rose-400 bg-rose-950/60 border-rose-500/40' },
  { msg: '⚡ High demand for AI GPU clusters! CHIP +24%', sym: 'CHIP', pct: 0.24, col: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40' },
  { msg: '🚀 Rocket launch successful! MOON +30%', sym: 'MOON', pct: 0.30, col: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40' },
  { msg: '🌕 Asteroid mining contract awarded! MOON +40%', sym: 'MOON', pct: 0.40, col: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40' },
  { msg: '🛰️ Orbital station expansion funded! MOON +20%', sym: 'MOON', pct: 0.20, col: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40' },
  { msg: '⚠️ Space debris collides with shuttle! MOON -25%', sym: 'MOON', pct: -0.25, col: 'text-rose-400 bg-rose-950/60 border-rose-500/40' },
  { msg: '🌱 Fusion reactor passes safety test! GRN +28%', sym: 'GRN', pct: 0.28, col: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40' },
  { msg: '☀️ Solar conversion efficiency breaks record! GRN +22%', sym: 'GRN', pct: 0.22, col: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40' },
  { msg: '🔋 Battery grid subsidy approved! GRN +18%', sym: 'GRN', pct: 0.18, col: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40' },
  { msg: '🌧️ Rare mineral supply chain delayed! GRN -14%', sym: 'GRN', pct: -0.14, col: 'text-rose-400 bg-rose-950/60 border-rose-500/40' },
  { msg: '🎮 Metaverse MMO hits 100M active players! ZOM +33%', sym: 'ZOM', pct: 0.33, col: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40' },
  { msg: '🕹️ VR headset pre-orders sold out! ZOM +21%', sym: 'ZOM', pct: 0.21, col: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40' },
  { msg: '🐛 Game release delayed due to bug backlash! ZOM -19%', sym: 'ZOM', pct: -0.19, col: 'text-rose-400 bg-rose-950/60 border-rose-500/40' },
  { msg: '🏆 Esports championship breaks viewership records! ZOM +16%', sym: 'ZOM', pct: 0.16, col: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40' },
  { msg: '🍔 Viral food trend explosion! FOOD +25%', sym: 'FOOD', pct: 0.25, col: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40' },
  { msg: '🚁 Autonomous delivery drones approved nationwide! FOOD +29%', sym: 'FOOD', pct: 0.29, col: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40' },
  { msg: '📦 Delivery worker strike slows service! FOOD -17%', sym: 'FOOD', pct: -0.17, col: 'text-rose-400 bg-rose-950/60 border-rose-500/40' },
  { msg: '📉 Cyberattack reported! BANK -15%', sym: 'BANK', pct: -0.15, col: 'text-rose-400 bg-rose-950/60 border-rose-500/40' },
  { msg: '💳 Instant settlement network reaches 1B transactions! BANK +26%', sym: 'BANK', pct: 0.26, col: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40' },
  { msg: '📈 Interest rate adjustment boosts margins! BANK +17%', sym: 'BANK', pct: 0.17, col: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40' },
  { msg: '⚖️ Banking compliance audit triggers fine! BANK -13%', sym: 'BANK', pct: -0.13, col: 'text-rose-400 bg-rose-950/60 border-rose-500/40' },
  { msg: '🧪 Gene-editing clinical trial succeeds! PHARMA +38%', sym: 'PHARMA', pct: 0.38, col: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40' },
  { msg: '🩺 Health nanobot diagnostic tool approved! PHARMA +24%', sym: 'PHARMA', pct: 0.24, col: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40' },
  { msg: '❌ Drug patent trial denied by regulators! PHARMA -21%', sym: 'PHARMA', pct: -0.21, col: 'text-rose-400 bg-rose-950/60 border-rose-500/40' },
  { msg: '🎓 Global subscription surge for AI tutoring! EDU +23%', sym: 'EDU', pct: 0.23, col: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40' },
  { msg: '📚 University partnership deal signed! EDU +19%', sym: 'EDU', pct: 0.19, col: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40' },
  { msg: '📉 Server outages during finals week! EDU -14%', sym: 'EDU', pct: -0.14, col: 'text-rose-400 bg-rose-950/60 border-rose-500/40' },
  { msg: '🏆 Smart athletic wear adopted by pro league! SPORT +27%', sym: 'SPORT', pct: 0.27, col: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40' },
  { msg: '👟 Biomechanical tracker shoe goes viral! SPORT +21%', sym: 'SPORT', pct: 0.21, col: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40' },
  { msg: '⚠️ Supply chain shortage delays shoe drop! SPORT -15%', sym: 'SPORT', pct: -0.15, col: 'text-rose-400 bg-rose-950/60 border-rose-500/40' },
  { msg: '📊 Bull market rally sweeps all sectors! ALL +12%', sym: 'TECH', pct: 0.12, col: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40' },
  { msg: '🐻 Market-wide pull-back reported! ALL -10%', sym: 'CHIP', pct: -0.10, col: 'text-rose-400 bg-rose-950/60 border-rose-500/40' }
];

export default function ArenaPage() {
  const router = useRouter();

  const [gameState, setGameState] = useState('LOBBY');
  const [countdownNum, setCountdownNum] = useState(3);

  const [showExitModal, setShowExitModal] = useState(false);
  const [pendingHref, setPendingHref] = useState(null);

  const START_GAME = 10000;
  const [gameBalance, setGameBalance] = useState(START_GAME);
  const [gameHoldings, setGameHoldings] = useState({});
  const [day, setDay] = useState(1);
  const [autoSecsLeft, setAutoSecsLeft] = useState(60);
  const [activeEvent, setActiveEvent] = useState(null);
  const [selectedStockModal, setSelectedStockModal] = useState(null);
  const [tradeQty, setTradeQty] = useState(1);

  const [gameStocks, setGameStocks] = useState([
    { sym: 'TECH', name: 'TechCorp Inc.', price: 1250, prevClose: 1250, changePct: '0.00%', icon: '💻', sector: 'Cybernetics', desc: 'Next-gen AI neural chip developer expanding across global markets.', history: [1200, 1220, 1210, 1230, 1250] },
    { sym: 'GRN', name: 'GreenEnergy Co.', price: 380, prevClose: 380, changePct: '0.00%', icon: '⚡', sector: 'Clean Tech', desc: 'Harnessing fusion solar power plants for zero-emission energy.', history: [360, 370, 365, 375, 380] },
    { sym: 'MOON', name: 'AeroSpace Ltd.', price: 2340, prevClose: 2340, changePct: '0.00%', icon: '🚀', sector: 'Space Infra', desc: 'Building asteroid mining shuttles and lunar orbital stations.', history: [2200, 2250, 2300, 2280, 2340] },
    { sym: 'CHIP', name: 'SemiconductorX', price: 760, prevClose: 760, changePct: '0.00%', icon: '🔬', sector: 'Hardware', desc: 'Manufacturing 1nm micro-quantum processors for autonomous tech.', history: [780, 770, 750, 760, 760] },
    { sym: 'ZOM', name: 'ZombieGames', price: 710, prevClose: 710, changePct: '0.00%', icon: '🎮', sector: 'Gaming & VR', desc: 'Creators of the world’s biggest full-immersion metaverse MMO.', history: [690, 700, 720, 705, 710] },
    { sym: 'FOOD', name: 'FoodieHub', price: 425, prevClose: 425, changePct: '0.00%', icon: '🍕', sector: 'Consumer', desc: 'Autonomous drone food delivery service operating in 100+ cities.', history: [400, 410, 415, 420, 425] },
    { sym: 'BANK', name: 'DigitalBank Ltd.', price: 1860, prevClose: 1860, changePct: '0.00%', icon: '🏦', sector: 'FinTech', desc: 'Decentralized instant payment settlement network for Gen-Z.', history: [1800, 1820, 1840, 1850, 1860] },
    { sym: 'EDU', name: 'EduTech Corp.', price: 312, prevClose: 312, changePct: '0.00%', icon: '🎓', sector: 'EdTech', desc: 'AI tutors customizing learning pathways for millions of students.', history: [300, 305, 310, 308, 312] },
    { sym: 'SPORT', name: 'SportXcel', price: 584, prevClose: 584, changePct: '0.00%', icon: '🏆', sector: 'Athletics', desc: 'Smart athletic gear tracking biomechanics and performance live.', history: [560, 570, 575, 580, 584] },
    { sym: 'PHARMA', name: 'PharmaCorp', price: 1120, prevClose: 1120, changePct: '0.00%', icon: '🧪', sector: 'Biotech', desc: 'Pioneering gene-editing therapies and nanobot health diagnostics.', history: [1100, 1110, 1105, 1115, 1120] },
  ]);

  const FAKE_LB = [
    { name: 'ApexTrader 🥇', score: 14200 },
    { name: 'DiamondHands 💎', score: 12800 },
    { name: 'CyberWhale 🐋', score: 11500 },
    { name: 'PaperTrader 📄', score: 9200 },
  ];

  const handleHeaderCloseClick = () => {
    if (gameState === 'RUNNING') {
      setPendingHref('/');
      setShowExitModal(true);
    } else {
      router.push('/');
    }
  };

  const startCountdownSequence = () => {
    setGameState('COUNTDOWN');
    setCountdownNum(3);

    const timer = setInterval(() => {
      setCountdownNum(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setGameState('RUNNING');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (gameState === 'RUNNING') {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [gameState]);

  useEffect(() => {
    if (gameState !== 'RUNNING') return;

    const handleAnchorClick = (e) => {
      const target = e.target.closest('a');
      if (target && target.href) {
        const url = new URL(target.href);
        if (url.pathname !== '/arena') {
          e.preventDefault();
          setPendingHref(target.href);
          setShowExitModal(true);
        }
      }
    };

    document.addEventListener('click', handleAnchorClick, true);
    return () => document.removeEventListener('click', handleAnchorClick, true);
  }, [gameState]);

  const confirmExitAndNavigate = () => {
    setShowExitModal(false);
    setGameState('LOBBY');
    if (pendingHref) {
      router.push(pendingHref);
    } else {
      router.push('/');
    }
  };

  useEffect(() => {
    if (gameState !== 'RUNNING') return;

    const tickInterval = setInterval(() => {
      setGameStocks(prev => prev.map(st => {
        const randomChange = (Math.random() * 0.08) - 0.038;
        const newPrice = Math.max(10, Math.round(st.price * (1 + randomChange)));
        const computedPct = (((newPrice - st.prevClose) / st.prevClose) * 100).toFixed(2);
        return {
          ...st,
          price: newPrice,
          changePct: `${newPrice >= st.prevClose ? '+' : ''}${computedPct}%`,
          history: [...st.history.slice(1), newPrice]
        };
      }));
    }, 4000);

    const secondsInterval = setInterval(() => {
      setAutoSecsLeft(s => {
        if (s <= 1) {
          setDay(d => {
            if (d >= 30) {
              setGameState('FINISHED');
              return 30;
            }
            return d + 1;
          });
          setGameStocks(prev => prev.map(st => ({ ...st, prevClose: st.price })));
          return 60;
        }
        return s - 1;
      });
    }, 1000);

    const eventsInterval = setInterval(() => {
      if (Math.random() < 0.60) {
        const ev = CHALLENGE_EVENTS_REGISTRY[Math.floor(Math.random() * CHALLENGE_EVENTS_REGISTRY.length)];
        setActiveEvent(ev);
        setGameStocks(prev => prev.map(st => {
          if (st.sym === ev.sym) {
            const modPrice = Math.max(10, Math.round(st.price * (1 + ev.pct)));
            const computedPct = (((modPrice - st.prevClose) / st.prevClose) * 100).toFixed(2);
            return {
              ...st,
              price: modPrice,
              changePct: `${modPrice >= st.prevClose ? '+' : ''}${computedPct}%`,
              history: [...st.history.slice(1), modPrice]
            };
          }
          return st;
        }));
        setTimeout(() => setActiveEvent(null), 6000);
      }
    }, 20000);

    return () => {
      clearInterval(tickInterval);
      clearInterval(secondsInterval);
      clearInterval(eventsInterval);
    };
  }, [gameState]);

  const getGameHoldingsValue = () => {
    return Object.values(gameHoldings).reduce((sum, h) => {
      const match = gameStocks.find(x => x.sym === h.sym);
      return sum + (match ? match.price * h.shares : 0);
    }, 0);
  };

  const handleGameTrade = (sym, type, qty) => {
    if (gameState !== 'RUNNING') return;
    const targetStock = gameStocks.find(s => s.sym === sym);
    if (!targetStock || isNaN(qty) || qty <= 0) return;

    const transactionTotal = targetStock.price * qty;

    if (type === 'BUY') {
      if (gameBalance < transactionTotal) {
        alert('Insufficient Cash Balance in Arena!');
        return;
      }
      setGameBalance(p => p - transactionTotal);
      setGameHoldings(prev => {
        const existing = prev[sym];
        if (existing) {
          const newShares = existing.shares + qty;
          return { ...prev, [sym]: { sym, shares: newShares, avgPrice: ((existing.avgPrice * existing.shares) + (targetStock.price * qty)) / newShares } };
        }
        return { ...prev, [sym]: { sym, shares: qty, avgPrice: targetStock.price } };
      });
    } else {
      const existing = gameHoldings[sym];
      if (!existing || existing.shares < qty) {
        alert('Not enough units to execute this sell order!');
        return;
      }
      setGameBalance(p => p + transactionTotal);
      setGameHoldings(prev => {
        if (prev[sym].shares === qty) {
          const updated = { ...prev };
          delete updated[sym];
          return updated;
        }
        return { ...prev, [sym]: { ...prev[sym], shares: prev[sym].shares - qty } };
      });
    }
  };

  const resetChallengeArena = () => {
    setGameBalance(START_GAME);
    setGameHoldings({});
    setDay(1);
    setAutoSecsLeft(60);
    setGameState('LOBBY');
    setActiveEvent(null);
    setSelectedStockModal(null);
  };

  const currentTotalGameVal = gameBalance + getGameHoldingsValue();
  const sortedLeaderboard = [...FAKE_LB, { name: 'You (Trader) 🔥', score: currentTotalGameVal }]
    .sort((a, b) => b.score - a.score);

  const activeModalStockData = gameStocks.find(s => s.sym === selectedStockModal);
  const activeModalHolding = activeModalStockData ? gameHoldings[activeModalStockData.sym] : null;

  return (
    <main className="min-h-screen bg-black text-slate-100 antialiased font-sans relative max-w-full overflow-x-hidden pt-20 pb-16">
      <Navbar />

      {gameState === 'LOBBY' ? (
        <div className="min-h-[80vh] flex items-center justify-center p-4">
          <div className="bg-[#0f0505] border border-[#2b0808] max-w-lg w-full rounded-3xl p-8 shadow-2xl text-center space-y-6 relative overflow-hidden animate-fadeIn">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="absolute top-5 right-5 h-8 w-8 bg-[#1a0808] border border-[#2b0808] hover:border-[#ff3333] hover:bg-[#7a0000] rounded-xl flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer z-20"
              title="Close & Return Home"
            >
              ✕
            </button>

            <div className="text-6xl animate-bounce pt-2">⚡</div>
            <div className="space-y-2">
              <span className="text-xs font-black uppercase tracking-widest text-[#ff3333] bg-[#1a0808] border border-[#2b0808] px-3 py-1 rounded-md">
                30-Day Speed Trading
              </span>
              <h2 className="text-2xl font-black text-white">Ready to Enter the Arena?</h2>
              <p className="text-slate-400 text-xs max-w-sm mx-auto">
                Trade 10 fast-paced high-beta assets over a 30-day timeline. Test your instincts against AI market events!
              </p>
            </div>
            <button
              onClick={startCountdownSequence}
              className="w-full py-4 bg-[#ff3333] hover:bg-[#dc2626] text-white font-black uppercase text-sm tracking-wider rounded-2xl shadow-2xl transition-all active:scale-95 cursor-pointer"
            >
              Start Arena Match
            </button>
          </div>
        </div>
      ) : (
        <div className="max-w-[1240px] mx-auto px-4 pt-4 space-y-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 border-b border-[#2b0808] pb-4 relative z-40">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                <span className="text-[#ff3333]">30-DAY</span> VOLATILITY ARENA ⚡
              </h1>
              <p className="text-slate-400 text-xs mt-1 font-medium">Click any card to inspect company stats, live charts, and place instant trades.</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3 bg-[#0f0505] border border-[#2b0808] px-4 py-2 rounded-2xl shadow-xl w-fit">
                <div className="text-xs">
                  <span className="text-slate-400 block text-[10px] uppercase font-black">Timeline Progress</span>
                  <span className="font-mono font-black text-white">Day {day} / 30</span>
                </div>
                <div className="h-6 w-[1px] bg-[#2b0808]" />
                <div className="text-xs">
                  <span className="text-slate-400 block text-[10px] uppercase font-black">Next Tick</span>
                  <span className="font-mono font-black text-[#ff3333]">{autoSecsLeft}s</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleHeaderCloseClick}
                title="Close Arena & Return Home"
                className="h-10 w-10 rounded-2xl bg-[#1a0808] hover:bg-[#7a0000] border border-[#2b0808] hover:border-[#ff3333] text-slate-300 hover:text-white flex items-center justify-center font-bold text-sm transition-all shadow-lg active:scale-95 cursor-pointer z-50"
              >
                ✕
              </button>
            </div>
          </div>

          {activeEvent && (
            <div className={`p-4 rounded-2xl border text-xs font-black shadow-lg animate-bounce ${activeEvent.col}`}>
              {activeEvent.msg}
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#0f0505] border border-[#2b0808] rounded-2xl p-4 shadow-xl">
              <span className="text-[10px] font-black tracking-wider text-slate-500 uppercase">Arena Cash</span>
              <div className="text-lg font-black mt-1 font-mono text-white">₹{gameBalance.toLocaleString('en-IN')}</div>
            </div>
            <div className="bg-[#0f0505] border border-[#2b0808] rounded-2xl p-4 shadow-xl">
              <span className="text-[10px] font-black tracking-wider text-slate-500 uppercase">Holdings Worth</span>
              <div className="text-lg font-black mt-1 font-mono text-white">₹{getGameHoldingsValue().toLocaleString('en-IN')}</div>
            </div>
            <div className="bg-[#0f0505] border border-[#2b0808] rounded-2xl p-4 shadow-xl">
              <span className="text-[10px] font-black tracking-wider text-slate-500 uppercase">Total Net Worth</span>
              <div className="text-lg font-black mt-1 font-mono text-[#ff3333]">₹{currentTotalGameVal.toLocaleString('en-IN')}</div>
            </div>
            <div className="bg-[#0f0505] border border-[#2b0808] rounded-2xl p-4 shadow-xl">
              <span className="text-[10px] font-black tracking-wider text-slate-500 uppercase">Net Profit / Loss</span>
              <div className={`text-lg font-black mt-1 font-mono ${(currentTotalGameVal - START_GAME) >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                ₹{(currentTotalGameVal - START_GAME).toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {gameStocks.map(st => {
                const hold = gameHoldings[st.sym];
                const isUp = !st.changePct.startsWith('-');

                return (
                  <div
                    key={st.sym}
                    onClick={() => {
                      if (gameState === 'RUNNING') {
                        setSelectedStockModal(st.sym);
                        setTradeQty(1);
                      }
                    }}
                    className="bg-[#0f0505] border border-[#2b0808] hover:border-[#7a0000] p-3 rounded-2xl shadow-lg transition-all duration-200 hover:scale-[1.02] cursor-pointer group flex flex-col justify-between space-y-2 relative overflow-hidden"
                  >
                    <div className="flex justify-between items-start gap-1">
                      <div className="flex items-center gap-2">
                        <div className="text-lg p-1.5 bg-[#1a0808] border border-[#2b0808] rounded-xl group-hover:scale-105 transition-transform">
                          {st.icon}
                        </div>
                        <div>
                          <h3 className="font-black text-white text-xs group-hover:text-[#ff3333] transition-colors">{st.sym}</h3>
                          <p className="text-[10px] text-slate-400 font-medium truncate max-w-[70px]">{st.name}</p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-lg font-mono border ${isUp ? 'text-emerald-400 bg-emerald-950/40 border-emerald-900/60' : 'text-rose-400 bg-rose-950/40 border-rose-900/60'}`}>
                        {st.changePct}
                      </span>
                    </div>

                    <div className="h-6 w-full flex items-end gap-1 pt-1">
                      {st.history.map((val, idx) => {
                        const max = Math.max(...st.history);
                        const min = Math.min(...st.history);
                        const heightPct = max === min ? 50 : Math.max(15, ((val - min) / (max - min)) * 100);
                        return (
                          <div
                            key={idx}
                            className={`flex-1 rounded-t transition-all ${isUp ? 'bg-emerald-500/60 group-hover:bg-emerald-400' : 'bg-rose-500/60 group-hover:bg-rose-400'}`}
                            style={{ height: `${heightPct}%` }}
                          />
                        );
                      })}
                    </div>

                    <div className="flex justify-between items-center pt-1 border-t border-[#2b0808] text-[10px]">
                      <div>
                        <span className="font-mono font-black text-white">₹{st.price.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-black text-[#ff3333]">
                          {hold ? `${hold.shares} U` : '0'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-4">
              <div className="bg-[#0f0505] border border-[#2b0808] rounded-3xl p-5 shadow-xl space-y-4">
                <h3 className="font-black text-xs uppercase tracking-wider text-slate-400 border-b border-[#2b0808] pb-3 flex items-center justify-between">
                  <span>Arena Standings</span>
                  <span className="text-[#ff3333]">Season 1</span>
                </h3>
                <div className="space-y-2.5">
                  {sortedLeaderboard.map((player, idx) => (
                    <div
                      key={player.name}
                      className={`flex justify-between items-center text-xs p-3 rounded-2xl border ${player.name.includes('You') ? 'bg-[#1a0808] border-[#7a0000] font-black text-[#ff3333]' : 'border-[#2b0808] bg-[#0f0505] text-slate-300'}`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono font-black text-slate-500 text-sm">#{idx + 1}</span>
                        <span>{player.name}</span>
                      </div>
                      <span className="font-mono font-bold text-white">₹{Math.round(player.score).toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={resetChallengeArena}
                  className="w-full text-center py-3 border border-[#2b0808] hover:border-rose-900/60 text-slate-400 hover:text-rose-400 text-xs font-bold bg-[#1a0808] rounded-2xl transition-all cursor-pointer"
                >
                  Reset Arena Game
                </button>
              </div>

              {gameState === 'FINISHED' && (
                <div className="bg-gradient-to-br from-[#7a0000] to-black border border-[#a30000] text-white p-6 rounded-3xl shadow-2xl space-y-4 text-center">
                  <div className="text-5xl">🏆</div>
                  <h2 className="font-black text-xl">30-Day Arena Finished!</h2>
                  <p className="text-rose-200/80 text-xs">Your final standing portfolio net worth:</p>
                  <div className="text-2xl font-black font-mono bg-black/50 p-3 rounded-2xl border border-white/10">
                    ₹{Math.round(currentTotalGameVal).toLocaleString('en-IN')}
                  </div>
                  <button
                    onClick={resetChallengeArena}
                    className="w-full py-3.5 bg-[#ff3333] hover:bg-[#dc2626] text-white font-black uppercase text-xs tracking-wider rounded-2xl shadow-lg transition-all cursor-pointer"
                  >
                    Start New Session
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {gameState === 'COUNTDOWN' && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-50 flex flex-col items-center justify-center">
          <div className="text-8xl font-black text-[#ff3333] animate-ping font-mono">
            {countdownNum}
          </div>
          <div className="text-sm font-black uppercase tracking-widest text-slate-400 mt-6 animate-pulse">
            Initializing Volatility Engine...
          </div>
        </div>
      )}

      {showExitModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#0f0505] border border-[#7a0000] max-w-md w-full rounded-3xl p-6 shadow-2xl space-y-5 text-center">
            <div className="text-4xl text-rose-500">⚠️</div>
            <div className="space-y-2">
              <h2 className="text-xl font-black text-white">Forfeit Arena Match?</h2>
              <p className="text-slate-400 text-xs">
                Leaving this page will forfeit your live 30-day Arena progress and reset your session rank.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={confirmExitAndNavigate}
                className="flex-1 bg-rose-700 hover:bg-rose-800 text-white font-black text-xs uppercase py-3 rounded-xl transition-all cursor-pointer"
              >
                Forfeit &amp; Leave
              </button>
              <button
                onClick={() => {
                  setShowExitModal(false);
                  setPendingHref(null);
                }}
                className="flex-1 bg-[#1a0808] border border-[#2b0808] text-slate-300 font-bold text-xs uppercase py-3 rounded-xl transition-all cursor-pointer"
              >
                Keep Playing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMPANY DOSSIER & TRADING MODAL */}
      {activeModalStockData && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn overflow-y-auto">
          <div className="bg-[#0f0505] border border-[#2b0808] max-w-5xl w-full rounded-3xl p-5 md:p-6 shadow-2xl relative my-auto">
            <button
              onClick={() => setSelectedStockModal(null)}
              className="absolute top-4 right-4 h-8 w-8 bg-[#1a0808] border border-[#2b0808] rounded-xl flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer z-10"
              aria-label="Close company details"
            >
              ✕
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
              {/* LEFT: PRICE GRAPH */}
              <div className="min-w-0">
                <ArenaPriceChart stock={activeModalStockData} />
              </div>

              {/* RIGHT: COMPANY DETAILS AND TRADING CONTROLS */}
              <div className="min-w-0 space-y-5 pt-1">
                <div className="flex items-center gap-4 pr-8">
                  <div className="text-4xl p-3 bg-[#1a0808] border border-[#2b0808] rounded-2xl">
                    {activeModalStockData.icon}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#ff3333] bg-[#1a0808] border border-[#2b0808] px-2 py-0.5 rounded">
                      {activeModalStockData.sector}
                    </span>
                    <h2 className="text-xl font-black text-white mt-1">
                      {activeModalStockData.name} ({activeModalStockData.sym})
                    </h2>
                  </div>
                </div>

                <p className="text-xs text-slate-300 bg-[#1a0808] p-3.5 rounded-2xl border border-[#2b0808]">
                  {activeModalStockData.desc}
                </p>

                <div className="grid grid-cols-2 gap-4 bg-[#1a0808] p-4 rounded-2xl border border-[#2b0808] font-mono text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-black font-sans block">Current Asset Rate</span>
                    <span className="text-lg font-black text-white">
                      ₹{activeModalStockData.price.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-black font-sans block">Owned In Position</span>
                    <span className="text-lg font-black text-[#ff3333]">
                      {activeModalHolding ? `${activeModalHolding.shares} Units` : '0 Units'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Order Quantity Size
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <input
                      type="number"
                      min="1"
                      value={tradeQty}
                      onChange={e => setTradeQty(Math.max(1, parseInt(e.target.value) || 1))}
                      className="flex-1 min-w-[100px] bg-[#1a0808] border border-[#2b0808] rounded-2xl px-4 py-2.5 font-mono text-sm font-bold text-white focus:outline-none focus:border-[#7a0000]"
                    />
                    <button
                      onClick={() => setTradeQty(5)}
                      className="bg-[#1a0808] border border-[#2b0808] hover:border-[#7a0000] text-xs font-bold px-3.5 rounded-2xl text-slate-300 cursor-pointer"
                    >
                      5x
                    </button>
                    <button
                      onClick={() => setTradeQty(10)}
                      className="bg-[#1a0808] border border-[#2b0808] hover:border-[#7a0000] text-xs font-bold px-3.5 rounded-2xl text-slate-300 cursor-pointer"
                    >
                      10x
                    </button>
                    <button
                      onClick={() => {
                        const maxPossible = Math.floor(gameBalance / activeModalStockData.price);
                        setTradeQty(Math.max(1, maxPossible));
                      }}
                      className="bg-[#1a0808] border border-[#2b0808] hover:border-[#7a0000] text-xs font-bold px-3.5 rounded-2xl text-[#ff3333] cursor-pointer"
                    >
                      MAX
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => handleGameTrade(activeModalStockData.sym, 'BUY', tradeQty)}
                    disabled={gameState !== 'RUNNING'}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider py-3.5 rounded-2xl shadow-lg transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
                  >
                    Buy Asset
                  </button>
                  <button
                    onClick={() => handleGameTrade(activeModalStockData.sym, 'SELL', tradeQty)}
                    disabled={gameState !== 'RUNNING' || !activeModalHolding}
                    className="flex-1 bg-rose-700 hover:bg-rose-800 text-white font-black text-xs uppercase tracking-wider py-3.5 rounded-2xl shadow-lg transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
                  >
                    Sell Asset
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
