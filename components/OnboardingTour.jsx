'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Mascot from '@/components/Mascot';

const TOUR_STEPS = [
  {
    title: '📖 1. Learning Modules',
    badge: 'STEP 1 OF 6',
    mood: 'hello',
    say: "Hi, I'm Bulzo! I'll show you around. 🐂",
    description: 'Start here. Master business fundamentals, technical analysis, valuation, and risk engineering across 5 level tracks and earn XP. Finish your first 2 modules and the simulator becomes the first page you see when you sign in.',
    href: '/modules',
    actionText: 'Next: Simulator →',
  },
  {
    title: '📈 2. Stock Simulator',
    badge: 'STEP 2 OF 6',
    mood: 'curious',
    say: 'Practice with ₹50,000 of play money. Zero risk!',
    description: 'Your ₹50,000 sandbox portfolio lives here. Practice trades on simulated prices for fictional companies, ETFs and commodities. No real money and no live exchange connection.',
    href: '/simulator',
    actionText: 'Next: Arena →',
  },
  {
    title: '⚔️ 3. Volatility Arena',
    badge: 'STEP 3 OF 6',
    mood: 'excited',
    say: 'Ready to race other traders?',
    description: 'Enter high-frequency 30-day volatility matches against other traders to test your market reaction speed.',
    href: '/arena',
    actionText: 'Next: Daily Quiz →',
  },
  {
    title: '⚡ 4. Daily Market Quiz',
    badge: 'STEP 4 OF 6',
    isNew: true,
    mood: 'thinking',
    say: 'One quick quiz a day keeps your XP safe!',
    description: 'Test your daily financial awareness with fresh market questions and earn bonus XP rewards every 24 hours.',
    href: '/quiz',
    actionText: 'Next: Leaderboard →',
  },
  {
    title: '🏆 5. Global & School Leaderboards',
    badge: 'STEP 5 OF 6',
    isNew: true,
    mood: 'trophy',
    say: 'Climb the board and earn your rank!',
    description: 'Track real-time standings based on Total Net Worth (Cash + Stock Value). Compare your rank globally or within your school hub.',
    href: '/leaderboard',
    actionText: 'Next: Pricing →',
  },
  {
    title: '💳 6. Pass & Subscriptions',
    badge: 'STEP 6 OF 6',
    mood: 'chest',
    say: 'Last stop! Your free trial starts now.',
    description: 'Your account starts with a 7-day free trial. Upgrade anytime to maintain continuous, un-frozen access to all platform features.',
    href: '/pricing',
    actionText: 'Finish Tour 🚀',
  },
];

const TOUR_CSS = `
@keyframes tourHop{0%{transform:translateY(30px) scale(.6) rotate(-8deg);opacity:0}55%{transform:translateY(-12px) scale(1.08) rotate(4deg);opacity:1}80%{transform:translateY(3px) scale(.98)}100%{transform:none;opacity:1}}
@keyframes tourBubble{0%{opacity:0;transform:scale(.75) translateX(-12px)}70%{transform:scale(1.03)}100%{opacity:1;transform:none}}
@keyframes tourBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
.tour-hop{display:inline-block;animation:tourHop .7s cubic-bezier(.34,1.56,.64,1) both}
.tour-bob{display:inline-block;animation:tourBob 2.4s ease-in-out .8s infinite}
.tour-bubble{animation:tourBubble .45s ease-out .3s both}
@media (prefers-reduced-motion:reduce){.tour-hop,.tour-bob,.tour-bubble{animation:none}}
`;

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

        // Seen before on this account (any device) or in this browser: never show again.
        // Mid-tour page changes in this tab still continue.
        const meta = session.user.user_metadata || {};
        const seenBefore = meta.tour_seen === true || !!localStorage.getItem(seenKey);
        if (seenBefore && !isResuming) return;

        // Only accounts created in the last 24 hours get the tour
        const createdAt = new Date(session.user.created_at).getTime();
        const isNewAccount =
          Number.isFinite(createdAt) && Date.now() - createdAt < 24 * 60 * 60 * 1000;

        if (!isResuming && !isNewAccount) return;

        if (isResuming) {
          const step = parseInt(savedStep, 10);
          setCurrentStep(
            Number.isInteger(step) && step >= 0 && step < TOUR_STEPS.length ? step : 0
          );
        } else {
          localStorage.setItem(seenKey, 'true');
          sessionStorage.setItem(stepKey, '0');
          await supabase.auth.updateUser({ data: { tour_seen: true } });
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
      await supabase.auth.updateUser({ data: { tour_seen: true } });
    }
    setIsOpen(false);
  };

  if (!isOpen) return null;

  const step = TOUR_STEPS[currentStep];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bull-bg/85 backdrop-blur-md animate-fadeInFast font-sans">
      <style>{TOUR_CSS}</style>
      <div className="bg-bull-surface border-2 border-bull-lime/60 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-[0_0_50px_color-mix(in_srgb,var(--color-bull-lime)_25%,transparent)] space-y-5 relative animate-scaleUp font-mono max-h-[92vh] overflow-y-auto">

        {/* HEADER BADGES */}
        <div className="flex justify-between items-center border-b border-bull-line pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-widest text-bull-lime bg-bull-raised border border-bull-lime/30 px-3 py-1 rounded-full">
              {step.badge}
            </span>
            {step.isNew && (
              <span className="text-xs font-black uppercase tracking-wider text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-2.5 py-0.5 rounded-full animate-pulse">
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

        {/* BULZO AND HIS SPEECH BUBBLE */}
        <div key={currentStep} className="flex items-end gap-3 font-sans">
          <span className="tour-hop shrink-0">
            <span className="tour-bob">
              <Mascot mood={step.mood} size={96} fallback={'\ud83d\udc02'} eager />
            </span>
          </span>
          <div className="tour-bubble relative flex-1 min-w-0 rounded-2xl rounded-bl-md border border-bull-line bg-bull-raised px-4 py-3">
            <span aria-hidden="true" className="absolute -left-1.5 bottom-5 h-3 w-3 rotate-45 border-b border-l border-bull-line bg-bull-raised" />
            <p className="text-sm font-bold text-white leading-snug">{step.say}</p>
          </div>
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
                  ? 'w-6 bg-bull-lime'
                  : 'w-2 bg-bull-line'
              }`}
            />
          ))}
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex items-center justify-between gap-3 border-t border-bull-line pt-4">
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="px-4 py-2.5 bg-bull-raised border border-bull-line hover:border-bull-lime disabled:opacity-30 text-xs font-bold text-slate-300 rounded-xl transition cursor-pointer font-mono"
          >
            ◀ Back
          </button>

          <button
            onClick={handleNext}
            className="flex-1 py-3 bg-bull-lime hover:bg-bull-lime-light text-bull-ink text-xs font-black uppercase tracking-wider rounded-xl shadow-lg transition cursor-pointer font-mono"
          >
            {step.actionText}
          </button>
        </div>

      </div>
    </div>
  );
}
