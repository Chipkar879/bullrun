'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const TOUR_STEPS = [
  {
    title: '📈 1. Live Stock Simulator',
    badge: 'STEP 1 OF 6',
    description: 'Your ₹50,000 sandbox portfolio lives here. Execute real-time trades on BSE equities, Gold/Silver ETFs, and commodities with live TradingView feeds.',
    href: '/simulator',
    actionText: 'Next: Arena →',
  },
  {
    title: '⚔️ 2. Volatility Arena',
    badge: 'STEP 2 OF 6',
    description: 'Enter high-frequency 30-day volatility matches against other traders to test your market reaction speed.',
    href: '/arena',
    actionText: 'Next: Modules →',
  },
  {
    title: '📖 3. Learning Arena Modules',
    badge: 'STEP 3 OF 6',
    description: 'Master business fundamentals, technical analysis, valuation, and risk engineering across 5 level tracks to earn XP.',
    href: '/modules',
    actionText: 'Next: Daily Quiz →',
  },
  {
    title: '⚡ 4. Daily Market Quiz',
    badge: 'STEP 4 OF 6',
    isNew: true,
    description: 'Test your daily financial awareness with fresh market questions and earn bonus XP rewards every 24 hours.',
    href: '/quiz',
    actionText: 'Next: Leaderboard →',
  },
  {
    title: '🏆 5. Global & School Leaderboards',
    badge: 'STEP 5 OF 6',
    isNew: true,
    description: 'Track real-time standings based on Total Net Worth (Cash + Stock Value). Compare your rank globally or within your school hub.',
    href: '/leaderboard',
    actionText: 'Next: Pricing →',
  },
  {
    title: '💳 6. Pass & Subscriptions',
    badge: 'STEP 6 OF 6',
    description: 'Your account starts with a 7-day free trial. Upgrade anytime to maintain continuous, un-frozen access to all platform features.',
    href: '/pricing',
    actionText: 'Finish Tour & Start Trading! 🚀',
  },
];

export default function OnboardingTour() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const router = useRouter();

  useEffect(() => {
    async function checkAuthAndTourStatus() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        const userId = session.user.id;
        const seenKey = `bullrun_has_seen_tour_${userId}`;
        const stepKey = `bullrun_tour_step_${userId}`;

        const savedStep = sessionStorage.getItem(stepKey);
        const isResuming = savedStep !== null;

        // Already shown once in this browser: never show again (except mid-tour page changes)
        if (localStorage.getItem(seenKey) && !isResuming) return;

        // Only brand-new accounts (created in the last 30 minutes) get the tour
        const createdAt = new Date(session.user.created_at).getTime();
        const isNewAccount =
          Number.isFinite(createdAt) && Date.now() - createdAt < 30 * 60 * 1000;

        if (!isResuming && !isNewAccount) return;

        if (isResuming) {
          const step = parseInt(savedStep, 10);
          setCurrentStep(
            Number.isInteger(step) && step >= 0 && step < TOUR_STEPS.length ? step : 0
          );
        } else {
          localStorage.setItem(seenKey, 'true');
          sessionStorage.setItem(stepKey, '0');
        }

        setIsOpen(true);
      } catch (err) {
        console.error('Error verifying tour auth state:', err);
      }
    }

    checkAuthAndTourStatus();
  }, []);

  const handleNext = async () => {
    const nextStepIndex = currentStep + 1;
    const { data: { session } } = await supabase.auth.getSession();

    if (nextStepIndex < TOUR_STEPS.length) {
      const nextStep = TOUR_STEPS[nextStepIndex];
      setCurrentStep(nextStepIndex);

      // SAVE STEP INDEX SO PAGE ROUTING DOES NOT RESET IT
      if (session?.user) {
        sessionStorage.setItem(`bullrun_tour_step_${session.user.id}`, nextStepIndex.toString());
      }

      if (nextStep.href) {
        router.push(nextStep.href);
      }
    } else {
      await handleComplete();
    }
  };

  const handlePrev = async () => {
    const prevStepIndex = currentStep - 1;
    const { data: { session } } = await supabase.auth.getSession();

    if (prevStepIndex >= 0) {
      const prevStep = TOUR_STEPS[prevStepIndex];
      setCurrentStep(prevStepIndex);

      // SAVE STEP INDEX ON BACK CLICK
      if (session?.user) {
        sessionStorage.setItem(`bullrun_tour_step_${session.user.id}`, prevStepIndex.toString());
      }

      if (prevStep.href) {
        router.push(prevStep.href);
      }
    }
  };

  const handleComplete = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const userId = session.user.id;
      // MARK PERMANENTLY IN LOCALSTORAGE SO IT NEVER SHOWS AGAIN
      localStorage.setItem(`bullrun_has_seen_tour_${userId}`, 'true');
      sessionStorage.removeItem(`bullrun_tour_step_${userId}`);
    }
    setIsOpen(false);
  };

  if (!isOpen) return null;

  const step = TOUR_STEPS[currentStep];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeInFast font-sans">
      <div className="bg-[#0f0505] border-2 border-[#ff3333]/60 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-[0_0_50px_rgba(255,51,51,0.25)] space-y-6 relative animate-scaleUp font-mono">
        
        {/* HEADER BADGES */}
        <div className="flex justify-between items-center border-b border-[#2b0808] pb-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#ff3333] bg-[#1a0808] border border-[#ff3333]/30 px-3 py-1 rounded-full">
              {step.badge}
            </span>
            {step.isNew && (
              <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-2.5 py-0.5 rounded-full animate-pulse">
                ✦ NEW FEATURE
              </span>
            )}
          </div>
          
          <button
            onClick={handleComplete}
            className="text-xs font-bold text-slate-500 hover:text-white transition cursor-pointer"
          >
            SKIP TOUR ✕
          </button>
        </div>

        {/* STEP DESCRIPTION */}
        <div className="space-y-3 font-sans">
          <h3 className="text-xl font-black text-white font-mono flex items-center gap-2">
            {step.title}
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed font-medium">
            {step.description}
          </p>
        </div>

        {/* PROGRESS DOTS */}
        <div className="flex justify-center items-center gap-1.5">
          {TOUR_STEPS.map((_, idx) => (
            <div
              key={idx}
              className={`h-2 rounded-full transition-all ${
                idx === currentStep
                  ? 'w-6 bg-[#ff3333]'
                  : 'w-2 bg-[#2b0808]'
              }`}
            />
          ))}
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex items-center justify-between gap-3 border-t border-[#2b0808] pt-4">
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="px-4 py-2.5 bg-[#1a0808] border border-[#2b0808] hover:border-[#ff3333] disabled:opacity-30 text-xs font-bold text-slate-300 rounded-xl transition cursor-pointer font-mono"
          >
            ◀ Back
          </button>

          <button
            onClick={handleNext}
            className="flex-1 py-3 bg-[#ff3333] hover:bg-[#dc2626] text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg transition cursor-pointer font-mono"
          >
            {step.actionText}
          </button>
        </div>

      </div>
    </div>
  );
}