'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState({ name: '', email: '', joined: '', role: 'personal', quiz_points: 0 });
  const [initials, setInitials] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Edit Mode States
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [updateStatus, setUpdateStatus] = useState({ message: '', success: false, loading: false });

  // Performance Metrics 
  const [analytics, setAnalytics] = useState({ tier: 'Standard Sandboxer', multiplier: '1.0x', completionRate: '0%' });

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          router.push('/signup?mode=login');
          return;
        }

        const { data: dbProfile } = await supabase
          .from('profiles')
          .select('name, created_at, quiz_points, role')
          .eq('id', session.user.id)
          .maybeSingle();

        const accountName = dbProfile?.name || "Bull Run Trader";
        const accountEmail = session.user.email;
        const rawDate = dbProfile?.created_at || session.user.created_at;
        const totalPoints = dbProfile?.quiz_points || 0;
        
        const formattedDate = new Date(rawDate).toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

        // 1. CALCULATE DAYS SINCE REGISTRATION
        const createdDate = new Date(rawDate);
        const todayDate = new Date();
        const diffTime = Math.abs(todayDate - createdDate);
        const totalDaysSinceRegistered = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

        // 2. CALCULATE DAYS QUIZ PLAYED
        const estimatedDaysPlayed = totalPoints > 0 ? Math.max(1, Math.floor(totalPoints / 1000)) : 0; 
        let dynamicRate = Math.min(100, Math.round((estimatedDaysPlayed * 100) / totalDaysSinceRegistered));

        // Dynamic Tiering Calculations
        let userTier = 'Standard Sandboxer';
        let pointMultiplier = '1.0x';
        if (totalPoints >= 5000) { userTier = 'Apex Market Master'; pointMultiplier = '2.5x'; }
        else if (totalPoints >= 2500) { userTier = 'Alpha Portfolio Lead'; pointMultiplier = '1.8x'; }
        else if (totalPoints >= 1000) { userTier = 'Veteran Arbitrageur'; pointMultiplier = '1.3x'; }

        const nameParts = accountName.trim().split(/\s+/);
        const userInitials = nameParts.length > 1 
          ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
          : nameParts[0].substring(0, 2).toUpperCase();

        setProfile({
          name: accountName,
          email: accountEmail,
          joined: formattedDate,
          role: dbProfile?.role || 'personal',
          quiz_points: totalPoints
        });
        setEditName(accountName);
        setInitials(userInitials);
        setAnalytics({
          tier: userTier,
          multiplier: pointMultiplier,
          completionRate: `${dynamicRate}%`
        });
      } catch (err) {
        console.error("Profile view loading error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [router]);

  const handleSaveChanges = async (e) => {
    e.preventDefault();
    if (!editName.trim()) return;
    setUpdateStatus({ message: '', success: false, loading: true });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("No active session found.");

      const { error } = await supabase
        .from('profiles')
        .update({ name: editName.trim() })
        .eq('id', session.user.id);

      if (error) throw error;

      setProfile(prev => ({ ...prev, name: editName.trim() }));
      
      const nameParts = editName.trim().split(/\s+/);
      const userInitials = nameParts.length > 1 
        ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
        : nameParts[0].substring(0, 2).toUpperCase();
      setInitials(userInitials);

      setUpdateStatus({ message: 'Profile dossier updated successfully! ✨', success: true, loading: false });
      setTimeout(() => {
        setIsEditing(false);
        setUpdateStatus({ message: '', success: false, loading: false });
      }, 1500);

    } catch (err) {
      setUpdateStatus({ message: err.message || 'Failed to update changes.', success: false, loading: false });
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      if (typeof window !== 'undefined') {
        window.localStorage.clear();
        window.sessionStorage.clear();
        const cookies = document.cookie.split(";");
        const targetPaths = ['/', '/simulator', '/quiz', '/modules', '/leaderboard', '/profile'];
        for (let i = 0; i < cookies.length; i++) {
          const cookie = cookies[i];
          const eqPos = cookie.indexOf("=");
          const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
          targetPaths.forEach(path => {
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`;
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}; SameSite=Lax; Secure`;
          });
        }
      }
    } catch (err) {
      console.error("Signout security loop crash:", err);
    } finally {
      window.location.href = '/signup';
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-bull-bg text-slate-100 antialiased font-sans relative">
        <Navbar />
        <div className="max-w-4xl mx-auto px-6 pt-32 pb-24 flex justify-center">
          <div className="space-y-4 text-center">
            <div className="w-12 h-12 border-4 border-bull-lime border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Decrypting Secured Trading Dossier...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-bull-bg text-slate-100 antialiased font-sans relative max-w-full overflow-x-hidden pt-24 pb-20">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8 animate-fadeInFast">
        
        {/* HERO BANNER PROFILE CARD */}
        <div className="bg-bull-surface border-2 border-bull-line p-6 sm:p-8 rounded-3xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden border-b-4 border-b-bull-lime-dark">
          <div className="absolute top-0 right-0 w-64 h-64 bg-bull-lime/15 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10">
            <div className="w-24 h-24 bg-gradient-to-tr from-bull-raised to-bull-bg text-bull-lime border-2 border-bull-line rounded-2xl font-poppins font-black text-4xl flex items-center justify-center shadow-xl select-none">
              {initials}
            </div>
            
            <div className="space-y-2 text-center sm:text-left">
              <span className="bg-bull-raised text-bull-lime border border-bull-line text-[10px] uppercase tracking-widest font-black px-3 py-1 rounded-full shadow-inner">
                🏆 {analytics.tier}
              </span>
              <h1 className="font-poppins font-black text-2xl sm:text-3xl text-white tracking-tight">
                {profile.name}
              </h1>
              <p className="text-slate-400 text-xs font-bold">
                Network Stream ID: <span className="text-bull-lime font-mono">BR-{profile.role.toUpperCase()}-ACTIVE</span>
              </p>
            </div>
          </div>

          <div className="flex gap-3 relative z-10">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="text-xs font-black uppercase tracking-wider text-slate-200 border border-bull-line bg-bull-raised hover:border-bull-lime/50 hover:text-white px-4 py-2.5 rounded-xl transition shadow-md whitespace-nowrap"
            >
              {isEditing ? 'Cancel Edit' : 'Modify Details ⚙️'}
            </button>
            <button
              onClick={handleSignOut}
              className="text-xs font-black uppercase tracking-wider text-rose-400 border border-rose-900/40 bg-rose-950/20 hover:bg-rose-950/50 px-4 py-2.5 rounded-xl transition shadow-md whitespace-nowrap"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* INTERACTIVE EDITING PORTAL PANEL */}
        {isEditing && (
          <form onSubmit={handleSaveChanges} className="bg-bull-surface border-2 border-bull-lime/50 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-4 animate-scaleUp">
            <h3 className="font-poppins font-black text-lg text-white flex items-center gap-2">
              📝 Edit Personal Profile Records
            </h3>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Account Display Name</label>
              <input 
                type="text" 
                value={editName}
                required
                maxLength={40}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-4 py-3 bg-bull-raised border border-bull-line text-white rounded-xl text-sm font-bold focus:outline-none focus:border-bull-lime transition-colors"
                placeholder="Update your name"
              />
            </div>
            
            {updateStatus.message && (
              <p className={`text-xs font-bold p-3 rounded-xl border ${updateStatus.success ? 'bg-emerald-950/40 border-emerald-900 text-emerald-400' : 'bg-rose-950/40 border-rose-900 text-rose-400'}`}>
                {updateStatus.message}
              </p>
            )}

            <button 
              type="submit" 
              disabled={updateStatus.loading}
              className="px-6 py-3 bg-bull-lime hover:bg-bull-lime-light text-bull-ink text-xs font-black uppercase tracking-wider rounded-xl transition shadow-md disabled:opacity-50"
            >
              {updateStatus.loading ? 'Saving Dossier Changes...' : 'Commit Changes'}
            </button>
          </form>
        )}

        {/* CORE METRICS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-bull-surface border border-bull-line p-5 rounded-2xl shadow-xl flex items-center gap-4">
            <div className="text-3xl p-3 bg-bull-raised border border-bull-line rounded-xl">👑</div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Bazaar Bucks Balance</p>
              <h3 className="text-xl font-black font-mono text-white">{profile.quiz_points || 0} BB</h3>
            </div>
          </div>
          <div className="bg-bull-surface border border-bull-line p-5 rounded-2xl shadow-xl flex items-center gap-4">
            <div className="text-3xl p-3 bg-bull-raised border border-bull-line rounded-xl">⚡</div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Payout Multiplier</p>
              <h3 className="text-xl font-black font-mono text-emerald-400">{analytics.multiplier}</h3>
            </div>
          </div>
          <div className="bg-bull-surface border border-bull-line p-5 rounded-2xl shadow-xl flex items-center gap-4">
            <div className="text-3xl p-3 bg-bull-raised border border-bull-line rounded-xl">📈</div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Quiz Completion Rate</p>
              <h3 className="text-xl font-black font-mono text-bull-lime">{analytics.completionRate}</h3>
            </div>
          </div>
        </div>

        {/* CORE DETAILS DATA MATRIX */}
        <section className="bg-bull-surface border border-bull-line rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <h2 className="font-poppins font-black text-lg text-white border-b border-bull-line pb-4 flex items-center gap-2">
            🛡️ Confidential Credentials Matrix
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">System Username Identification</label>
              <div className="p-4 bg-bull-raised border border-bull-line text-white rounded-xl text-sm font-bold select-all">
                {profile.name}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Registered Email Handle</label>
              <div className="p-4 bg-bull-raised border border-bull-line text-slate-400 rounded-xl text-sm font-semibold select-none font-mono">
                {profile.email}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Account Initialization Stamp</label>
              <div className="p-4 bg-bull-raised border border-bull-line text-slate-300 rounded-xl text-sm font-bold select-none">
                {profile.joined}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Current Selected Workspace Track</label>
              <div className="p-4 bg-bull-raised border border-bull-line text-bull-lime rounded-xl text-sm font-black uppercase select-none tracking-wider">
                {profile.role} Profile Mode
              </div>
            </div>
          </div>
        </section>

      </div>
    </main>
  );
}