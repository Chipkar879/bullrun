'use client';

import React, { useState, useEffect, useRef } from 'react';

// DYNAMIC LESSON CONTENT FORMATTER
function FormattedLessonContent({ content }) {
  if (!content) return null;

  const blocks = content.split(/\n\s*\n/);

  return (
    <div className="space-y-4 font-sans text-xs sm:text-sm">
      {blocks.map((block, idx) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        const firstLine = trimmed.split('\n')[0].trim();

        if (
          firstLine.startsWith('⚡') || 
          firstLine.startsWith('🏬') || 
          firstLine.startsWith('🕵️') ||
          firstLine.includes('MISSION BRIEFING') ||
          firstLine.includes('FINANCIAL INTEL')
        ) {
          const lines = trimmed.split('\n');
          const title = lines[0];
          const body = lines.slice(1).join('\n');

          return (
            <div key={idx} className="bg-gradient-to-r from-bull-raised via-bull-surface to-bull-bg border border-bull-lime/50 rounded-2xl p-5 shadow-[0_0_20px_color-mix(in_srgb,var(--color-bull-lime)_15%,transparent)] space-y-2">
              <div className="flex items-center gap-2">
                <span className="bg-bull-lime text-bull-ink text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-md font-mono shadow-md">
                  INTEL HEADER
                </span>
                <h4 className="text-white font-black text-sm sm:text-base tracking-tight">
                  {title}
                </h4>
              </div>
              {body && (
                <p className="text-slate-300 font-medium leading-relaxed pt-1">
                  {body}
                </p>
              )}
            </div>
          );
        }

        if (
          firstLine.startsWith('💡') || 
          firstLine.startsWith('⚠️') || 
          firstLine.startsWith('🎯') || 
          firstLine.startsWith('🔑') ||
          firstLine.includes('CORE GOAL') ||
          firstLine.includes('CRITICAL WARNING') ||
          firstLine.includes('CORE TAKEAWAY')
        ) {
          const lines = trimmed.split('\n');
          const title = lines[0];
          const body = lines.slice(1).join('\n');
          const isWarning = firstLine.startsWith('⚠️') || firstLine.includes('WARNING');

          return (
            <div 
              key={idx} 
              className={`p-5 rounded-2xl border transition-all ${
                isWarning 
                  ? 'bg-rose-950/40 border-rose-500/60 text-rose-200 shadow-[0_0_20px_color-mix(in_srgb,var(--color-bull-coral)_20%,transparent)]' 
                  : 'bg-amber-950/40 border-amber-500/60 text-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
              } space-y-2`}
            >
              <div className="flex items-center gap-2 font-black text-xs sm:text-sm uppercase tracking-wider font-mono">
                <span className="bg-bull-bg/50 px-2.5 py-1 rounded-lg border border-current">{title}</span>
              </div>
              {body && (
                <div className="text-slate-100 text-xs sm:text-sm font-medium leading-relaxed pt-1 space-y-1.5">
                  {body.split('\n').map((l, lineIdx) => (
                    <p key={lineIdx}>{l}</p>
                  ))}
                </div>
              )}
            </div>
          );
        }

        if (
          firstLine.startsWith('🍕') || 
          /^\d+\./.test(firstLine) || 
          firstLine.includes('TYPES') || 
          firstLine.includes('CALCULATION')
        ) {
          const lines = trimmed.split('\n');
          const title = lines[0];
          const bodyLines = lines.slice(1);

          return (
            <div key={idx} className="bg-bull-surface border border-bull-line hover:border-bull-lime/50 rounded-2xl p-5 space-y-3 transition-colors shadow-xl">
              <h4 className="text-white font-black text-xs sm:text-sm tracking-tight flex items-center gap-2 text-rose-400 font-mono">
                <span className="h-2 w-2 rounded-full bg-bull-lime" />
                {title}
              </h4>
              {bodyLines.length > 0 && (
                <div className="space-y-2 text-slate-300 font-medium">
                  {bodyLines.map((line, lIdx) => {
                    const trimmedLine = line.trim();
                    if (trimmedLine.startsWith('•') || trimmedLine.startsWith('-')) {
                      return (
                        <div key={lIdx} className="flex items-start gap-2.5 bg-bull-bg p-3 rounded-xl border border-bull-line text-xs">
                          <span className="text-bull-lime font-black font-mono">➢</span>
                          <span className="text-slate-100 leading-relaxed">{trimmedLine.replace(/^[•-]\s*/, '')}</span>
                        </div>
                      );
                    }
                    return <p key={lIdx} className="text-slate-200 text-xs sm:text-sm leading-relaxed">{line}</p>;
                  })}
                </div>
              )}
            </div>
          );
        }

        return (
          <div key={idx} className="bg-bull-surface border border-bull-line p-5 rounded-2xl text-slate-200 leading-relaxed font-medium shadow-md">
            {trimmed.split('\n').map((line, lIdx) => (
              <p key={lIdx} className={lIdx > 0 ? 'mt-2' : ''}>
                {line}
              </p>
            ))}
          </div>
        );
      })}
    </div>
  );
}

