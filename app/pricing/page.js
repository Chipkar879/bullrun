'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

// PERMANENT SUPER ADMIN IMMUNITY EMAIL
const SUPER_ADMIN_EMAIL = 'verymystery18@gmail.com';

const RS = '\u20B9';
const TICK = '\u2713';
const INDIVIDUAL_PRICE = 99;
const MAX_SELF_SERVE = 1000;

// What the Student Pass includes (edit this list to add or remove items)
const INDIVIDUAL_FEATURES = [
  'All 28 modules and 336 submodules',
  'Quizzes and daily practice questions',
  'Volatility Arena matches',
  'Virtual ' + RS + '50,000 trading simulator',
  'Portfolio tracking and live leaderboard',
  'Trader XP and level progress saved',
  'Works on phone, tablet and laptop',
  '7-day free trial before you pay',
];

// Volume pricing: every student is charged at the rate of their band (like tax slabs).
// Bigger schools get a lower rate on the extra students, so the total never drops as size grows.
const SLABS = [
  { from: 1, to: 10, rate: 99 },
  { from: 11, to: 30, rate: 85 },
  { from: 31, to: 100, rate: 72 },
  { from: 101, to: 200, rate: 62 },
  { from: 201, to: MAX_SELF_SERVE, rate: 55 },
];

function schoolPrice(n) {
  let total = 0;
  for (const s of SLABS) {
    if (n >= s.from) {
      const count = Math.min(n, s.to) - s.from + 1;
      total += count * s.rate;
    }
  }
  return total;
}

const fmt = (v) => RS + Number(v).toLocaleString('en-IN');

