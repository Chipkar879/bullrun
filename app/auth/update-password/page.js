'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { supabase } from '@/lib/supabase';

// Supabase reports a bad or expired reset link in the URL hash or query string.
function readUrlError() {
  if (typeof window === 'undefined') return '';
  const params = new URLSearchParams(
    window.location.hash.replace(/^#/, '') + '&' + window.location.search.replace(/^\?/, '')
  );
  const code = params.get('error_code');
  const desc = params.get('error_description');
  if (!code && !params.get('error')) return '';
  if (code === 'otp_expired') {
    return 'This reset link has expired or was already used. Please request a new one.';
  }
  return desc || 'This reset link is not valid. Please request a new one.';
}

export default function UpdatePasswordPage() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ message: '', success: false });
  const [sessionReady, setSessionReady] = useState(false);
  const [urlError, setUrlError] = useState('');
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const err = readUrlError();
    if (err) {
      setUrlError(err);
      return;
    }

    let active = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === 'PASSWORD_RECOVERY' || session) setSessionReady(true);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (active && session) setSessionReady(true);
    });

    const timer = setTimeout(() => {
      if (active) setTimedOut(true);
    }, 10000);

    return () => {
      active = false;
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setStatus({ message: '', success: false });

    if (newPassword !== confirmPassword) {
      setStatus({ message: 'The two passwords do not match.', success: false });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setStatus({
        message: 'Password updated! Redirecting to login...',
        success: true,
      });

      // End the recovery session so the user signs in fresh with the new password.
      await supabase.auth.signOut();

      setTimeout(() => {
        window.location.href = '/signup?mode=login';
      }, 1500);
    } catch (err) {
      setStatus({ message: err.message, success: false });
    } finally {
      setLoading(false);
    }
  };

  const linkProblem = urlError || (!sessionReady && timedOut);
  const problemText =
    urlError ||
    'We could not verify this reset link. It may have expired or already been used. Please request a new one.';

  return (
    <main className="min-h-screen bg-bull-bg text-slate-100 antialiased pt-28 pb-12 font-sans">
      <Navbar />
      <section className="max-w-md mx-auto px-6">
        <div className="bg-bull-surface border-2 border-bull-line rounded-3xl p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-1">
            <h1 className="font-black text-2xl text-white">Reset Password</h1>
            <p className="text-xs text-slate-400">Enter your new security password below.</p>
          </div>

          {linkProblem && !sessionReady ? (
            <div className="space-y-4">
              <p className="text-xs font-bold p-3 rounded-xl border bg-rose-950/40 border-rose-900/40 text-rose-400">
                {problemText}
              </p>
              <a
                href="/signup?mode=login"
                className="block w-full py-4 bg-bull-lime hover:bg-bull-lime-light text-bull-ink font-black rounded-xl text-sm uppercase tracking-wider text-center font-mono shadow-md"
              >
                Back to login
              </a>
            </div>
          ) : !sessionReady ? (
            <div className="p-4 bg-bull-raised border border-bull-line text-amber-400 text-xs rounded-xl text-center font-mono animate-pulse">
              Verifying security token from email link...
            </div>
          ) : (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="block text-[11px] font-black uppercase text-slate-400 tracking-wider mb-1 font-mono">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="********"
                  className="w-full px-4 py-3 bg-bull-raised border border-bull-line text-white rounded-xl text-sm focus:outline-none focus:border-bull-lime font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase text-slate-400 tracking-wider mb-1 font-mono">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="********"
                  className="w-full px-4 py-3 bg-bull-raised border border-bull-line text-white rounded-xl text-sm focus:outline-none focus:border-bull-lime font-mono"
                />
              </div>

              {status.message && (
                <p className={`text-xs font-bold p-3 rounded-xl border ${status.success ? 'bg-emerald-950/40 border-emerald-900/40 text-emerald-400' : 'bg-rose-950/40 border-rose-900/40 text-rose-400'}`}>
                  {status.message}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-bull-lime hover:bg-bull-lime-light text-bull-ink font-black rounded-xl text-sm uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer font-mono shadow-md"
              >
                {loading ? 'Updating Credentials...' : 'Save New Password'}
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}