export default function InteractiveCourseWrapper({ initialTracks = [] }) {
  const [completedSubmodules, setCompletedSubmodules] = useState([]);
  const [userXP, setUserXP] = useState(0);

  const [selectedTrackId, setSelectedTrackId] = useState(null);
  const [activeModalSubmod, setActiveModalSubmod] = useState(null);
  const [modalTab, setModalTab] = useState('lesson');

  const [userAnswers, setUserAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizPassed, setQuizPassed] = useState(false);

  // SCROLL CONTAINER REFS
  const trackScrollRef = useRef(null);
  const submodScrollRefs = useRef({});

  useEffect(() => {
    try {
      const savedProgress = localStorage.getItem('bullrun_module_progress');
      if (savedProgress) {
        const parsed = JSON.parse(savedProgress);
        setCompletedSubmodules(parsed);
        setUserXP(parsed.length * 100);
      }
    } catch (err) {
      console.warn('Could not load module progress:', err);
    }
  }, []);

  const saveProgressToLocalStorage = (updatedCompleted) => {
    try {
      localStorage.setItem('bullrun_module_progress', JSON.stringify(updatedCompleted));
      setUserXP(updatedCompleted.length * 100);
    } catch (err) {
      console.warn('Could not save progress:', err);
    }
  };

  const allSubmodules = initialTracks.flatMap(track => 
    (track.modules || []).flatMap(mod => mod.submodules || [])
  );

  const activeTrack = initialTracks.find(t => t.id === selectedTrackId);

  const handleTrackCardClick = (trackId) => {
    setSelectedTrackId(prev => prev === trackId ? null : trackId);
    setActiveModalSubmod(null);
  };

  const openSubmoduleModal = (submod) => {
    setActiveModalSubmod(submod);
    setModalTab('lesson');
    setUserAnswers({});
    setQuizSubmitted(false);
    setQuizPassed(false);
  };

  const handleSelectOption = (questionIndex, optionIndex) => {
    if (quizSubmitted) return;
    setUserAnswers(prev => ({ ...prev, [questionIndex]: optionIndex }));
  };

  const handleVerifyQuiz = () => {
    if (!activeModalSubmod?.quiz) return;
    
    let correctCount = 0;
    activeModalSubmod.quiz.forEach((q, idx) => {
      if (userAnswers[idx] === q.correctIndex) {
        correctCount++;
      }
    });

    setQuizSubmitted(true);
    if (correctCount >= Math.ceil(activeModalSubmod.quiz.length * 0.8)) {
      setQuizPassed(true);
    } else {
      setQuizPassed(false);
    }
  };

  const handleCompleteSubmodule = (submodId) => {
    if (!completedSubmodules.includes(submodId)) {
      const updated = [...completedSubmodules, submodId];
      setCompletedSubmodules(updated);
      saveProgressToLocalStorage(updated);
    }
    setActiveModalSubmod(null);
  };

  const isSubmoduleUnlocked = (submodId) => {
    const index = allSubmodules.findIndex(sm => sm.id === submodId);
    if (index === 0) return true; 
    return completedSubmodules.includes(allSubmodules[index - 1]?.id);
  };

  const isTrackUnlocked = (trackIdx) => {
    if (trackIdx === 0) return true;
    const prevTrack = initialTracks[trackIdx - 1];
    const prevTrackSubmods = (prevTrack?.modules || []).flatMap(m => m.submodules || []);
    
    if (!prevTrackSubmods || prevTrackSubmods.length === 0) return false;
    return prevTrackSubmods.every(sm => completedSubmodules.includes(sm.id));
  };

  // SCROLL FUNCTIONS
  const scrollTracks = (direction) => {
    if (trackScrollRef.current) {
      const scrollAmount = direction === 'left' ? -350 : 350;
      trackScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const scrollSubmodules = (modId, direction) => {
    const targetRef = submodScrollRefs.current[modId];
    if (targetRef) {
      const scrollAmount = direction === 'left' ? -320 : 320;
      targetRef.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-10 relative antialiased font-sans">
      
      {/* GAMIFIED STATS BANNER */}
      <div className="bg-bull-surface border border-bull-line p-4 rounded-3xl flex flex-wrap items-center justify-between gap-4 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-bull-raised border border-bull-lime/40 flex items-center justify-center text-xl shadow-[0_0_15px_color-mix(in_srgb,var(--color-bull-lime)_20%,transparent)]">
            ⚡
          </div>
          <div>
            <span className="text-[10px] font-black tracking-widest text-bull-lime uppercase block font-mono">
              TRADER LEVEL {Math.floor(userXP / 500) + 1}
            </span>
            <h3 className="text-sm font-black text-white font-mono">
              {userXP < 500 ? 'Novice Investor' : userXP < 1500 ? 'Market Strategist' : 'Wall Street Architect'}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-6 font-mono text-xs">
          <div className="bg-bull-raised border border-bull-line px-3.5 py-1.5 rounded-xl">
            <span className="text-slate-500 text-[10px] block font-sans uppercase font-black">TOTAL XP</span>
            <span className="font-black text-amber-400">🔥 {userXP} XP</span>
          </div>
          <div className="bg-bull-raised border border-bull-line px-3.5 py-1.5 rounded-xl">
            <span className="text-slate-500 text-[10px] block font-sans uppercase font-black">NODES CLEARED</span>
            <span className="font-black text-emerald-400">{completedSubmodules.length} / {allSubmodules.length}</span>
          </div>
        </div>
      </div>

      {/* 1. HORIZONTAL SCROLLABLE TRACK CARDS WITH ARROWS BEFORE CARD 01 & AFTER CARD 04 */}
      <div className="relative flex items-center">
        
        {/* Left Arrow Button (Placed before Mod 1) */}
        <button
          onClick={() => scrollTracks('left')}
          className="mr-3 shrink-0 w-10 h-10 rounded-full bg-bull-raised border border-bull-lime text-bull-lime hover:bg-bull-lime hover:text-bull-ink font-black flex items-center justify-center shadow-xl transition cursor-pointer active:scale-95"
          aria-label="Scroll Tracks Left"
        >
          ◀
        </button>

        {/* Horizontal Track Scroll Container */}
        <div 
          ref={trackScrollRef}
          className="flex gap-6 overflow-x-auto scrollbar-none py-2 px-1 scroll-smooth flex-1"
        >
          {initialTracks.map((track, idx) => {
            const unlocked = isTrackUnlocked(idx);
            const isSelected = selectedTrackId === track.id;

            return (
              <div
                key={track.id}
                onClick={() => unlocked && handleTrackCardClick(track.id)}
                className={`min-w-[280px] sm:min-w-[310px] max-w-[340px] p-6 rounded-3xl border transition-all duration-300 select-none text-left relative overflow-hidden group flex-shrink-0 flex flex-col justify-between ${
                  unlocked 
                    ? isSelected
                      ? 'bg-gradient-to-br from-bull-raised via-bull-surface to-bull-bg border-bull-lime text-white shadow-[0_0_30px_color-mix(in_srgb,var(--color-bull-lime)_30%,transparent)] scale-[1.02] cursor-pointer'
                      : 'bg-bull-surface border-bull-line text-slate-200 shadow-xl hover:border-bull-lime/60 hover:bg-bull-raised cursor-pointer hover:scale-[1.01]'
                    : 'bg-bull-surface/40 border-bull-line opacity-40 cursor-not-allowed'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className={`font-mono font-black text-3xl ${isSelected ? 'text-rose-200' : 'text-bull-lime'}`}>
                      0{track.trackNumber || idx + 1}
                    </span>
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-xl font-mono ${
                      isSelected 
                        ? 'bg-bull-lime text-bull-ink shadow-md' 
                        : 'bg-bull-raised border border-bull-line text-slate-400'
                    }`}>
                      {track.level}
                    </span>
                  </div>

                  <h2 className="font-black text-lg tracking-tight text-white group-hover:text-bull-lime transition-colors">
                    {track.title}
                  </h2>
                  <p className={`text-xs mt-2 leading-relaxed ${isSelected ? 'text-rose-100/90' : 'text-slate-400'}`}>
                    {track.description}
                  </p>
                </div>
                
                <div className="mt-5 pt-3 border-t border-white/10 flex justify-between items-center text-[10px] font-black font-mono">
                  {unlocked ? (
                    <span className={isSelected ? 'text-rose-200 animate-pulse' : 'text-bull-lime'}>
                      {isSelected ? '▼ ACTIVE TRACK (CLICK TO CLOSE)' : '▶ LAUNCH TRACK NODES'}
                    </span>
                  ) : (
                    <span className="text-rose-500/80 flex items-center gap-1">
                      🔒 LOCKED (CLEAR PRIOR TRACK)
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Arrow Button (Placed after Card 04) */}
        <button
          onClick={() => scrollTracks('right')}
          className="ml-3 shrink-0 w-10 h-10 rounded-full bg-bull-raised border border-bull-lime text-bull-lime hover:bg-bull-lime hover:text-bull-ink font-black flex items-center justify-center shadow-xl transition cursor-pointer active:scale-95"
          aria-label="Scroll Tracks Right"
        >
          ▶
        </button>
      </div>

      {/* 2. MODULES & SUBMODULES SECTION */}
      {activeTrack && (
        <section className="bg-bull-surface p-6 sm:p-8 rounded-3xl border border-bull-lime/30 shadow-[0_0_40px_rgba(0,0,0,0.8)] space-y-8 animate-fadeInFast relative">
          <div className="flex justify-between items-center border-b border-bull-line pb-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-bull-ink bg-bull-lime px-3 py-1 rounded-md shadow-md font-mono">
                ACTIVE FOCUS ARENA
              </span>
              <h2 className="font-black text-2xl text-white mt-2 flex items-center gap-2">
                {activeTrack.title}
              </h2>
            </div>
            <button
              onClick={() => setSelectedTrackId(null)}
              className="text-xs font-black text-slate-400 hover:text-white bg-bull-raised border border-bull-line hover:border-bull-lime px-3.5 py-1.5 rounded-xl font-mono cursor-pointer transition-all"
            >
              ✕ CLOSE
            </button>
          </div>

          <div className="space-y-8">
            {(activeTrack.modules || []).length === 0 ? (
              <div className="p-8 text-center text-slate-500 font-mono text-xs bg-bull-raised rounded-2xl border border-bull-line">
                ⚠️ No modules loaded for this track yet. Add files to app/data/ to populate nodes.
              </div>
            ) : (
              (activeTrack.modules || []).map((mod, mIdx) => (
                <div key={mod.id} className="space-y-4">
                  
                  {/* Module Header + Scroll Buttons */}
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-sm sm:text-base text-slate-200 flex items-center gap-2 uppercase tracking-wider font-mono">
                      <span className="w-2.5 h-2.5 rounded-full bg-bull-lime animate-ping" />
                      Module {mIdx + 1}: {mod.title}
                    </h3>

                    <div className="flex gap-2">
                      <button
                        onClick={() => scrollSubmodules(mod.id, 'left')}
                        className="w-8 h-8 rounded-xl bg-bull-raised border border-bull-line hover:border-bull-lime text-bull-lime font-black flex items-center justify-center text-xs transition cursor-pointer"
                        aria-label="Scroll Submodules Left"
                      >
                        ◀
                      </button>
                      <button
                        onClick={() => scrollSubmodules(mod.id, 'right')}
                        className="w-8 h-8 rounded-xl bg-bull-raised border border-bull-line hover:border-bull-lime text-bull-lime font-black flex items-center justify-center text-xs transition cursor-pointer"
                        aria-label="Scroll Submodules Right"
                      >
                        ▶
                      </button>
                    </div>
                  </div>

                  {/* Horizontal Scrollable Submodule Cards Row */}
                  <div 
                    ref={(el) => (submodScrollRefs.current[mod.id] = el)}
                    className="flex gap-4 overflow-x-auto scrollbar-none py-2 scroll-smooth"
                  >
                    {(mod.submodules || []).map((submod) => {
                      const submodUnlocked = isSubmoduleUnlocked(submod.id);
                      const completed = completedSubmodules.includes(submod.id);

                      return (
                        <div
                          key={submod.id}
                          onClick={() => submodUnlocked && openSubmoduleModal(submod)}
                          className={`min-w-[260px] sm:min-w-[290px] max-w-[310px] p-5 rounded-2xl border text-left transition-all duration-200 group flex-shrink-0 flex flex-col justify-between space-y-3 relative overflow-hidden ${
                            submodUnlocked
                              ? completed
                                ? 'bg-emerald-950/20 border-emerald-900/60 cursor-pointer hover:border-emerald-500 hover:scale-[1.02]'
                                : 'bg-bull-raised border-bull-line hover:border-bull-lime cursor-pointer hover:scale-[1.02] shadow-xl'
                              : 'bg-bull-surface border-bull-line/40 opacity-30 cursor-not-allowed'
                          }`}
                        >
                          <div className="space-y-2">
                            <div className="flex justify-between items-start gap-2">
                              <h4 className={`font-black text-sm tracking-tight group-hover:text-bull-lime transition-colors ${submodUnlocked ? 'text-white' : 'text-slate-500'}`}>
                                {submod.title}
                              </h4>
                              {completed ? (
                                <span className="text-emerald-400 text-[10px] font-black bg-emerald-950 border border-emerald-800 px-2 py-0.5 rounded-md font-mono">
                                  ✓ PASSED (+100 XP)
                                </span>
                              ) : submodUnlocked ? (
                                <span className="text-bull-lime text-[10px] font-black uppercase tracking-wider bg-bull-line border border-bull-lime/30 px-2 py-0.5 rounded-md font-mono">
                                  MISSION READY ⚡
                                </span>
                              ) : (
                                <span className="text-slate-500 text-xs">🔒</span>
                              )}
                            </div>
                            <p className="text-slate-400 text-xs line-clamp-2 leading-relaxed font-medium">
                              {submod.intro}
                            </p>
                          </div>

                          <div className="pt-2 border-t border-bull-line flex justify-between items-center text-[10px] text-slate-500 font-mono">
                            <span className="text-amber-400 font-bold">+100 XP REWARD</span>
                            <span className="text-slate-300 font-black group-hover:translate-x-1 transition-transform">
                              ENTER DOSSIER →
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* 3. GAMIFIED DOSSIER MODAL */}
      {activeModalSubmod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xl bg-bull-bg/90 transition-all duration-300 animate-fadeInFast">
          <div className="bg-bull-surface border border-bull-lime/50 rounded-3xl w-full max-w-2xl overflow-hidden shadow-[0_0_50px_color-mix(in_srgb,var(--color-bull-lime)_25%,transparent)] flex flex-col max-h-[90vh] animate-scaleUp">
            
            <div className="p-6 border-b border-bull-line flex items-center justify-between bg-bull-raised">
              <div>
                <span className="text-[10px] font-black uppercase text-bull-lime tracking-widest bg-bull-line px-2.5 py-0.5 rounded-md border border-bull-lime/20 font-mono">
                  MISSION BRIEFING DOSSIER
                </span>
                <h3 className="font-black text-lg sm:text-xl text-white tracking-tight mt-1.5">
                  {activeModalSubmod.title}
                </h3>
              </div>
              <button 
                onClick={() => setActiveModalSubmod(null)}
                className="w-9 h-9 rounded-xl bg-bull-surface border border-bull-line hover:border-bull-lime text-slate-400 hover:text-white font-black flex items-center justify-center transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex bg-bull-raised border-b border-bull-line px-6 pt-3 gap-2">
              <button
                onClick={() => setModalTab('lesson')}
                className={`pb-2.5 px-4 text-xs font-black transition-all border-b-2 cursor-pointer font-mono ${
                  modalTab === 'lesson' 
                    ? 'border-bull-lime text-white shadow-sm' 
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                📖 LESSON INTEL
              </button>
              <button
                onClick={() => setModalTab('quiz')}
                className={`pb-2.5 px-4 text-xs font-black transition-all border-b-2 cursor-pointer font-mono ${
                  modalTab === 'quiz' 
                    ? 'border-bull-lime text-white shadow-sm' 
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                🎯 SKILL VERIFICATION ({activeModalSubmod.quiz?.length || 0})
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-left flex-1">
              {modalTab === 'lesson' && (
                <div className="space-y-5 animate-fadeIn">
                  <FormattedLessonContent content={activeModalSubmod.content} />

                  <button
                    onClick={() => setModalTab('quiz')}
                    className="w-full py-4 bg-bull-lime hover:bg-bull-lime-light text-bull-ink font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl transition-all active:scale-95 cursor-pointer font-mono mt-4"
                  >
                    PROCEED TO SKILL VERIFICATION QUIZ →
                  </button>
                </div>
              )}

              {modalTab === 'quiz' && activeModalSubmod.quiz && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-bull-line pb-2 font-mono">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-300">
                      NODE VERIFICATION ({activeModalSubmod.quiz.length} QUESTIONS)
                    </h4>
                    {quizSubmitted && (
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-md ${quizPassed ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' : 'bg-rose-950 text-rose-400 border border-rose-900'}`}>
                        {quizPassed ? 'PASSED (+100 XP) ✓' : 'FAILED - RETAKE REQUIRED ❌'}
                      </span>
                    )}
                  </div>

                  {activeModalSubmod.quiz.map((q, qIdx) => (
                    <div key={qIdx} className="bg-bull-raised p-4 rounded-2xl border border-bull-line space-y-3">
                      <p className="text-xs font-bold text-white">{qIdx + 1}. {q.question}</p>
                      
                      <div className="space-y-2">
                        {q.options.map((opt, oIdx) => {
                          const isSelected = userAnswers[qIdx] === oIdx;
                          const isCorrect = q.correctIndex === oIdx;
                          
                          let btnStyle = "bg-bull-surface border-bull-line text-slate-300 hover:border-bull-lime/50";
                          if (quizSubmitted) {
                            if (isCorrect) btnStyle = "bg-emerald-950/80 border-emerald-500 text-emerald-300 font-bold";
                            else if (isSelected && !isCorrect) btnStyle = "bg-rose-950/80 border-rose-500 text-rose-300 font-bold";
                          } else if (isSelected) {
                            btnStyle = "bg-bull-lime/60 border-bull-lime text-white font-bold";
                          }

                          return (
                            <button
                              key={oIdx}
                              onClick={() => handleSelectOption(qIdx, oIdx)}
                              className={`w-full p-3.5 rounded-xl border text-xs text-left transition-all flex items-center justify-between cursor-pointer ${btnStyle}`}
                            >
                              <span>{opt}</span>
                              {quizSubmitted && isCorrect && <span className="text-emerald-400 font-black text-xs">✓</span>}
                              {quizSubmitted && isSelected && !isCorrect && <span className="text-rose-400 font-black text-xs">✕</span>}
                            </button>
                          );
                        })}
                      </div>

                      {quizSubmitted && (
                        <div className="p-3 bg-bull-surface border border-bull-line rounded-xl text-[11px] text-slate-400 leading-relaxed font-medium">
                          💡 <span className="font-black text-slate-200">EXPLANATION: </span>{q.explanation}
                        </div>
                      )}
                    </div>
                  ))}

                  {!quizSubmitted ? (
                    <button
                      onClick={handleVerifyQuiz}
                      disabled={Object.keys(userAnswers).length < activeModalSubmod.quiz.length}
                      className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-xl transition-all cursor-pointer font-mono"
                    >
                      VERIFY ANSWERS & CLAIM XP
                    </button>
                  ) : !quizPassed && (
                    <button
                      onClick={() => { setQuizSubmitted(false); setUserAnswers({}); }}
                      className="w-full py-3.5 bg-bull-raised border border-bull-line hover:bg-bull-line text-slate-200 text-xs font-bold rounded-2xl transition-all cursor-pointer font-mono"
                    >
                      RETRY VERIFICATION QUIZ
                    </button>
                  )}
                </div>
              )}

            </div>

            <div className="p-6 border-t border-bull-line bg-bull-raised flex items-center justify-between gap-3">
              <button
                onClick={() => setActiveModalSubmod(null)}
                className="px-5 py-2.5 border border-bull-line bg-bull-surface rounded-2xl text-xs font-bold text-slate-300 hover:bg-bull-raised transition cursor-pointer font-mono"
              >
                CLOSE DOSSIER
              </button>

              <button
                onClick={() => handleCompleteSubmodule(activeModalSubmod.id)}
                disabled={activeModalSubmod.quiz && activeModalSubmod.quiz.length > 0 && !quizPassed}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md transition cursor-pointer font-mono"
              >
                {completedSubmodules.includes(activeModalSubmod.id) ? 'NODE CLEARED ✓' : 'PASS QUIZ TO UNLOCK NEXT'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}