'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';

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
  
  // Power-ups state tracking
  const [powerUps, setPowerUps] = useState({ fiftyFifty: 1, freezeTime: 1, skipQuestion: 1 });
  const [hiddenOptions, setHiddenOptions] = useState([]);
  const [isTimerFrozen, setIsTimerFrozen] = useState(false);

  // Timer configuration metrics (5 Minutes Total = 300 seconds)
  const [timeLeft, setTimeLeft] = useState(300);
  const [totalTimeSpent, setTotalTimeSpent] = useState(0);
  const timerRef = useRef(null);

  // Leaderboard toggle context
  const [showQuizLeaderboard, setShowQuizLeaderboard] = useState(false);
  const [quizLeaderboard, setQuizLeaderboard] = useState([]);

  useEffect(() => {
    const fetchUserSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        
        // Fetch current user's profile information
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        setProfile(prof);

        // Check lock state against today's date string (YYYY-MM-DD)
        const todayStr = new Date().toISOString().split('T')[0];
        if (prof?.last_quiz_date === todayStr) {
          setHasPlayedToday(true);
        }
        
        // Fetch leaderboard and calculate rank positions
        await fetchQuizLeaderboard(session.user.id);
      }
      setLoading(false);
    };
    fetchUserSession();
  }, []);

  // Countdown clock engine
  useEffect(() => {
    if (quizActive && !quizCompleted) {
      timerRef.current = setInterval(() => {
        if (!isTimerFrozen) {
          setTimeLeft((prev) => {
            if (prev <= 1) {
              handleQuizEnd(true);
              return 0;
            }
            setTotalTimeSpent((t) => t + 1);
            return prev - 1;
          });
        }
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [quizActive, quizCompleted, isTimerFrozen]);

  const fetchQuizLeaderboard = async (currentUserId) => {
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
      const targetIndex = allRanks.findIndex(p => p.id === currentUserId);
      if (targetIndex !== -1) {
        setUserRank(targetIndex + 1);
      }
    }
  };

  const startDailyQuizStream = async () => {
    if (!user) return alert("Please login to attempt the Daily Quiz Arena!");
    if (hasPlayedToday) return alert("You have already completed your daily quiz challenge. Come back tomorrow for fresh questions!");
    
    setLoading(true);
    setApiError(false);
    
    try {
      const res = await fetch('/api/generate-quiz');
      if (!res.ok) throw new Error("API failure");
      
      const generatedPool = await res.json();

      if (generatedPool && Array.isArray(generatedPool) && generatedPool.length === 15) {
        setQuestions(generatedPool);
      } else {
        throw new Error("Invalid array data");
      }
    } catch (err) {
      console.error("Quiz collection route issue, loading alternative pool:", err);
      setApiError(true);
      setQuestions(generateSampleQuestionPool());
    }

    // Reset game parameters completely
    setTimeLeft(300);
    setTotalTimeSpent(0);
    setScore(0);
    setCurrentIdx(0);
    setPointsEarned(0);
    setHiddenOptions([]);
    setIsTimerFrozen(false);
    setPowerUps({ fiftyFifty: 1, freezeTime: 1, skipQuestion: 1 });
    setQuizActive(true);
    setQuizCompleted(false);
    setLoading(false);
  };

  const handleAnswerSelection = (choice) => {
    if (selectedAnswer !== null) return; 
    setSelectedAnswer(choice);
    
    const currentQuestion = questions[currentIdx];
    const isCorrect = choice === currentQuestion.correct_option;

    if (isCorrect) {
      setScore((prev) => prev + 1);
    }

    setTimeout(() => {
      if (currentIdx + 1 < questions.length) {
        setCurrentIdx((prev) => prev + 1);
        setSelectedAnswer(null);
        setHiddenOptions([]);
        setIsTimerFrozen(false);
      } else {
        handleQuizEnd(false);
      }
    }, 1500);
  };

  // POWER-UPS PIPELINE
  const useFiftyFifty = () => {
    if (powerUps.fiftyFifty <= 0 || selectedAnswer !== null) return;
    const currentQuestion = questions[currentIdx];
    const wrongOptions = ['A', 'B', 'C', 'D'].filter(opt => opt !== currentQuestion.correct_option);
    const toHide = wrongOptions.sort(() => 0.5 - Math.random()).slice(0, 2);
    setHiddenOptions(toHide);
    setPowerUps(prev => ({ ...prev, fiftyFifty: 0 }));
  };

  const useTimeFreeze = () => {
    if (powerUps.freezeTime <= 0 || selectedAnswer !== null) return;
    setIsTimerFrozen(true);
    setPowerUps(prev => ({ ...prev, freezeTime: 0 }));
  };

  const useSkipQuestion = () => {
    if (powerUps.skipQuestion <= 0 || selectedAnswer !== null) return;
    setPowerUps(prev => ({ ...prev, skipQuestion: 0 }));
    if (currentIdx + 1 < questions.length) {
      setCurrentIdx((prev) => prev + 1);
      setHiddenOptions([]);
      setIsTimerFrozen(false);
    } else {
      handleQuizEnd(false);
    }
  };

  const handleQuizEnd = async (timeout = false) => {
    clearInterval(timerRef.current);
    setQuizCompleted(true);
    setQuizActive(false);

    const calculatedPoints = score * 100;
    setPointsEarned(calculatedPoints);

    if (user) {
      const currentPoints = profile?.quiz_points || 0;
      const updatedPoints = currentPoints + calculatedPoints;
      const todayStr = new Date().toISOString().split('T')[0];
      
      // Update score and lock calendar date to deny same-day play loops
      await supabase.from('profiles').update({ 
        quiz_points: updatedPoints,
        last_quiz_date: todayStr
      }).eq('id', user.id);
      
      setProfile(prev => ({ ...prev, quiz_points: updatedPoints, last_quiz_date: todayStr }));
      setHasPlayedToday(true);
    }
    await fetchQuizLeaderboard(user?.id);
  };

  const shareAchievement = () => {
    const text = `🎯 I just scored ${score}/15 on the Bull Run Daily Quiz Arena and I'm currently Ranked #${userRank}! Can you beat my financial strategy? Check it out! 🚀`;
    navigator.clipboard.writeText(text);
    alert("Achievement copied to clipboard! Share it with your friends. 🙌");
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const generateSampleQuestionPool = () => {
    return [
      { id: 201, question_text: "Which metric measures a stock's individual volatility relative to the broader market index layers?", option_a: "Alpha Value", option_b: "Delta Level", option_c: "Beta Coefficient", option_d: "Gamma Delta", correct_option: "C" },
      { id: 202, question_text: "What financial statement shows a company's structural assets, liabilities, and equity parameters?", option_a: "Income Statement", option_b: "Balance Sheet", option_c: "Cash Flow Matrix", option_d: "Ledger Accounts", correct_option: "B" },
      { id: 203, question_text: "What cash payout portion do corporations distribute directly out of net profits back to shareholders?", option_a: "Bonus Issue", option_b: "Retained Reserve", option_c: "Dividend Balance", option_d: "Premium Spread", correct_option: "C" },
      { id: 204, question_text: "What type of fast market order tells a system broker to execute an immediate buy/sell trade at standard spot prices?", option_a: "Limit Order", option_b: "Market Order", option_c: "Stop Loss Anchor", option_d: "Bracket Layer", correct_option: "B" },
      { id: 205, question_text: "Which primary regulatory council body oversees securities, derivative assets, and capital exchanges in India?", option_a: "RBI Group", option_b: "IRDAI Unit", option_c: "SEBI Council", option_d: "AMFI Registry", correct_option: "C" },
      { id: 206, question_text: "What parameter handles total outstanding share metrics multiplied against current market price values?", option_a: "Asset Turnover", option_b: "Market Capitalization", option_c: "Net Asset Multiplier", option_d: "Gross Book Revenue", correct_option: "B" },
      { id: 207, question_text: "What term describes the first public sale configuration of corporate equity shares to open retail markets?", option_a: "Initial Public Offering (IPO)", option_b: "Rights Issue Track", option_c: "Private Placement Block", option_d: "Bonus Dividend Split", correct_option: "A" },
      { id: 208, question_text: "What standard settlement sequence represents core share delivery timelines across modern local exchanges?", option_a: "T+1 Sequence", option_b: "T+3 Sequence", option_c: "T+5 Sequence", option_d: "Instantaneous Loop", correct_option: "A" },
      { id: 209, question_text: "When a stock chart breaks above a prominent historical resistance ceiling, what trading signal is typically formed?", option_a: "Short Sell Alert", option_b: "Breakout Signal", option_c: "Mean Reversion Pivot", option_d: "Dead Cat Bounce", correct_option: "B" },
      { id: 210, question_text: "Which primary stock index tracks the weighted baseline average of the 50 largest companies on the NSE?", option_a: "Sensex Index", option_b: "Nifty 50", option_c: "Nifty Next Smallcap", option_d: "BSE Midcap Track", correct_option: "B" },
      { id: 211, question_text: "What situation happens to existing outstanding coupon bond prices when macro market interest rates shift higher?", option_a: "Bond prices appreciate", option_b: "Bond prices depreciate", option_c: "Values align static", option_d: "Immediate default state", correct_option: "B" },
      { id: 212, question_text: "What core financial strategy spreads risk across non-correlated asset categories to lower systematic volatility downsides?", option_a: "Short Leveraging", option_b: "Diversification", option_c: "Margin Compounding", option_d: "Concentration Bias", correct_option: "B" },
      { id: 213, question_text: "What does a Price-to-Earnings (P/E) ratio explicitly compare to determine relative company valuation lines?", option_a: "Price vs Equity Value", option_b: "Stock Price vs Earnings Per Share", option_c: "Profit vs Expense Margins", option_d: "Premium Spread vs Debt Book", correct_option: "B" },
      { id: 214, question_text: "What structural adjustment increases total shares outstanding while dropping stock price proportionately without changing value?", option_a: "Share Buyback Run", option_b: "Stock Split Action", option_c: "Rights Allotment Step", option_d: "Delisting Audits", correct_option: "B" },
      { id: 215, question_text: "What form of high-liquidity mutual fund structure concentrates trades within ultra-short term money instruments?", option_a: "Sector Growth Fund", option_b: "Liquid Debt Fund", option_c: "Balanced Hybrid Matrix", option_d: "Contra Value Track", correct_option: "B" }
    ];
  };

  return (
    <main className="min-h-screen bg-black text-slate-100 antialiased font-sans relative max-w-full overflow-x-hidden pt-24 pb-20">
      <Navbar />

      <section className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8 relative z-10 animate-fadeInFast">
        
        {/* PERSONAL STANDINGS CARD BADGE */}
        {profile && !quizActive && (
          <div className="max-w-md mx-auto bg-[#0f0505] border-2 border-[#2b0808] border-b-2 border-b-[#7a0000] text-white rounded-2xl p-4 flex items-center justify-between shadow-2xl">
            <div>
              <p className="text-[10px] uppercase font-black tracking-wider text-slate-400">Your Current Status</p>
              <h4 className="text-sm font-black text-white">{profile.name || "Anonymous Trader"}</h4>
            </div>
            <div className="flex gap-4 text-right">
              <div>
                <p className="text-[10px] uppercase font-black tracking-wider text-slate-400">Rank</p>
                <p className="text-sm font-mono font-black text-amber-400">#{userRank}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-black tracking-wider text-slate-400">Balance</p>
                <p className="text-sm font-mono font-black text-[#ff3333]">{profile.quiz_points || 0} BB</p>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="text-center text-xs font-bold text-slate-400 py-12 animate-pulse">
            Configuring Live Battleground Grid Parameters...
          </div>
        )}

        {!quizActive && !quizCompleted && !loading && (
          <div className="text-center space-y-4 max-w-xl mx-auto">
            <span className="inline-flex items-center bg-[#1a0808] border border-[#2b0808] text-[#ff3333] text-[11px] uppercase tracking-widest font-black px-4 py-1.5 rounded-full shadow-inner animate-pulse">
              🧠 Financial Intelligence Battleground
            </span>
            <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-none font-poppins">
              Daily MCQ Arena
            </h1>
            <p className="text-slate-400 text-xs font-medium leading-relaxed">
              Attempt 15 dynamic randomized stock and macro economy questions generated fresh on the fly. Compete for ultimate platform rank honors under 5 minutes.
            </p>
            <div className="pt-4 flex flex-wrap justify-center gap-4">
              {hasPlayedToday ? (
                <div className="px-6 py-4 bg-[#0f0505] text-slate-500 font-black border border-[#2b0808] rounded-2xl text-xs uppercase tracking-wider shadow-inner cursor-not-allowed">
                  🔒 Locked: Quiz Attempted Today
                </div>
              ) : (
                <button 
                  onClick={startDailyQuizStream} 
                  className="px-8 py-4 bg-[#7a0000] hover:bg-[#a30000] text-white font-black rounded-2xl text-xs uppercase tracking-wider shadow-xl transition-all transform hover:-translate-y-0.5 border-b-2 border-b-[#4a0000]"
                >
                  Launch Today&apos;s Quiz (5m) ⏱️
                </button>
              )}
              <button 
                onClick={() => setShowQuizLeaderboard(!showQuizLeaderboard)} 
                className="px-6 py-4 bg-[#0f0505] border-2 border-[#2b0808] text-slate-300 font-bold rounded-2xl text-xs uppercase tracking-wider hover:border-[#7a0000] hover:text-white transition-all shadow-md"
              >
                {showQuizLeaderboard ? 'Hide Standings' : 'Check Quiz Rank 🏆'}
              </button>
            </div>
          </div>
        )}

        {quizCompleted && (
          <div className="bg-[#0f0505] border-2 border-[#2b0808] border-b-4 border-b-[#7a0000] rounded-3xl p-8 max-w-md mx-auto text-center shadow-2xl space-y-6 animate-scaleUp">
            <div className="text-6xl">🎯</div>
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-white font-poppins">Arena Run Complete!</h2>
              <p className="text-xs text-slate-400 font-medium">Your financial pipeline metrics are secured.</p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-left">
              <div className="p-3.5 bg-[#1a0808] rounded-xl border border-[#2b0808]">
                <p className="text-[10px] font-black uppercase text-slate-400">Accuracy</p>
                <p className="text-xl font-black text-white font-mono">{score} / {questions.length}</p>
              </div>
              <div className="p-3.5 bg-emerald-950/40 rounded-xl border border-emerald-900/60">
                <p className="text-[10px] font-black uppercase text-emerald-400">Earned Payout</p>
                <p className="text-xl font-black text-emerald-400 font-mono">+{pointsEarned} BB</p>
              </div>
              <div className="p-3.5 bg-[#1a0808] rounded-xl border border-[#2b0808] col-span-2 text-center">
                <p className="text-[10px] font-black uppercase text-[#ff3333]">Total Run Time Invested</p>
                <p className="text-lg font-black text-rose-300 font-mono">{formatTime(totalTimeSpent)}</p>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button 
                onClick={shareAchievement} 
                className="w-full py-3 bg-[#7a0000] hover:bg-[#a30000] text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md"
              >
                Share Achievement Context 🚀
              </button>
              <button 
                onClick={() => { setQuizCompleted(false); setShowQuizLeaderboard(true); }} 
                className="w-full py-3 bg-[#1a0808] text-slate-300 font-bold text-xs uppercase tracking-wider rounded-xl hover:text-white border border-[#2b0808] hover:border-[#7a0000] transition-all"
              >
                Check Quiz Standing Map
              </button>
            </div>
          </div>
        )}

        {quizActive && questions.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-[#0f0505] border-2 border-[#2b0808] px-6 py-4 rounded-2xl shadow-xl">
              <div className="font-bold text-xs text-slate-300">
                Question <span className="font-mono font-black text-[#ff3333] text-sm">{currentIdx + 1}</span> / {questions.length}
                {apiError && <span className="ml-2 text-[10px] text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-900/60">Local Mode</span>}
              </div>
              
              <div className={`px-4 py-1.5 rounded-full text-xs font-mono font-black tracking-wider flex items-center gap-1.5 border transition-all ${
                timeLeft <= 60 ? 'bg-rose-950/60 text-rose-400 border-rose-900/80 animate-pulse' : 'bg-[#1a0808] text-white border-[#2b0808]'
              }`}>
                ⏰ {formatTime(timeLeft)} {isTimerFrozen && <span className="text-[9px] bg-sky-600 text-white px-1 py-0.5 rounded ml-1 animate-bounce">FROZEN</span>}
              </div>
            </div>

            <div className="bg-[#0f0505] border border-[#2b0808] p-3 rounded-2xl flex justify-center items-center gap-4 flex-wrap">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Tactical Add-ons:</span>
              <button 
                disabled={powerUps.fiftyFifty <= 0 || selectedAnswer !== null} 
                onClick={useFiftyFifty} 
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${powerUps.fiftyFifty > 0 ? 'bg-[#1a0808] border-[#2b0808] text-slate-200 hover:border-[#7a0000] shadow-sm' : 'bg-[#0f0505] text-slate-600 border-transparent cursor-not-allowed'}`}
              >
                🌓 50:50 ({powerUps.fiftyFifty})
              </button>
              <button 
                disabled={powerUps.freezeTime <= 0 || selectedAnswer !== null || isTimerFrozen} 
                onClick={useTimeFreeze} 
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${powerUps.freezeTime > 0 ? 'bg-[#1a0808] border-[#2b0808] text-slate-200 hover:border-[#7a0000] shadow-sm' : 'bg-[#0f0505] text-slate-600 border-transparent cursor-not-allowed'}`}
              >
                ❄️ Time Freeze ({powerUps.freezeTime})
              </button>
              <button 
                disabled={powerUps.skipQuestion <= 0 || selectedAnswer !== null} 
                onClick={useSkipQuestion} 
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${powerUps.skipQuestion > 0 ? 'bg-[#1a0808] border-[#2b0808] text-slate-200 hover:border-[#7a0000] shadow-sm' : 'bg-[#0f0505] text-slate-600 border-transparent cursor-not-allowed'}`}
              >
                ⏩ Skip Field ({powerUps.skipQuestion})
              </button>
            </div>

            <div className="bg-[#0f0505] border-2 border-[#2b0808] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
              <h3 className="text-base sm:text-lg font-black text-white leading-relaxed font-poppins">
                {questions[currentIdx]?.question_text}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {['A', 'B', 'C', 'D'].map((optionLetter) => {
                  const choiceString = questions[currentIdx][`option_${optionLetter.toLowerCase()}`];
                  const isHidden = hiddenOptions.includes(optionLetter);
                  const isSelected = selectedAnswer === optionLetter;
                  const isCorrectAnswer = optionLetter === questions[currentIdx].correct_option;
                  
                  if (isHidden) return <div key={optionLetter} className="hidden sm:block opacity-0 pointer-events-none" />;

                  let optionStyle = "bg-[#1a0808] border-[#2b0808] text-slate-300 hover:bg-[#2b0808] hover:border-[#7a0000]";
                  if (selectedAnswer !== null) {
                    if (isSelected) {
                      optionStyle = isCorrectAnswer 
                        ? "bg-emerald-950/60 border-emerald-600 text-emerald-300 font-bold shadow-md" 
                        : "bg-rose-950/60 border-rose-600 text-rose-300 font-bold shadow-md";
                    } else if (isCorrectAnswer) {
                      optionStyle = "bg-emerald-950/60 border-emerald-600 text-emerald-300 font-bold shadow-md";
                    } else {
                      optionStyle = "bg-[#0f0505] border-[#2b0808] text-slate-600 opacity-50";
                    }
                  }

                  return (
                    <button
                      key={optionLetter}
                      disabled={selectedAnswer !== null}
                      onClick={() => handleAnswerSelection(optionLetter)}
                      className={`p-4 text-left rounded-2xl border-2 font-bold text-xs sm:text-sm transition-all flex items-center justify-between ${optionStyle}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`h-6 w-6 rounded-lg text-[10px] font-black flex items-center justify-center border ${
                          isSelected ? 'bg-[#ff3333] text-white border-[#ff3333]' : 'bg-[#0f0505] text-slate-400 border-[#2b0808]'
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

        {showQuizLeaderboard && !quizActive && (
          <div className="bg-[#0f0505] border-2 border-[#2b0808] rounded-3xl overflow-hidden shadow-2xl space-y-4 p-6 animate-fadeInFast">
            <div className="flex justify-between items-center border-b border-[#2b0808] pb-3">
              <div>
                <h3 className="text-base font-black text-white font-poppins">Bazaar Bucks (BB) Standings</h3>
                <p className="text-[10px] text-slate-400 font-medium">Top quiz masters ranked by cumulative correct payouts.</p>
              </div>
              <button onClick={() => setShowQuizLeaderboard(false)} className="text-xs font-bold text-[#ff3333] hover:underline">Close Table</button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[#1a0808] text-[9px] font-black uppercase text-slate-400 tracking-wider">
                    <th className="p-3 text-center w-14">Rank</th>
                    <th className="p-3">Trader</th>
                    <th className="p-3">Track</th>
                    <th className="p-3 text-right">Quiz Payout Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2b0808] text-xs font-bold text-slate-300">
                  {quizLeaderboard.map((trader, idx) => (
                    <tr key={idx} className={`hover:bg-[#1a0808]/80 ${trader.id === user?.id ? 'bg-[#7a0000]/20 border-y border-[#7a0000]' : ''}`}>
                      <td className="p-3 text-center font-mono font-black text-white">
                        #{idx + 1} {trader.id === user?.id && "⭐"}
                      </td>
                      <td className="p-3 text-white font-black">
                        {trader.name ? trader.name : "Anonymous Trader"}
                      </td>
                      <td className="p-3 text-[10px] font-mono text-slate-400 uppercase">{trader.role}</td>
                      <td className="p-3 text-right font-mono font-black text-[#ff3333]">{trader.quiz_points || 0} BB</td>
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