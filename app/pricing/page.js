'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

// ⚠️ PERMANENT SUPER ADMIN IMMUNITY EMAIL
const SUPER_ADMIN_EMAIL = 'verymystery18@gmail.com';

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
    <main className="min-h-screen bg-black text-slate-100 antialiased font-sans max-w-full overflow-x-hidden pt-24 pb-20 relative">
      <Navbar />

      <div className="max-w-[1000px] mx-auto px-4 space-y-10">
        
        {/* HEADER */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-2 bg-[#1a0808] border border-[#ff3333]/30 text-[#ff3333] text-[10px] uppercase tracking-widest font-black px-4 py-1.5 rounded-full shadow-inner font-mono">
            ⚡ BULL RUN ACADEMY PASS
          </span>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Student Platform Access
          </h1>
          <p className="text-slate-400 text-sm sm:text-base font-medium leading-relaxed">
            Every registered account gets an unrestricted 7-day sandbox trial. Subscribe for ₹99/month to keep your workspace active.
          </p>

          {/* DYNAMIC CLEARANCE BADGE */}
          <div className="pt-2 flex justify-center">
            <div className="bg-[#0f0505] border border-[#2b0808] px-5 py-3 rounded-2xl shadow-xl font-mono text-xs flex flex-col items-center gap-2">
              <span className="text-slate-500 font-medium text-[10px] uppercase tracking-wider">Account Clearance Status</span>
              
              {loading ? (
                <span className="text-slate-400 animate-pulse">Querying database firewall...</span>
              ) : !userSession ? (
                <div className="flex flex-col items-center space-y-2 py-1">
                  <span className="text-amber-400 font-bold text-[11px]">✨ 7-DAY FREE TRIAL AVAILABLE</span>
                  <p className="text-slate-400 text-[10px] max-w-xs text-center font-sans">
                    Countdown begins the moment you create your profile.
                  </p>
                  <Link
                    href="/signup"
                    className="mt-1 px-4 py-1.5 bg-[#7a0000] hover:bg-[#a30000] text-white font-bold rounded-xl text-[10px] uppercase tracking-wider transition-all"
                  >
                    Claim 7-Day Free Pass →
                  </Link>
                </div>
              ) : status.isSuperAdmin ? (
                <span className="bg-amber-950 text-amber-400 font-black px-3 py-1 rounded-xl border border-amber-800 flex items-center gap-1.5">
                  👑 SUPER ADMIN IMMUNE ({SUPER_ADMIN_EMAIL})
                </span>
              ) : status.isFrozen ? (
                <span className="bg-rose-950 text-rose-400 font-black px-3 py-1 rounded-xl border border-rose-800 animate-pulse flex items-center gap-1.5">
                  🔒 ACCOUNT FROZEN — ACCESS EXPIRED
                </span>
              ) : status.isPremium ? (
                <span className="bg-emerald-950 text-emerald-400 font-black px-3 py-1 rounded-xl border border-emerald-800 flex items-center gap-1.5">
                  ✓ PRO PASS ACTIVE (UNLOCKED)
                </span>
              ) : (
                <div className="flex flex-col items-center space-y-1">
                  <span className="text-amber-400 font-bold text-[11px]">⏳ TIME REMAINING BEFORE FREEZE:</span>
                  <div className="flex items-center gap-2 text-white font-black text-base bg-[#1a0808] px-4 py-1.5 rounded-xl border border-[#ff3333]/40">
                    <div className="text-center"><span className="text-[#ff3333]">{String(timeLeft.days).padStart(2, '0')}</span><span className="text-[9px] text-slate-500 block font-normal">DAYS</span></div>
                    <span className="text-[#ff3333]">:</span>
                    <div className="text-center"><span className="text-[#ff3333]">{String(timeLeft.hours).padStart(2, '0')}</span><span className="text-[9px] text-slate-500 block font-normal">HRS</span></div>
                    <span className="text-[#ff3333]">:</span>
                    <div className="text-center"><span className="text-[#ff3333]">{String(timeLeft.minutes).padStart(2, '0')}</span><span className="text-[9px] text-slate-500 block font-normal">MIN</span></div>
                    <span className="text-[#ff3333]">:</span>
                    <div className="text-center"><span className="text-[#ff3333]">{String(timeLeft.seconds).padStart(2, '0')}</span><span className="text-[9px] text-slate-500 block font-normal">SEC</span></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* LOCKED ACCOUNT WARNING — EXCLUSIVE TO FROZEN STATE */}
        {userSession && status.isFrozen && !status.isSuperAdmin && (
          <div className="bg-rose-950/60 border border-rose-500 p-6 rounded-3xl text-center space-y-3 max-w-xl mx-auto shadow-[0_0_30px_rgba(225,29,72,0.25)] animate-pulse">
            <div className="text-3xl">🔒</div>
            <h2 className="text-lg font-black text-rose-200 uppercase font-mono tracking-wider">
              YOUR ACCOUNT ACCESS IS FROZEN
            </h2>
            <p className="text-xs text-rose-300 leading-relaxed font-medium">
              Your account workspace is currently restricted. Subscribe below for ₹99/month or contact support to reactivate your access.
            </p>
          </div>
        )}

        {/* SUBSCRIPTION CARD */}
        {paymentStep === 'browse' && (
          <div className="max-w-md mx-auto bg-[#0f0505] border border-[#ff3333] shadow-[0_0_40px_rgba(255,51,51,0.2)] rounded-3xl p-8 space-y-6 relative">
            <div className="space-y-4 text-center">
              <span className="text-[10px] font-black uppercase text-[#ff3333] bg-[#1a0808] border border-[#ff3333]/30 px-3.5 py-1 rounded-full font-mono">
                MANDATORY STUDENT PASS
              </span>

              <h2 className="text-2xl font-black text-white">Full Platform Access Pass</h2>
              <p className="text-slate-400 text-xs leading-relaxed font-medium">
                Unlocks all 28 modules, 336 submodules, Volatility Arena matches, and live portfolio tracking.
              </p>

              <div className="font-mono pt-2 border-y border-[#2b0808] py-4">
                <span className="text-4xl font-black text-white">₹99</span>
                <span className="text-slate-500 text-xs"> / month</span>
                <span className="block text-[10px] text-emerald-400 font-bold mt-1">
                  ✓ Instant Account Unfreeze
                </span>
              </div>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
                WHAT IS INCLUDED:
              </span>
              <ul className="space-y-2.5 font-sans font-medium text-slate-200">
                <li className="flex items-center gap-2.5">
                  <span className="text-[#ff3333] font-black">✓</span>
                  <span>Full Access to All 28 Modules & Quizzes</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="text-[#ff3333] font-black">✓</span>
                  <span>Volatility Arena Match Access</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="text-[#ff3333] font-black">✓</span>
                  <span>Unfreezes Account Permanently</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="text-[#ff3333] font-black">✓</span>
                  <span>Trader XP & Level Progress Saved</span>
                </li>
              </ul>
            </div>

            {status.isPremium && !status.isFrozen ? (
              <Link
                href="/modules"
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-2xl font-mono shadow-lg block text-center transition-all"
              >
                Launch Learning Arena →
              </Link>
            ) : !userSession ? (
              <Link
                href="/signup"
                className="w-full py-4 bg-[#ff3333] hover:bg-[#dc2626] text-white text-xs font-black uppercase tracking-wider rounded-2xl font-mono shadow-lg shadow-[#ff3333]/20 transition-all block text-center"
              >
                Create Account for Free Trial →
              </Link>
            ) : (
              <button
                onClick={() => setPaymentStep('checkout')}
                className="w-full py-4 bg-[#ff3333] hover:bg-[#dc2626] text-white text-xs font-black uppercase tracking-wider rounded-2xl font-mono shadow-lg shadow-[#ff3333]/20 transition-all cursor-pointer"
              >
                {status.isFrozen ? 'Unlock Account — ₹99/month' : 'Subscribe Now — ₹99/month'}
              </button>
            )}
          </div>
        )}

        {/* CHECKOUT STEP */}
        {paymentStep === 'checkout' && (
          <div className="max-w-md mx-auto bg-[#0f0505] border border-[#ff3333]/50 rounded-3xl shadow-[0_0_50px_rgba(255,51,51,0.2)] p-6 space-y-6 animate-scaleUp font-mono">
            <div className="text-center border-b border-[#2b0808] pb-4">
              <span className="text-[10px] font-black text-[#ff3333] uppercase tracking-widest bg-[#1a0808] px-2.5 py-0.5 rounded border border-[#ff3333]/20">
                SECURE UPI PAYMENT GATEWAY
              </span>
              <h2 className="font-black text-xl text-white mt-2">Activate ₹99 Subscription</h2>
              <p className="text-xs text-slate-400 mt-1">Direct Transfer Total: <span className="font-bold text-white">₹99</span></p>
            </div>

            <div className="space-y-4">
              <div className="bg-[#1a0808] border border-dashed border-[#ff3333]/40 p-5 rounded-2xl flex flex-col items-center text-center space-y-3">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`upi://pay?pa=9324459446@ybl&pn=BullRunAcademy&am=99&cu=INR`)}`} 
                  alt="Bull Run UPI Gateway QR" 
                  className="w-[150px] h-[150px] border bg-white p-1 rounded-xl shadow-md"
                  loading="lazy"
                />
                <div className="text-xs">
                  <span className="text-slate-500 block text-[10px] uppercase">Official VPA Address</span>
                  <span className="font-mono font-black text-sm text-white">9324459446@ybl</span>
                </div>
              </div>

              <ol className="text-[11px] text-slate-400 list-decimal pl-4 space-y-1.5 leading-relaxed font-sans font-medium">
                <li>Scan QR code using GPay, PhonePe, Paytm, or any UPI app.</li>
                <li>Transfer exactly <span className="font-bold text-white">₹99</span>.</li>
                <li>Tap the button below to verify payment and unfreeze your profile.</li>
              </ol>
            </div>

            <div className="space-y-2 border-t border-[#2b0808] pt-4">
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
                  "Verify Remittance — Unlock Account"
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
          <div className="max-w-md mx-auto bg-[#0f0505] border border-emerald-500/50 rounded-3xl shadow-[0_0_50px_rgba(16,185,129,0.2)] p-8 text-center space-y-6 animate-scaleUp font-mono">
            <div className="h-12 w-12 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded-2xl flex items-center justify-center mx-auto text-xl font-black">
              ✓
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
              Launch Learning Arena →
            </Link>
          </div>
        )}

      </div>
    </main>
  );
}