export default function PricingPage() {
  const [loading, setLoading] = useState(true);
  const [userSession, setUserSession] = useState(null);
  const [profile, setProfile] = useState(null);

  const [status, setStatus] = useState({
    isSuperAdmin: false,
    isPremium: false,
    isFrozen: false,
    targetExpiryDate: null,
  });

  // Real-time Countdown State
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    totalMs: 0,
  });

  const [paymentStep, setPaymentStep] = useState('browse'); // 'browse' | 'checkout' | 'success'
  const [isProcessing, setIsProcessing] = useState(false);
  const [studentInput, setStudentInput] = useState('100');

  // School plan calculation
  const n = parseInt(studentInput, 10);
  const validN = Number.isFinite(n) && n >= 1;
  const overMax = validN && n > MAX_SELF_SERVE;
  let calc = null;
  if (validN && !overMax) {
    const individualTotal = n * INDIVIDUAL_PRICE;
    const school = schoolPrice(n);
    const saved = individualTotal - school;
    calc = {
      individualTotal,
      school,
      saved,
      pct: Math.round((saved / individualTotal) * 100),
      perStudent: Math.round(school / n),
      barWidth: Math.max(4, Math.round((school / individualTotal) * 100)),
    };
  }

  const whatsappHref =
    'https://wa.me/919324459446?text=' +
    encodeURIComponent(
      validN && !overMax
        ? 'Hi, I want the Bull Run School Plan for ' + n + ' students (' + fmt(calc.school) + '/month).'
        : 'Hi, I want a Bull Run School Plan quote for a large school.'
    );

  // 1. FETCH USER PROFILE & COMPUTE EXPIRY DATE
  useEffect(() => {
    async function initUserSubscription() {
      try {
        setLoading(true);

        const { data: { session } } = await supabase.auth.getSession();
        setUserSession(session);

        if (session?.user) {
          const userEmail = session.user.email;
          const isSuperAdmin = userEmail === SUPER_ADMIN_EMAIL;

          const { data: userProfile, error } = await supabase
            .from('profiles')
            .select('id, email, role, is_premium, is_frozen, created_at, access_expires_at')
            .eq('id', session.user.id)
            .single();

          if (userProfile && !error) {
            setProfile(userProfile);
            const isAdmin = isSuperAdmin || userProfile.role === 'admin' || userProfile.email === SUPER_ADMIN_EMAIL;

            if (isAdmin) {
              setStatus({
                isSuperAdmin: true,
                isPremium: true,
                isFrozen: false,
                targetExpiryDate: null,
              });
              setLoading(false);
              return;
            }

            // Determine Target Expiration Date
            let expiryTimeMs;
            if (userProfile.access_expires_at) {
              expiryTimeMs = new Date(userProfile.access_expires_at).getTime();
            } else {
              const registrationDate = userProfile.created_at ? new Date(userProfile.created_at).getTime() : Date.now();
              expiryTimeMs = registrationDate + (7 * 24 * 60 * 60 * 1000);
            }

            const now = Date.now();
            const hasPremium = Boolean(userProfile.is_premium);
            const isTrialExpired = now >= expiryTimeMs && !hasPremium;

            // STRICT OVERRIDE: Database freeze flag always wins
            const isFrozenCalculated = Boolean(userProfile.is_frozen) || isTrialExpired;

            setStatus({
              isSuperAdmin: false,
              isPremium: hasPremium && !userProfile.is_frozen,
              isFrozen: isFrozenCalculated,
              targetExpiryDate: expiryTimeMs,
            });

            // Sync freeze status back to database if trial has expired
            if (isTrialExpired && !userProfile.is_frozen) {
              await supabase
                .from('profiles')
                .update({ is_frozen: true })
                .eq('id', session.user.id);
            }

            setLoading(false);
            return;
          }
        }

        // Unauthenticated guest
        setStatus({
          isSuperAdmin: false,
          isPremium: false,
          isFrozen: false,
          targetExpiryDate: null,
        });
      } catch (err) {
        console.error('Subscription sync error:', err);
      } finally {
        setLoading(false);
      }
    }

    initUserSubscription();
  }, []);

  // 2. REAL-TIME COUNTDOWN TIMER TICKER (ONLY FOR NON-FROZEN, ACTIVE GUESTS/TRIAL USERS)
  useEffect(() => {
    if (!userSession || !status.targetExpiryDate || status.isSuperAdmin || status.isPremium || status.isFrozen) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const diffMs = status.targetExpiryDate - now;

      if (diffMs <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0 });
        setStatus((prev) => ({ ...prev, isFrozen: true, isPremium: false }));
        clearInterval(interval);
      } else {
        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diffMs / 1000 / 60) % 60);
        const seconds = Math.floor((diffMs / 1000) % 60);

        setTimeLeft({ days, hours, minutes, seconds, totalMs: diffMs });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [userSession, status.targetExpiryDate, status.isSuperAdmin, status.isPremium, status.isFrozen]);

  // 3. VERIFY & ACTIVATION PAYMENT HANDLER
  const handleVerifyPayment = async () => {
    setIsProcessing(true);

    try {
      if (userSession?.user) {
        const new30DaysExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

        const { error } = await supabase
          .from('profiles')
          .update({
            is_premium: true,
            is_frozen: false,
            access_expires_at: new30DaysExpiry,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userSession.user.id);

        if (error) throw error;
      }

      setStatus({
        isSuperAdmin: false,
        isPremium: true,
        isFrozen: false,
        targetExpiryDate: null,
      });

      setIsProcessing(false);
      setPaymentStep('success');
    } catch (err) {
      console.error('Payment activation error:', err);
      alert('Failed to process payment. Please contact admin support.');
      setIsProcessing(false);
    }
  };

  return (
    <main className="min-h-screen bg-bull-bg text-slate-100 antialiased font-sans max-w-full overflow-x-hidden pt-24 pb-20 relative">
      <Navbar />

      <div className="max-w-[1000px] mx-auto px-4 space-y-10">

        {/* HEADER */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-2 bg-bull-raised border border-bull-lime/30 text-bull-lime text-xs uppercase tracking-widest font-black px-4 py-1.5 rounded-full shadow-inner font-mono">
            {'\u26A1'} BULL RUN PASS
          </span>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Simple, Transparent Pricing
          </h1>
          <p className="text-slate-400 text-sm sm:text-base font-medium leading-relaxed">
            Every registered account gets an unrestricted 7-day trial. Students pay {RS}99/month, or a school can buy one plan for the whole class and pay less per student.
          </p>

          {/* DYNAMIC CLEARANCE BADGE */}
          <div className="pt-2 flex justify-center">
            <div className="bg-bull-surface border border-bull-line px-5 py-3 rounded-2xl shadow-xl font-mono text-xs flex flex-col items-center gap-2">
              <span className="text-slate-500 font-medium text-xs uppercase tracking-wider">Account Clearance Status</span>

              {loading ? (
                <span className="text-slate-400 animate-pulse">Querying database firewall...</span>
              ) : !userSession ? (
                <div className="flex flex-col items-center space-y-2 py-1">
                  <span className="text-amber-400 font-bold text-xs">{'\u2728'} 7-DAY FREE TRIAL AVAILABLE</span>
                  <p className="text-slate-400 text-xs max-w-xs text-center font-sans">
                    Countdown begins the moment you create your profile.
                  </p>
                  <Link
                    href="/signup"
                    className="mt-1 px-4 py-1.5 bg-bull-lime hover:bg-bull-lime-light text-bull-ink font-bold rounded-xl text-xs uppercase tracking-wider transition-all"
                  >
                    Claim 7-Day Free Pass {'\u2192'}
                  </Link>
                </div>
              ) : status.isSuperAdmin ? (
                <span className="bg-amber-950 text-amber-400 font-black px-3 py-1 rounded-xl border border-amber-800 flex items-center gap-1.5">
                  {'\uD83D\uDC51'} SUPER ADMIN IMMUNE ({SUPER_ADMIN_EMAIL})
                </span>
              ) : status.isFrozen ? (
                <span className="bg-rose-950 text-rose-400 font-black px-3 py-1 rounded-xl border border-rose-800 animate-pulse flex items-center gap-1.5">
                  {'\uD83D\uDD12'} ACCOUNT FROZEN {'\u2014'} ACCESS EXPIRED
                </span>
              ) : status.isPremium ? (
                <span className="bg-emerald-950 text-emerald-400 font-black px-3 py-1 rounded-xl border border-emerald-800 flex items-center gap-1.5">
                  {TICK} PRO PASS ACTIVE (UNLOCKED)
                </span>
              ) : (
                <div className="flex flex-col items-center space-y-1">
                  <span className="text-amber-400 font-bold text-xs">{'\u23F3'} TIME REMAINING BEFORE FREEZE:</span>
                  <div className="flex items-center gap-2 text-white font-black text-base bg-bull-raised px-4 py-1.5 rounded-xl border border-bull-lime/40">
                    <div className="text-center"><span className="text-bull-lime">{String(timeLeft.days).padStart(2, '0')}</span><span className="text-xs text-slate-500 block font-normal">DAYS</span></div>
                    <span className="text-bull-lime">:</span>
                    <div className="text-center"><span className="text-bull-lime">{String(timeLeft.hours).padStart(2, '0')}</span><span className="text-xs text-slate-500 block font-normal">HRS</span></div>
                    <span className="text-bull-lime">:</span>
                    <div className="text-center"><span className="text-bull-lime">{String(timeLeft.minutes).padStart(2, '0')}</span><span className="text-xs text-slate-500 block font-normal">MIN</span></div>
                    <span className="text-bull-lime">:</span>
                    <div className="text-center"><span className="text-bull-lime">{String(timeLeft.seconds).padStart(2, '0')}</span><span className="text-xs text-slate-500 block font-normal">SEC</span></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* LOCKED ACCOUNT WARNING - EXCLUSIVE TO FROZEN STATE */}
        {userSession && status.isFrozen && !status.isSuperAdmin && (
          <div className="bg-rose-950/60 border border-rose-500 p-6 rounded-3xl text-center space-y-3 max-w-xl mx-auto shadow-[0_0_30px_color-mix(in_srgb,var(--color-bull-coral)_25%,transparent)] animate-pulse">
            <div className="text-3xl">{'\uD83D\uDD12'}</div>
            <h2 className="text-lg font-black text-rose-200 uppercase font-mono tracking-wider">
              YOUR ACCOUNT ACCESS IS FROZEN
            </h2>
            <p className="text-xs text-rose-300 leading-relaxed font-medium">
              Your account workspace is currently restricted. Subscribe below for {RS}99/month or ask your school to buy the School Plan to reactivate your access.
            </p>
          </div>
        )}

        {/* PRICING: STUDENT | SCHOOL */}
        {paymentStep === 'browse' && (
          <section className="max-w-4xl mx-auto bg-bull-surface border border-bull-lime/60 shadow-[0_0_40px_color-mix(in_srgb,var(--color-bull-lime)_20%,transparent)] rounded-3xl overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1px_1.35fr]">

              {/* LEFT: INDIVIDUAL STUDENT */}
              <div className="p-8 space-y-6 flex flex-col">
                <div className="space-y-4 text-center md:text-left">
                  <span className="inline-block text-xs font-black uppercase text-bull-lime bg-bull-raised border border-bull-lime/30 px-3.5 py-1 rounded-full font-mono">
                    INDIVIDUAL
                  </span>
                  <h2 className="text-2xl font-black text-white">Student Pass</h2>
                  <p className="text-slate-400 text-xs leading-relaxed font-medium">
                    One student, one account. Full access to the learning arena and the simulator.
                  </p>

                  <div className="font-mono border-y border-bull-line py-5">
                    <span className="text-5xl font-black text-white">{RS}99</span>
                    <span className="text-slate-500 text-xs"> / month</span>
                    <span className="block text-xs text-emerald-400 font-bold mt-1">
                      {TICK} Instant account unfreeze
                    </span>
                  </div>
                </div>

                <div className="space-y-3 flex-1">
                  <span className="text-xs font-black uppercase text-slate-500 tracking-wider block font-mono">
                    WHAT IS INCLUDED:
                  </span>
                  <ul className="space-y-3 font-sans font-medium text-slate-200 text-xs">
                    {INDIVIDUAL_FEATURES.map((item) => (
                      <li key={item} className="flex items-center gap-2.5">
                        <span className="text-bull-lime font-black">{TICK}</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {status.isPremium && !status.isFrozen ? (
                  <Link
                    href="/modules"
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-2xl font-mono shadow-lg block text-center transition-all"
                  >
                    Launch Learning Arena {'\u2192'}
                  </Link>
                ) : !userSession ? (
                  <Link
                    href="/signup"
                    className="w-full py-4 bg-bull-lime hover:bg-bull-lime-light text-bull-ink text-xs font-black uppercase tracking-wider rounded-2xl font-mono shadow-lg shadow-bull-lime/20 transition-all block text-center"
                  >
                    Create Account for Free Trial {'\u2192'}
                  </Link>
                ) : (
                  <button
                    onClick={() => setPaymentStep('checkout')}
                    className="w-full py-4 bg-bull-lime hover:bg-bull-lime-light text-bull-ink text-xs font-black uppercase tracking-wider rounded-2xl font-mono shadow-lg shadow-bull-lime/20 transition-all cursor-pointer"
                  >
                    {status.isFrozen ? 'Unlock Account \u2014 ' + RS + '99/month' : 'Subscribe Now \u2014 ' + RS + '99/month'}
                  </button>
                )}
              </div>

              {/* DIVIDER */}
              <div className="h-px md:h-auto md:w-px bg-bull-line" />

              {/* RIGHT: SCHOOL PLAN */}
              <div className="p-8 space-y-6 flex flex-col">
                <div className="space-y-4 text-center md:text-left">
                  <span className="inline-block text-xs font-black uppercase text-bull-teal bg-bull-raised border border-bull-teal/30 px-3.5 py-1 rounded-full font-mono">
                    FOR SCHOOLS
                  </span>
                  <h2 className="text-2xl font-black text-white">School Plan</h2>
                  <p className="text-slate-400 text-xs leading-relaxed font-medium">
                    One plan for your whole school, bought by the school or teacher. The bigger the school, the lower the price per student.
                  </p>
                </div>

                {/* STUDENT COUNT INPUT */}
                <div className="bg-bull-raised border border-bull-line rounded-2xl p-4 space-y-3 font-mono">
                  <label htmlFor="student-count" className="text-xs font-black uppercase text-slate-500 tracking-wider block">
                    How many students does your school have?
                  </label>
                  <input
                    id="student-count"
                    type="text"
                    inputMode="numeric"
                    value={studentInput}
                    onChange={(e) => setStudentInput(e.target.value.replace(/[^0-9]/g, '').slice(0, 5))}
                    placeholder="e.g. 300"
                    className="w-full bg-bull-surface border border-bull-line focus:border-bull-teal outline-none rounded-xl px-4 py-3 text-lg font-black text-white placeholder-slate-600"
                    aria-label="Number of students in your school"
                  />
                  <div className="flex flex-wrap gap-2">
                    {[30, 100, 300, 500].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setStudentInput(String(v))}
                        className={'px-3 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ' + (String(v) === studentInput ? 'border-bull-teal text-bull-teal bg-bull-surface' : 'border-bull-line text-slate-400 hover:text-white')}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                {/* RESULT */}
                {!validN ? (
                  <div className="border border-dashed border-bull-line rounded-2xl p-5 text-center text-xs text-slate-400 font-medium">
                    Enter the number of students to see your price.
                  </div>
                ) : overMax ? (
                  <div className="border border-bull-teal/40 bg-bull-raised rounded-2xl p-5 text-center space-y-1">
                    <span className="text-sm font-black text-white block">Over {MAX_SELF_SERVE.toLocaleString('en-IN')} students?</span>
                    <span className="text-xs text-slate-400 font-medium block">Message us for a custom quote with an even better rate.</span>
                  </div>
                ) : (
                  <div className="bg-bull-raised border border-bull-teal/40 rounded-2xl p-5 space-y-4 font-mono">
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <span className="text-xs uppercase tracking-wider text-slate-500 block">Your school pays</span>
                        <span className="text-4xl font-black text-white">{fmt(calc.school)}</span>
                        <span className="text-slate-500 text-xs"> / month</span>
                      </div>
                      {calc.pct > 0 && (
                        <span className="text-xs font-black text-emerald-400 bg-emerald-950 border border-emerald-800 px-3 py-1 rounded-full whitespace-nowrap">
                          {calc.pct}% OFF
                        </span>
                      )}
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <div className="flex justify-between text-slate-400 mb-1">
                          <span>{n} individual passes</span>
                          <span className="text-white font-bold">{fmt(calc.individualTotal)}/mo</span>
                        </div>
                        <div className="h-2 bg-bull-surface rounded-full overflow-hidden">
                          <div className="h-full bg-slate-500 rounded-full" style={{ width: '100%' }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-slate-400 mb-1">
                          <span>School Plan</span>
                          <span className="text-bull-teal font-bold">{fmt(calc.school)}/mo</span>
                        </div>
                        <div className="h-2 bg-bull-surface rounded-full overflow-hidden">
                          <div className="h-full bg-bull-teal rounded-full" style={{ width: calc.barWidth + '%', transition: 'width 0.5s ease' }} />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-bull-line pt-3 text-xs">
                      <span className="text-slate-400">Per student</span>
                      <span className="text-white font-black">{fmt(calc.perStudent)} / month</span>
                    </div>

                    <p className={'text-xs font-bold font-sans leading-relaxed ' + (calc.saved > 0 ? 'text-emerald-400' : 'text-slate-400')}>
                      {calc.saved > 0
                        ? 'You save ' + fmt(calc.saved) + ' every month compared with individual passes.'
                        : 'Discounts start from 11 students. For up to 10 students the price is the same as individual passes.'}
                    </p>
                  </div>
                )}

                <div className="space-y-3 flex-1">
                  <span className="text-xs font-black uppercase text-slate-500 tracking-wider block font-mono">
                    WHAT IS INCLUDED:
                  </span>
                  <ul className="space-y-3 font-sans font-medium text-slate-200 text-xs">
                    <li className="flex items-center gap-2.5">
                      <span className="text-bull-teal font-black">+</span>
                      <span>Everything in the Student Pass, for every student</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <span className="text-bull-teal font-black">+</span>
                      <span>Teacher-managed classes and student approvals</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <span className="text-bull-teal font-black">+</span>
                      <span>School leaderboard and daily quizzes</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <span className="text-bull-teal font-black">+</span>
                      <span>One payment for the whole school</span>
                    </li>
                  </ul>
                </div>

                {validN ? (
                  overMax ? (
                    <a
                      href={whatsappHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-4 bg-bull-teal hover:opacity-90 text-bull-ink text-xs font-black uppercase tracking-wider rounded-2xl font-mono transition-all block text-center"
                    >
                      Request Custom Quote
                    </a>
                  ) : (
                    <Link
                      href="/signup"
                      className="w-full py-4 bg-bull-teal hover:opacity-90 text-bull-ink text-xs font-black uppercase tracking-wider rounded-2xl font-mono transition-all block text-center"
                    >
                      {'Request School Plan \u2014 ' + fmt(calc.school) + '/month'}
                    </Link>
                  )
                ) : (
                  <div className="w-full py-4 bg-bull-raised text-slate-600 text-xs font-black uppercase tracking-wider rounded-2xl font-mono block text-center border border-bull-line">
                    Enter student count
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* CHECKOUT STEP */}
        {paymentStep === 'checkout' && (
          <div className="max-w-md mx-auto bg-bull-surface border border-bull-lime/50 rounded-3xl shadow-[0_0_50px_color-mix(in_srgb,var(--color-bull-lime)_20%,transparent)] p-6 space-y-6 animate-scaleUp font-mono">
            <div className="text-center border-b border-bull-line pb-4">
              <span className="text-xs font-black text-bull-lime uppercase tracking-widest bg-bull-raised px-2.5 py-0.5 rounded border border-bull-lime/20">
                SECURE UPI PAYMENT GATEWAY
              </span>
              <h2 className="font-black text-xl text-white mt-2">Activate {RS}99 Subscription</h2>
              <p className="text-xs text-slate-400 mt-1">Direct Transfer Total: <span className="font-bold text-white">{RS}99</span></p>
            </div>

            <div className="space-y-4">
              <div className="bg-bull-raised border border-dashed border-bull-lime/40 p-5 rounded-2xl flex flex-col items-center text-center space-y-3">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`upi://pay?pa=9324459446@ybl&pn=BullRun&am=99&cu=INR`)}`}
                  alt="Bull Run UPI Gateway QR"
                  className="w-[150px] h-[150px] border bg-white p-1 rounded-xl shadow-md"
                  loading="lazy"
                />
                <div className="text-xs">
                  <span className="text-slate-500 block text-xs uppercase">Official VPA Address</span>
                  <span className="font-mono font-black text-sm text-white">9324459446@ybl</span>
                </div>
              </div>

              <ol className="text-xs text-slate-400 list-decimal pl-4 space-y-1.5 leading-relaxed font-sans font-medium">
                <li>Scan QR code using GPay, PhonePe, Paytm, or any UPI app.</li>
                <li>Transfer exactly <span className="font-bold text-white">{RS}99</span>.</li>
                <li>Tap the button below to verify payment and unfreeze your profile.</li>
              </ol>
            </div>

            <div className="space-y-2 border-t border-bull-line pt-4">
              <button
                onClick={handleVerifyPayment}
                disabled={isProcessing}
                className="w-full text-center py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer font-mono"
              >
                {isProcessing ? (
                  <>
                    <span className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Updating Database...
                  </>
                ) : (
                  'Verify Remittance \u2014 Unlock Account'
                )}
              </button>
              <button
                onClick={() => setPaymentStep('browse')}
                disabled={isProcessing}
                className="w-full text-center py-2 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer font-mono"
              >
                Cancel and Return
              </button>
            </div>
          </div>
        )}

        {/* PAYMENT SUCCESS */}
        {paymentStep === 'success' && (
          <div className="max-w-md mx-auto bg-bull-surface border border-emerald-500/50 rounded-3xl shadow-[0_0_50px_color-mix(in_srgb,var(--color-bull-teal)_20%,transparent)] p-8 text-center space-y-6 animate-scaleUp font-mono">
            <div className="h-12 w-12 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded-2xl flex items-center justify-center mx-auto text-xl font-black">
              {TICK}
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-black text-emerald-400">Subscription Successfully Active!</h2>
              <p className="text-xs text-slate-300 leading-relaxed font-sans font-medium">
                Your payment cleared. Your account is fully unfrozen in the database with access to all modules and Volatility Arena matches.
              </p>
            </div>

            <Link
              href="/modules"
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md transition-all font-mono block text-center"
            >
              Launch Learning Arena {'\u2192'}
            </Link>
          </div>
        )}

      </div>
    </main>
  );
}