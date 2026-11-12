'use client';

import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// Floating background assets with fixed depth layers
const RainingAsset = ({ icon, isMobileHidden }) => {
  const [style, setStyle] = useState({});

  useEffect(() => {
    setStyle({
      left: `${Math.random() * 92 + 3}%`,
      animationDuration: `${Math.random() * 5 + 6}s`,
      animationDelay: `${Math.random() * 6}s`,
      fontSize: `${Math.random() * 10 + 14}px`,
    });
  }, []);

  return (
    <div
      className={`absolute top-[-5vh] text-bull-lime/25 pointer-events-none select-none animate-rainDown ${
        isMobileHidden ? 'hidden md:block' : ''
      }`}
      style={style}
    >
      {icon}
    </div>
  );
};

export default function Home() {
  const [activeTab, setActiveTab] = useState('stocks'); 
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Institutional school & delegated class architecture states
  const [schoolClasses, setSchoolClasses] = useState([]);
  const [allSchoolTeachers, setAllSchoolTeachers] = useState([]);
  const [pendingClassStudents, setPendingClassStudents] = useState([]);
  const [newClassName, setNewClassName] = useState('');

  // Sync state with active user sessions and visual cloud profiles
  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          if (!error && data) {
            setProfile(data);
            fetchInstitutionalEcosystem(data);
          }
        }
      } catch (err) {
        console.error("Session sync fault:", err);
      } finally {
        setLoading(false);
      }
    };
    checkUser();
  }, []);

  const fetchInstitutionalEcosystem = async (currentProfile) => {
    if (!currentProfile.school_id) return;

    const { data: classes } = await supabase
      .from('school_classes')
      .select('*, profiles(name, email)')
      .eq('school_code', currentProfile.school_id);
    setSchoolClasses(classes || []);

    const { data: teachers } = await supabase
      .from('profiles')
      .select('id, name, email')
      .eq('school_id', currentProfile.school_id)
      .eq('role', 'teacher')
      .eq('verification_status', 'approved');
    setAllSchoolTeachers(teachers || []);

    const myAssignedClassIds = (classes || [])
      .filter(c => c.assigned_teacher_id === currentProfile.id)
      .map(c => c.id);

    if (myAssignedClassIds.length > 0) {
      const { data: students } = await supabase
        .from('profiles')
        .select('*')
        .in('specific_class_id', myAssignedClassIds)
        .eq('student_approved', false);
      setPendingClassStudents(students || []);
    }
  };

  const handleCreateClassContainer = async () => {
    if (!newClassName || !profile?.school_id) return;
    const { error } = await supabase
      .from('school_classes')
      .insert([{ school_code: profile.school_id, class_name: newClassName }]);
    if (!error) {
      setNewClassName('');
      fetchInstitutionalEcosystem(profile);
    }
  };

  const handleTeacherAssignToClass = async (classId, teacherId) => {
    const { error } = await supabase
      .from('school_classes')
      .update({ assigned_teacher_id: teacherId || null })
      .eq('id', classId);
    if (!error) fetchInstitutionalEcosystem(profile);
  };

  const handleApproveStudent = async (studentId) => {
    const { error } = await supabase
      .from('profiles')
      .update({ student_approved: true, wallet_balance: 50000 })
      .eq('id', studentId);
    if (!error) fetchInstitutionalEcosystem(profile);
  };

  const handleLeaveClassroomTrack = async () => {
    if (!confirm("Are you sure you want to leave this class track room? Your wallet position will reset.")) return;
    const { error } = await supabase
      .from('profiles')
      .update({ school_id: null, specific_class_id: null, student_approved: false, wallet_balance: 0 })
      .eq('id', user.id);
    if (!error) window.location.reload();
  };

  // COMPLETE ACCOUNT PURGE (DELETES FROM AUTH.USERS AND PUBLIC.PROFILES)
  const handlePermanentDeletion = async () => {
    if (!confirm("CRITICAL WARNING: This will permanently wipe your profile and authentication nodes. Proceed?")) return;
    if (!confirm("🚨 FINAL WARNING: Deleting your account is permanent and cannot be undone.")) return;

    try {
      // Call Supabase RPC function to purge user from auth.users (cascades to public.profiles)
      const { error } = await supabase.rpc('delete_user_account');

      if (error) throw error;

      await supabase.auth.signOut();
      alert("Account completely deleted from database registers.");
      window.location.reload();
    } catch (err) {
      console.error("Deletion error:", err);
      alert(`Failed to delete account: ${err.message}`);
    }
  };

  const ASSET_TYPES = ['\u20B9', '$', '\uD83D\uDE80', '\uD83D\uDCC8', '\uD83D\uDCC9', '\u20BF', '\uD83D\uDCCA', '\uD83D\uDCBC', '\uD83D\uDCB3', '\uD83D\uDC8E'];

  return (
    <main className="min-h-screen bg-bull-bg text-slate-100 antialiased font-sans relative max-w-full overflow-x-hidden pb-20">
      <Navbar />

      {/* RAINING BACKGROUND MATRIX */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden max-w-full">
        {ASSET_TYPES.map((asset, typeIdx) => 
          [...Array(5)].map((_, itemIdx) => (
            <RainingAsset 
              key={`asset-${typeIdx}-${itemIdx}`} 
              icon={asset} 
              isMobileHidden={itemIdx >= 2} 
            />
          ))
        )}
      </div>

      {/* HERO SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-28 sm:pt-36 text-center space-y-8 relative z-10">
        
        {/* Ambient Glow Orb */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[300px] sm:w-[600px] h-[200px] sm:h-[300px] bg-bull-lime/20 blur-[120px] rounded-full -z-10" />

        {/* HEADLINE BLOCK */}
        <div className="space-y-4 max-w-3xl mx-auto select-none">
          
          {/* BADGE */}
          <div>
            <span className="inline-flex items-center gap-2 bg-bull-raised border border-bull-line text-bull-lime text-[11px] uppercase tracking-widest font-black px-4 py-1.5 rounded-full shadow-lg border-b-2 border-b-bull-lime-dark hover:border-bull-lime transition-all duration-300">
              🚀 The Ultimate Classroom Sandbox Arena
            </span>
          </div>
          
          {/* MAIN HEADLINE */}
          <h1 className="text-4xl sm:text-7xl font-black tracking-tight leading-none text-white font-poppins">
            Own the Market <br className="hidden sm:inline" />
            Before the{' '}
            <span className="inline-block bg-gradient-to-r from-bull-lime via-bull-teal to-bull-lime bg-clip-text text-transparent font-black filter drop-shadow-[2px_2px_0px_var(--color-bull-lime-dark)] drop-shadow-[0_10px_20px_color-mix(in_srgb,var(--color-bull-lime)_30%,transparent)] hover:scale-105 transition-transform duration-300 cursor-default">
              Bell Rings
            </span>
          </h1>

          {/* SUBTITLE */}
          <p className="text-slate-300 text-xs sm:text-base max-w-xl mx-auto leading-relaxed pt-3 font-medium">
            Risk-free paper trading powered by high-frequency market simulations. Practice with live data feeds, candlestick tracking layers, and competitive campus leaderboards.
          </p>
        </div>

        {/* CARD WORKSPACE: CARD-LEVEL INTERACTIVE HOVER TARGETS */}
        <div className="flex flex-wrap justify-center items-center gap-4 pt-4">
          {loading ? (
            <div className="px-10 py-4 bg-bull-raised border border-bull-line text-slate-500 rounded-2xl text-sm font-bold animate-pulse shadow-xl">
              Syncing Terminal...
            </div>
          ) : !user ? (
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/signup"
                className="bg-bull-lime text-bull-ink font-poppins font-black px-10 py-4 rounded-2xl text-sm shadow-[0_10px_25px_color-mix(in_srgb,var(--color-bull-lime)_40%,transparent)] hover:bg-bull-lime-light hover:-translate-y-1 hover:shadow-[0_15px_30px_color-mix(in_srgb,var(--color-bull-lime)_50%,transparent)] transition-all duration-300 relative overflow-hidden group border-b-4 border-b-bull-lime-dark"
              >
                <span className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700 skew-x-[-20deg]" />
                Claim Your Sandbox Wallet
              </Link>
              <Link
                href="/signup?mode=login"
                className="bg-bull-surface border-2 border-bull-line text-slate-300 font-poppins font-black px-10 py-4 rounded-2xl text-sm hover:border-bull-lime/50 hover:text-white hover:-translate-y-1 transition-all shadow-lg"
              >
                Access Dashboard
              </Link>
            </div>
          ) : (
            <div className="card w-full max-w-md bg-bull-surface border-2 border-bull-line rounded-3xl p-6 text-left shadow-xl space-y-4 hover:border-bull-lime/50 hover:shadow-[0_20px_40px_color-mix(in_srgb,var(--color-bull-lime)_30%,transparent)] transition-all duration-300 border-b-4 border-b-bull-line">
              
              {profile?.role === 'student' && !profile?.student_approved && (
                <div className="bg-amber-950/40 border border-amber-900/60 text-amber-300 rounded-xl p-4 text-xs space-y-1 shadow-inner">
                  <p className="font-black uppercase tracking-wider">🔒 Verification Pending</p>
                  <p className="text-slate-400 font-medium">Your profile is connected to school hub <strong>{profile.school_id}</strong>. Your specific class manager teacher will unlock your wallet shortly.</p>
                </div>
              )}

              {profile?.role === 'teacher' && profile?.verification_status === 'pending' && (
                <div className="bg-amber-950/40 border border-amber-900/60 text-amber-300 rounded-xl p-4 text-xs space-y-1 shadow-inner">
                  <p className="font-black uppercase tracking-wider">⏳ Verification Auditing</p>
                  <p className="text-slate-400 font-medium">Your document proof has been submitted to the admin queue. Dashboards will unlock right after approval confirmation.</p>
                </div>
              )}

              <div className="flex items-center justify-between border-b border-bull-line pb-3">
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Active User</p>
                  <h3 className="text-base font-poppins font-black text-white">{profile?.name || 'Workspace Account'}</h3>
                </div>
                <span className="px-2.5 py-0.5 bg-bull-raised border border-bull-line rounded-full text-[10px] font-black uppercase tracking-wider text-bull-lime shadow-md">
                  {profile?.role || 'Personal'} Track
                </span>
              </div>
              
              {((profile?.role === 'student' && profile?.student_approved) || profile?.role === 'personal') && (
                <div className="bg-gradient-to-br from-bull-raised to-bull-surface p-4 rounded-xl text-white shadow-md space-y-1 border border-bull-lime/40 border-b-2 border-b-bull-lime-dark">
                  <p className="text-[10px] font-black uppercase tracking-wider text-rose-200/80">Available Sandbox Balance</p>
                  <p className="text-2xl font-poppins font-black tracking-tight font-mono">
                    ₹{(profile?.wallet_balance || 50000).toLocaleString('en-IN')}
                  </p>
                </div>
              )}

              {profile?.role === 'student' && (
                <button onClick={handleLeaveClassroomTrack} className="w-full py-2 bg-rose-950/30 border border-rose-900/40 hover:bg-rose-950/60 text-rose-400 font-bold text-xs rounded-xl transition-all">
                  Leave Classroom Tracker
                </button>
              )}

              {profile?.role === 'teacher' && profile?.verification_status === 'approved' && (
                <div className="space-y-4 pt-1 border-t border-bull-line">
                  <div className="bg-bull-raised p-3 rounded-xl border border-bull-line space-y-2">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">🏢 School Class Matrix (Hub: {profile.school_id})</p>
                    <div className="flex gap-2">
                      <input type="text" className="px-2.5 py-1.5 bg-bull-surface border border-bull-line text-white rounded-xl text-xs font-bold focus:outline-none focus:border-bull-lime w-full" placeholder="Add Class (e.g. Class 9-A)" value={newClassName} onChange={(e) => setNewClassName(e.target.value)} />
                      <button onClick={handleCreateClassContainer} className="px-3 py-1.5 bg-bull-lime hover:bg-bull-lime-light text-bull-ink font-bold text-xs rounded-xl whitespace-nowrap">Create</button>
                    </div>

                    <div className="space-y-1.5 pt-1.5 max-h-36 overflow-y-auto divide-y divide-bull-line">
                      {schoolClasses.length === 0 ? (
                        <p className="text-[10px] text-slate-500 font-medium py-1">No classrooms added under this school code yet.</p>
                      ) : (
                        schoolClasses.map((c) => (
                          <div key={c.id} className="flex flex-col gap-1 pt-1.5 text-[11px] font-bold">
                            <span className="text-white">🏫 {c.class_name}</span>
                            <select className="bg-bull-surface border border-bull-line p-1 rounded-lg text-[10px] text-slate-400 font-medium focus:outline-none w-full" value={c.assigned_teacher_id || ''} onChange={(e) => handleTeacherAssignToClass(c.id, e.target.value)}>
                              <option value="">-- Assign Managing Teacher --</option>
                              {allSchoolTeachers.map(t => <option key={t.id} value={t.id}>{t.name} ({t.email})</option>)}
                            </select>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* DANGER ZONE: ACCOUNT DELETION */}
              <div className="p-3.5 border border-rose-900/30 bg-rose-950/20 rounded-2xl space-y-1">
                <h4 className="text-xs font-black text-rose-400 uppercase tracking-wider">⚠️ Danger Zone</h4>
                <p className="text-[10px] text-slate-400 font-medium">Wiping your account is immediate, final, and deletes all user and database data.</p>
                <button onClick={handlePermanentDeletion} className="mt-1 px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white font-black text-[10px] rounded-xl transition-all">
                  Delete My Account Completely
                </button>
              </div>

              <div className="flex gap-2 items-center justify-between pt-1 border-t border-bull-line">
                <div className="text-[10px] text-slate-500 font-medium truncate max-w-[60%] font-mono">
                  {user.email}
                </div>
                <button
                  onClick={async () => {
                    await supabase.auth.signOut();
                    window.location.reload();
                  }}
                  className="px-3 py-1.5 bg-bull-raised border border-bull-line hover:bg-rose-950/40 hover:text-rose-400 text-slate-400 text-[10px] font-bold rounded-lg transition-all"
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* TEACHER APPROVAL QUEUE CARD */}
      {profile?.role === 'teacher' && profile?.verification_status === 'approved' && pendingClassStudents.length > 0 && (
        <section className="max-w-md mx-auto px-4 sm:px-6 pt-6 relative z-20 animate-fadeInFast">
          <div className="card bg-bull-surface border-2 border-bull-line rounded-3xl p-5 shadow-2xl space-y-3 hover:border-bull-lime/50 transition-all">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">📋 Live Assigned Class Requests ({pendingClassStudents.length})</h4>
            <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
              {pendingClassStudents.map(student => (
                <div key={student.id} className="p-2.5 bg-bull-raised border border-bull-line rounded-xl flex items-center justify-between gap-2 text-xs font-bold">
                  <div className="truncate">
                    <p className="text-white truncate">{student.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono font-medium truncate">{student.email}</p>
                  </div>
                  <button onClick={() => handleApproveStudent(student.id)} className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold whitespace-nowrap transition-all">Approve Position</button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* LIVE MARKET SIMULATOR TERMINAL CARD */}
      <section id="simulator" className="max-w-7xl mx-auto px-4 sm:px-6 pt-28 relative z-10 flex flex-col items-center justify-center animate-fadeIn scroll-mt-24">
        <div className="border-b border-bull-line pb-6 mb-12 text-center max-w-xl w-full">
          <h2 className="text-2xl font-black text-white font-poppins">Terminal Engine Simulator</h2>
          <p className="text-xs text-slate-400 mt-1 font-medium">Real-time exchange tracking interfaces driven by high-accuracy pipeline proxies.</p>
        </div>

        <div className="card bg-bull-surface border-2 border-bull-line rounded-3xl shadow-2xl w-full max-w-4xl p-6 grid grid-cols-1 md:grid-cols-3 gap-6 items-center border-b-4 border-b-bull-line hover:border-bull-lime/50 hover:shadow-[0_20px_50px_color-mix(in_srgb,var(--color-bull-lime)_25%,transparent)] transition-all duration-300">
          <div className="col-span-1 space-y-3">
            <div className="text-[11px] font-black uppercase text-slate-500 tracking-wider px-1">Select Live Stream Desk:</div>
            <button
              onClick={() => setActiveTab('stocks')}
              className={`w-full flex justify-between items-center px-4 py-3.5 rounded-2xl border text-left text-xs uppercase tracking-wider font-black transition-all ${activeTab === 'stocks' ? 'bg-bull-lime/20 border-bull-lime/50 text-bull-lime shadow-md' : 'bg-bull-raised border-bull-line text-slate-400 hover:bg-bull-line'}`}
            >
              📈 Live NSE Indian Stocks
              <span className={`h-2 w-2 rounded-full ${activeTab === 'stocks' ? 'bg-bull-lime animate-pulse' : 'bg-slate-700'}`} />
            </button>
            <button
              onClick={() => setActiveTab('crypto')}
              className={`w-full flex justify-between items-center px-4 py-3.5 rounded-2xl border text-left text-xs uppercase tracking-wider font-black transition-all ${activeTab === 'crypto' ? 'bg-bull-lime/20 border-bull-lime/50 text-bull-lime shadow-md' : 'bg-bull-raised border-bull-line text-slate-400 hover:bg-bull-line'}`}
            >
              🚀 Beta Challenge Equities
              <span className={`h-2 w-2 rounded-full ${activeTab === 'crypto' ? 'bg-bull-lime animate-pulse' : 'bg-slate-700'}`} />
            </button>
          </div>

          <div className="col-span-2 bg-bull-bg border border-bull-line rounded-2xl p-6 font-sans text-slate-200 relative overflow-hidden group min-h-[250px] flex flex-col justify-between shadow-inner">
            {activeTab === 'stocks' && (
              <div className="space-y-4 animate-fadeInFast w-full">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black bg-bull-raised text-rose-300 border border-bull-line px-2.5 py-1 rounded-md tracking-wider">RELIANCE.NS • NSE LIVE</span>
                  <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">● Exchange Open</span>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Current Market Price</div>
                  <div className="text-3xl font-black font-mono tracking-tight text-white">₹1,309.35</div>
                  <div className="text-xs font-bold text-emerald-400 font-mono">+₹12.40 (+0.95%)</div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-bull-line text-[11px] font-mono text-slate-400">
                  <div>Prev Close: <span className="text-white font-bold">₹1,296.95</span></div>
                  <div>Day Volume: <span className="text-white font-bold">4.2M Shares</span></div>
                </div>
              </div>
            )}

            {activeTab === 'crypto' && (
              <div className="space-y-4 animate-fadeInFast w-full">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black bg-bull-raised text-rose-300 border border-bull-line px-2.5 py-1 rounded-md tracking-wider">TECH.CHALLENGE • HIGH-BETA</span>
                  <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md animate-pulse">⚡ Arena Ticking</span>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Simulated Price Scale</div>
                  <div className="text-3xl font-black font-mono tracking-tight text-white">₹12,500.00</div>
                  <div className="text-xs font-bold text-rose-500 font-mono">-₹2,500.00 (-20.00%)</div>
                </div>
                <div className="p-2.5 bg-rose-500/5 border border-rose-500/10 rounded-xl text-[11px] text-rose-400 leading-relaxed font-semibold">
                  📢 System Event Broadcast: Tech sector crash initiated! TECH drops 20% over current challenge lifecycle step.
                </div>
              </div>
            )}

            <div className="absolute bottom-0 inset-x-0 h-24 opacity-10 pointer-events-none -z-10">
              <svg viewBox="0 0 400 120" preserveAspectRatio="none" className="w-full h-full fill-none stroke-current text-bull-teal">
                <path d="M0,120 L20,90 L50,110 L100,20 L150,80 L200,10 L250,90 L300,40 L350,110 L400,10" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* INTEGRATED LEARNING ACADEMY CARDS */}
      <section id="courses" className="max-w-6xl mx-auto px-4 sm:px-6 pt-32 relative z-10 space-y-8 scroll-mt-24">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-black tracking-tight text-white font-poppins">Integrated Trading Academy</h2>
          <p className="text-slate-400 text-xs max-w-md mx-auto font-medium">Master tactical market theories through dynamic self-paced sandbox training paths.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card bg-bull-surface border-2 border-bull-line p-6 rounded-3xl space-y-4 shadow-xl hover:border-bull-lime/50 hover:-translate-y-1 hover:shadow-[0_15px_30px_color-mix(in_srgb,var(--color-bull-lime)_30%,transparent)] transition-all duration-300">
            <div className="h-10 w-10 rounded-xl bg-bull-raised border border-bull-line text-bull-lime flex items-center justify-center text-lg font-black">01</div>
            <h3 className="font-black text-base text-white font-poppins">Market Foundations</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">Understand technical asset pricing loops, stock charts, order structures, and index operations across primary exchanges.</p>
            <div className="pt-2"><span className="text-[10px] font-black uppercase tracking-wider bg-bull-raised border border-bull-line text-rose-300 px-2.5 py-1 rounded-md">8 Modules • Beginner</span></div>
          </div>

          <div className="card bg-bull-surface border-2 border-bull-line p-6 rounded-3xl space-y-4 shadow-xl hover:border-bull-lime/50 hover:-translate-y-1 hover:shadow-[0_15px_30px_color-mix(in_srgb,var(--color-bull-lime)_30%,transparent)] transition-all duration-300">
            <div className="h-10 w-10 rounded-xl bg-bull-raised border border-bull-line text-bull-lime flex items-center justify-center text-lg font-black">02</div>
            <h3 className="font-black text-base text-white font-poppins">Technical Analysis</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">Map patterns using support levels, moving averages, and volume indicators to execute quantitative simulator mock plays.</p>
            <div className="pt-2"><span className="text-[10px] font-black uppercase tracking-wider bg-bull-raised border border-bull-line text-rose-300 px-2.5 py-1 rounded-md">12 Modules • Intermediate</span></div>
          </div>

          <div className="card bg-bull-surface border-2 border-bull-line p-6 rounded-3xl space-y-4 shadow-xl hover:border-bull-lime/50 hover:-translate-y-1 hover:shadow-[0_15px_30px_color-mix(in_srgb,var(--color-bull-lime)_30%,transparent)] transition-all duration-300">
            <div className="h-10 w-10 rounded-xl bg-bull-raised border border-bull-line text-bull-lime flex items-center justify-center text-lg font-black">03</div>
            <h3 className="font-black text-base text-white font-poppins">Portfolio Risk Management</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">Mitigate drawdown via position sizing models, strict asset tracking ratios, and dynamic algorithmic hedging criteria.</p>
            <div className="pt-2"><span className="text-[10px] font-black uppercase tracking-wider bg-bull-raised border border-bull-line text-rose-300 px-2.5 py-1 rounded-md">6 Modules • Advanced</span></div>
          </div>
        </div>
      </section>

      {/* CAMPUS DEPLOYMENT BANNER CARD */}
      <section id="pricing" className="max-w-7xl mx-auto px-4 sm:px-6 pt-32 relative z-10 scroll-mt-24">
        <div className="card bg-gradient-to-br from-bull-surface to-bull-raised border-2 border-bull-line text-white rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 group border-b-4 border-b-bull-lime-dark hover:border-bull-lime transition-all duration-300">
          <div className="space-y-3 max-w-xl text-center md:text-left z-10">
            <span className="bg-bull-lime/20 text-bull-lime font-mono font-black text-[10px] uppercase tracking-widest px-3 py-1 rounded border border-bull-lime/40">
              Campus Classroom Access
            </span>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight text-white font-poppins">Launch Custom Classroom Tournaments</h2>
            <p className="text-slate-400 text-xs leading-relaxed max-w-lg mx-auto md:mx-0 font-medium">
              Deploy programmatic classroom sandboxes, initiate specific challenge milestones, and monitor student metrics through clean analytical reporting tables.
            </p>
          </div>

          <div className="w-full md:w-auto z-10 flex flex-col sm:flex-row items-center gap-4 justify-center">
            <Link
              href="/signup"
              className="px-6 py-4 bg-bull-lime hover:bg-bull-lime-light text-bull-ink text-xs font-black uppercase tracking-wider rounded-xl shadow-lg border-b-2 border-b-bull-lime-dark transform hover:-translate-y-0.5 transition-all text-center w-full sm:w-auto whitespace-nowrap"
            >
              Setup Institutional Trial Token
            </Link>
            <Link
              href="/signup?mode=login"
              className="px-6 py-4 bg-bull-raised border border-bull-line text-slate-300 hover:text-white hover:border-bull-lime/50 text-xs font-black uppercase tracking-wider rounded-xl transform hover:-translate-y-0.5 transition-all text-center w-full sm:w-auto whitespace-nowrap"
            >
              Existing Trader Login
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}