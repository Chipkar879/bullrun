'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import { supabase } from '@/lib/supabase';

// ⚠️ SUPER ADMIN IMMUNITY EMAIL
const SUPER_ADMIN_EMAIL = 'verymystery18@gmail.com';
const REFRESH_MS = 10000;

const inr = (value) =>
  `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

// Same value the leaderboard ranks on (cash + holdings, saved by the simulator)
const getNetWorth = (p) => Number(p.net_worth ?? p.wallet_balance ?? 0) || 0;

const formatDuration = (seconds) => {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  return h + 'h ' + m + 'm';
};

// Stable order: highest net worth first, ties broken by id (same as the leaderboard)
const rankProfiles = (list) =>
  [...list]
    .sort((a, b) => {
      const diff = getNetWorth(b) - getNetWorth(a);
      if (diff !== 0) return diff;
      return String(a.id).localeCompare(String(b.id));
    })
    .map((p, index) => ({ ...p, rank: index + 1 }));

// HELPER: CALCULATE EXACT EXPIRY & FREEZE STATUS
const getProfileFreezeStatus = (p) => {
  if (p.email === SUPER_ADMIN_EMAIL) {
    return { isFrozen: false, isSuperAdmin: true, expiryMs: null };
  }

  // 1. Explicit admin freeze flag in database ALWAYS takes top priority
  if (p.is_frozen === true) {
    return { isFrozen: true, isSuperAdmin: false, expiryMs: 0 };
  }

  let expiryMs;
  if (p.access_expires_at) {
    expiryMs = new Date(p.access_expires_at).getTime();
  } else {
    const createdAt = p.created_at ? new Date(p.created_at).getTime() : Date.now();
    expiryMs = createdAt + (7 * 24 * 60 * 60 * 1000);
  }

  const isExpired = Date.now() >= expiryMs;
  const isFrozen = (isExpired && !p.is_premium);

  return { isFrozen, isSuperAdmin: false, expiryMs };
};

export default function SuperAdminDashboard() {
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [allProfiles, setAllProfiles] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [activity, setActivity] = useState({});

  // Search & School Category Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSchoolFilter, setSelectedSchoolFilter] = useState('ALL');

  // Modal Inspection & Custom Days State
  const [selectedId, setSelectedId] = useState(null);
  const [customDaysInput, setCustomDaysInput] = useState('30');

  // Modal Real-Time Live Countdown State
  const [modalTimeLeft, setModalTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false
  });

  // The open dossier always reflects the latest synced data
  const selectedProfile = useMemo(
    () => allProfiles.find((p) => p.id === selectedId) || null,
    [allProfiles, selectedId]
  );

  const pendingTeachers = useMemo(
    () => allProfiles.filter((p) => p.role === 'teacher' && p.verification_status === 'pending'),
    [allProfiles]
  );

  const patchProfile = useCallback((profileId, fields) => {
    setAllProfiles((prev) =>
      rankProfiles(prev.map((p) => (p.id === profileId ? { ...p, ...fields } : p)))
    );
  }, []);

  const fetchMasterData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);

    const { data, error } = await supabase.from('profiles').select('*');

    if (error) {
      console.error('Admin profile fetch failed:', error);
      if (!silent) setLoading(false);
      return;
    }

    setAllProfiles(rankProfiles(data || []));
    setLastUpdated(new Date());
    setLoading(false);

    // Weekly time on site: last 7 IST days including today
    const cutoff = new Date(Date.now() + 5.5 * 3600 * 1000 - 6 * 86400 * 1000)
      .toISOString()
      .slice(0, 10);

    const { data: rows, error: actError } = await supabase
      .from('user_activity')
      .select('user_id, seconds')
      .gte('day', cutoff);

    if (actError) {
      console.warn('Activity fetch failed:', actError.message);
      return;
    }

    const totals = {};
    (rows || []).forEach((r) => {
      totals[r.user_id] = (totals[r.user_id] || 0) + Number(r.seconds || 0);
    });
    setActivity(totals);
  }, []);

  useEffect(() => {
    const verifyIdentity = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user && session.user.email === SUPER_ADMIN_EMAIL) {
        setAuthorized(true);
      } else {
        window.location.href = '/';
      }
    };
    verifyIdentity();
  }, []);

  // LIVE SYNC: initial load, realtime changes, plus a refresh every 10 seconds
  useEffect(() => {
    if (!authorized) return undefined;

    fetchMasterData(false);

    const refresh = () => {
      if (!document.hidden) fetchMasterData(true);
    };

    const channel = supabase
      .channel('admin-profiles-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, refresh)
      .subscribe();

    const interval = setInterval(refresh, REFRESH_MS);
    document.addEventListener('visibilitychange', refresh);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', refresh);
      supabase.removeChannel(channel);
    };
  }, [authorized, fetchMasterData]);

  // 1. LIVE REAL-TIME COUNTDOWN TICKER FOR SELECTED PROFILE
  useEffect(() => {
    if (!selectedProfile) return undefined;

    const calculateTime = () => {
      const { expiryMs, isSuperAdmin, isFrozen } = getProfileFreezeStatus(selectedProfile);

      if (isSuperAdmin) {
        setModalTimeLeft({ days: 999, hours: 0, minutes: 0, seconds: 0, isExpired: false });
        return;
      }

      if (isFrozen || !expiryMs || expiryMs <= Date.now()) {
        setModalTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
        return;
      }

      const diffMs = expiryMs - Date.now();

      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diffMs / 1000 / 60) % 60);
      const seconds = Math.floor((diffMs / 1000) % 60);

      setModalTimeLeft({ days, hours, minutes, seconds, isExpired: false });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [selectedProfile]);

  // Teacher Approval / Rejection Handler
  const handleUpdateTeacher = async (teacherId, status) => {
    const { error } = await supabase
      .from('profiles')
      .update({ verification_status: status })
      .eq('id', teacherId);

    if (error) {
      console.error('Teacher update error:', error);
      alert(`Failed to update teacher: ${error.message}`);
      return;
    }

    patchProfile(teacherId, { verification_status: status });
  };

  // 2. ADMIN CUSTOM DAYS ACTIVATION HANDLER
  const handleActivateCustomDays = async (profileId, profileEmail) => {
    if (profileEmail === SUPER_ADMIN_EMAIL) {
      alert("⚠️ Super Admin account is permanently immune.");
      return;
    }

    const days = parseInt(customDaysInput, 10);
    if (isNaN(days) || days <= 0) {
      alert("Please enter a valid number of days.");
      return;
    }

    const newExpiryDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

    try {
      const updatedFields = {
        is_frozen: false,
        is_premium: true,
        access_expires_at: newExpiryDate
      };

      const { error } = await supabase
        .from('profiles')
        .update(updatedFields)
        .eq('id', profileId);

      if (error) throw error;

      alert(`Successfully granted ${days} days of unfrozen access!`);
      patchProfile(profileId, updatedFields);
    } catch (err) {
      console.error("Custom days activation error:", err);
      alert(`Failed to extend access: ${err.message}`);
    }
  };

  // 3. BULLETPROOF FREEZE / UNFREEZE TOGGLE HANDLER (ALL-IN-ONE)
  const handleToggleFreezeStatus = async (profileId, isCurrentlyFrozen, profileEmail) => {
    if (profileEmail === SUPER_ADMIN_EMAIL) {
      alert("⚠️ Super Admin account is immune and can NEVER be frozen.");
      return;
    }

    const newFrozenState = !isCurrentlyFrozen;
    const action = newFrozenState ? 'FREEZE' : 'UNFREEZE';

    if (!confirm(`Are you sure you want to ${action} this user account?`)) return;

    try {
      let updatePayload = {};

      if (newFrozenState) {
        // 🔥 HARD FREEZE: Force is_frozen=true, wipe is_premium=false, set expiry in the past
        updatePayload = {
          is_frozen: true,
          is_premium: false,
          access_expires_at: new Date(0).toISOString()
        };
      } else {
        // 🔓 UNFREEZE: Restore is_frozen=false, activate premium, grant 7 days
        updatePayload = {
          is_frozen: false,
          is_premium: true,
          access_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        };
      }

      const { data, error } = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('id', profileId)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        alert("⚠️ Supabase didn't update this row. Please make sure Row Level Security (RLS) on your 'profiles' table allows UPDATE for admins.");
        return;
      }

      alert(`Account successfully ${action}D!`);
      patchProfile(profileId, updatePayload);
    } catch (err) {
      console.error("Freeze toggle error:", err);
      alert(`Failed to update freeze state: ${err.message}`);
    }
  };

  // Delete Profile Handler
  const handleDeleteDossier = async (profileId, profileName) => {
    const confirmFirst = confirm(`⚠️ Are you sure you want to delete profile "${profileName}"?`);
    if (!confirmFirst) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', profileId);

      if (error) throw error;

      alert("User dossier purged successfully.");
      setSelectedId(null);
      setAllProfiles((prev) => rankProfiles(prev.filter((p) => p.id !== profileId)));
    } catch (err) {
      console.error("Deletion error:", err);
      alert(`Failed to delete dossier: ${err.message}`);
    }
  };

  // Extract School IDs
  const schoolList = useMemo(() => {
    const schools = new Set();
    allProfiles.forEach(p => {
      if (p.school_id || p.school_code) schools.add(p.school_id || p.school_code);
    });
    return Array.from(schools).sort((a, b) => String(a).localeCompare(String(b)));
  }, [allProfiles]);

  // Filter Roster (keeps the ranked order)
  const filteredProfiles = useMemo(() => {
    return allProfiles.filter(p => {
      const schoolIdentifier = p.school_id || p.school_code;
      const matchesSearch =
        (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (schoolIdentifier || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.role || '').toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (selectedSchoolFilter === 'ALL') return true;
      if (selectedSchoolFilter === 'PERSONAL') return p.role === 'personal' || !schoolIdentifier;
      return schoolIdentifier === selectedSchoolFilter;
    });
  }, [allProfiles, searchQuery, selectedSchoolFilter]);

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-slate-100 antialiased font-sans relative">
        <Navbar />
        <div className="max-w-6xl mx-auto px-6 pt-32 pb-24 flex justify-center">
          <div className="space-y-4 text-center">
            <div className="w-12 h-12 border-4 border-[#ff3333] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider animate-pulse font-mono">
              Securing Admin Firewall Layer...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!authorized) return null;

  return (
    <main className="min-h-screen bg-black text-slate-100 antialiased font-sans relative max-w-full overflow-x-hidden pt-24 pb-20">
      <Navbar />

      <section className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8 animate-fadeInFast">

        {/* HEADER BLOCK */}
        <div className="border-b border-[#2b0808] pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="bg-[#1a0808] text-[#ff3333] border border-[#2b0808] text-[9px] uppercase tracking-widest font-black px-3 py-1 rounded-full shadow-inner mb-2 inline-block font-mono">
              🛡️ Super Admin Clearance
            </span>
            <h1 className="text-3xl font-black text-white tracking-tight">Master Control Panel</h1>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Set custom access duration, inspect live remaining time, toggle freeze states, or purge dossiers.
            </p>
          </div>

          <div className="space-y-2 text-right">
            <div className="bg-[#0f0505] border border-[#2b0808] px-4 py-2 rounded-xl text-xs font-mono text-slate-400">
              Node ID: <span className="text-[#ff3333] font-bold">{SUPER_ADMIN_EMAIL}</span>
            </div>
            <div className="text-[10px] font-mono text-slate-500">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
              LIVE · updated {lastUpdated ? lastUpdated.toLocaleTimeString('en-IN') : '--'}
            </div>
          </div>
        </div>

        {/* SECTION A: TEACHER VERIFICATION QUEUE */}
        <div className="bg-[#0f0505] border-2 border-[#2b0808] rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xl">
          <div className="flex items-center justify-between border-b border-[#2b0808] pb-4">
            <h2 className="text-sm font-black text-amber-400 uppercase tracking-wider flex items-center gap-2 font-mono">
              📝 Pending Teacher Verification Queue ({pendingTeachers.length})
            </h2>
            <span className="text-[10px] font-mono text-slate-500 font-bold">MANUAL AUDIT</span>
          </div>

          {pendingTeachers.length === 0 ? (
            <p className="text-xs font-medium text-slate-500 py-2 font-mono">No teacher verification letters currently pending audit.</p>
          ) : (
            <div className="space-y-3">
              {pendingTeachers.map((teacher) => (
                <div key={teacher.id} className="p-4 bg-[#1a0808] border border-[#2b0808] rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs font-bold shadow-md">
                  <div className="space-y-1">
                    <p className="text-sm text-white font-black">{teacher.name}</p>
                    <p className="text-slate-400 font-mono font-medium">{teacher.email}</p>
                    {teacher.verification_document_url && (
                      <a href={teacher.verification_document_url} target="_blank" rel="noreferrer" className="inline-block text-[#ff3333] hover:underline pt-1 text-[11px] font-bold">
                        📂 View Appointment Letter Proof
                      </a>
                    )}
                  </div>
                  <div className="flex gap-2 w-full md:w-auto">
                    <button onClick={() => handleUpdateTeacher(teacher.id, 'approved')} className="w-full md:w-auto px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase font-mono cursor-pointer">
                      Approve
                    </button>
                    <button onClick={() => handleUpdateTeacher(teacher.id, 'rejected')} className="w-full md:w-auto px-4 py-2 bg-rose-950 text-rose-400 border border-rose-900 rounded-xl text-xs font-black uppercase font-mono cursor-pointer">
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION B: USER ROSTER & SCHOOL FILTERS */}
        <div className="bg-[#0f0505] border-2 border-[#2b0808] rounded-3xl p-6 space-y-6 shadow-2xl">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#2b0808] pb-4">
            <div>
              <h2 className="text-sm font-black text-slate-300 uppercase tracking-wider flex items-center gap-2 font-mono">
                📊 Application Users Matrix ({filteredProfiles.length} / {allProfiles.length})
              </h2>
              <p className="text-[10px] font-mono text-slate-500 mt-1">Ranked by net worth, same as the leaderboard.</p>
            </div>

            <div className="w-full md:w-72 relative">
              <input
                type="text"
                placeholder="🔍 Search name, email, school..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#1a0808] border border-[#2b0808] text-white rounded-xl text-xs font-bold focus:outline-none focus:border-[#7a0000] font-mono"
              />
            </div>
          </div>

          {/* SCHOOL CODE TABS */}
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider font-mono">Filter By School Code:</span>
            <div className="flex flex-wrap gap-2 font-mono">
              <button
                onClick={() => setSelectedSchoolFilter('ALL')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase border cursor-pointer ${selectedSchoolFilter === 'ALL' ? 'bg-[#7a0000] border-[#a30000] text-white' : 'bg-[#1a0808] border-[#2b0808] text-slate-400'}`}
              >
                All Users ({allProfiles.length})
              </button>

              <button
                onClick={() => setSelectedSchoolFilter('PERSONAL')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase border cursor-pointer ${selectedSchoolFilter === 'PERSONAL' ? 'bg-[#7a0000] border-[#a30000] text-white' : 'bg-[#1a0808] border-[#2b0808] text-slate-400'}`}
              >
                Personal Track
              </button>

              {schoolList.map(schoolId => (
                <button
                  key={schoolId}
                  onClick={() => setSelectedSchoolFilter(schoolId)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase border cursor-pointer ${selectedSchoolFilter === schoolId ? 'bg-[#7a0000] border-[#a30000] text-white' : 'bg-[#1a0808] border-[#2b0808] text-slate-400'}`}
                >
                  🏫 {schoolId}
                </button>
              ))}
            </div>
          </div>

          {/* USER CARDS GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {filteredProfiles.map((p) => {
              const { isFrozen, isSuperAdmin } = getProfileFreezeStatus(p);

              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  className="bg-[#1a0808] border-2 border-[#2b0808] hover:border-[#7a0000] p-5 rounded-2xl shadow-xl transition-all cursor-pointer group space-y-3 relative overflow-hidden"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono font-black px-1.5 py-0.5 rounded bg-[#0f0505] text-[#ff3333] border border-[#2b0808]">
                          #{p.rank}
                        </span>
                        <h3 className="font-black text-sm text-white group-hover:text-[#ff3333] truncate">
                          {p.name || 'Unnamed Account'}
                        </h3>
                      </div>
                      <p className="text-[11px] font-mono text-slate-400 truncate mt-1">{p.email}</p>
                    </div>

                    <span className="px-2.5 py-0.5 bg-[#0f0505] border border-[#2b0808] text-[#ff3333] rounded-full text-[9px] font-black uppercase font-mono">
                      {p.role}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#2b0808] text-xs font-bold font-mono">
                    <div>
                      <span className="text-[9px] uppercase text-slate-500 block">Net Worth</span>
                      <span className="text-emerald-400">{inr(getNetWorth(p))}</span>
                      <span className="text-[9px] text-slate-500 block mt-0.5">Cash {inr(p.wallet_balance)}</span>
                      <span className="text-[9px] text-sky-400 block mt-0.5">Week: {formatDuration(activity[p.id])}</span>
                    </div>

                    <div className="text-right">
                      <span className="text-[9px] uppercase text-slate-500 block">Status</span>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${
                        isSuperAdmin
                          ? 'bg-sky-950 text-sky-400 border-sky-800'
                          : isFrozen
                            ? 'bg-rose-950 text-rose-400 border-rose-800 animate-pulse'
                            : 'bg-emerald-950 text-emerald-400 border-emerald-800'
                      }`}>
                        {isSuperAdmin ? 'IMMUNE' : isFrozen ? 'FROZEN 🔒' : 'UNFROZEN 🔓'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* DOSSIER INSPECTION MODAL */}
      {selectedProfile && (() => {
        const { isFrozen, isSuperAdmin } = getProfileFreezeStatus(selectedProfile);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/80 animate-fadeInFast">
            <div className="bg-[#0f0505] border-2 border-[#2b0808] rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-scaleUp">

              {/* Modal Header */}
              <div className="p-6 border-b border-[#2b0808] flex items-center justify-between bg-[#1a0808]">
                <div>
                  <h3 className="font-black text-xl text-white tracking-tight">
                    {selectedProfile.name || 'User Workspace'}
                  </h3>
                  <p className="text-xs font-mono text-slate-400">{selectedProfile.email}</p>
                </div>
                <button
                  onClick={() => setSelectedId(null)}
                  className="w-8 h-8 rounded-full bg-[#0f0505] border border-[#2b0808] text-slate-400 font-bold hover:text-white transition cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6 text-left flex-1 font-mono">

                {/* ⚡ ADMIN CUSTOM ACCESS DURATION ACTIVATOR */}
                {!isSuperAdmin && (
                  <div className="p-5 bg-[#1a0808] border-2 border-[#ff3333]/40 rounded-2xl space-y-3 shadow-xl">
                    <span className="text-[10px] font-black uppercase text-[#ff3333] tracking-wider block">
                      ⚡ ADMIN CUSTOM ACCESS DURATION ACTIVATOR
                    </span>
                    <p className="text-xs text-slate-300 font-sans font-medium">
                      Enter the exact number of days to grant unfrozen access to this student account:
                    </p>

                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="1"
                        max="365"
                        value={customDaysInput}
                        onChange={(e) => setCustomDaysInput(e.target.value)}
                        className="w-28 bg-[#0f0505] border border-[#2b0808] text-white px-3 py-2 rounded-xl text-sm font-black text-center focus:outline-none focus:border-[#ff3333]"
                        placeholder="30"
                      />
                      <button
                        onClick={() => handleActivateCustomDays(selectedProfile.id, selectedProfile.email)}
                        className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition shadow-md cursor-pointer"
                      >
                        GRANT {customDaysInput || 0} DAYS ACCESS ✓
                      </button>
                    </div>
                  </div>
                )}

                {/* 🔒 / 🔓 MANUAL FREEZE SWITCH WITH DYNAMIC TOGGLE */}
                {!isSuperAdmin && (
                  <div className="flex items-center justify-between p-4 bg-[#1a0808] border border-[#2b0808] rounded-2xl">
                    <div>
                      <span className="text-xs font-black text-white block">Manual Freeze Switch</span>
                      <span className="text-[10px] text-slate-400 font-sans">
                        Status: <span className={isFrozen ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>{isFrozen ? 'FROZEN 🔒' : 'ACTIVE / UNFROZEN 🔓'}</span>
                      </span>
                    </div>

                    <button
                      onClick={() => handleToggleFreezeStatus(selectedProfile.id, isFrozen, selectedProfile.email)}
                      className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition cursor-pointer ${
                        isFrozen
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-[#ff3333] hover:bg-[#dc2626] text-white'
                      }`}
                    >
                      {isFrozen ? '🔓 UNFREEZE ACCOUNT' : '🔒 FREEZE ACCOUNT'}
                    </button>
                  </div>
                )}

                {/* METADATA GRID WITH REAL-TIME REMAINING TIME */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold">
                  <div className="p-3.5 bg-[#1a0808] border border-[#2b0808] rounded-xl space-y-1">
                    <span className="text-[10px] uppercase text-slate-500">School Code</span>
                    <p className="text-white">{selectedProfile.school_code || selectedProfile.school_id || 'Personal Track'}</p>
                  </div>

                  <div className="p-3.5 bg-[#1a0808] border border-[#2b0808] rounded-xl space-y-1">
                    <span className="text-[10px] uppercase text-slate-500">Classroom ID</span>
                    <p className="text-white">{selectedProfile.specific_class_id || 'Unassigned'}</p>
                  </div>

                  {/* EXACT REAL-TIME REMAINING TIME DISPLAY */}
                  <div className="p-3.5 bg-[#1a0808] border border-[#2b0808] rounded-xl space-y-1 col-span-1 md:col-span-2">
                    <span className="text-[10px] uppercase text-slate-500 block">Exact Time Remaining Before Freeze</span>
                    {isSuperAdmin ? (
                      <p className="text-amber-400 font-bold">👑 Permanent Access (Super Admin)</p>
                    ) : isFrozen ? (
                      <p className="text-rose-400 font-bold animate-pulse">00d : 00h : 00m : 00s (ACCOUNT FROZEN / EXPIRED)</p>
                    ) : (
                      <div className="text-emerald-400 font-mono font-black text-sm flex items-center gap-1.5 pt-0.5">
                        <span>{String(modalTimeLeft.days).padStart(2, '0')}d</span>
                        <span>:</span>
                        <span>{String(modalTimeLeft.hours).padStart(2, '0')}h</span>
                        <span>:</span>
                        <span>{String(modalTimeLeft.minutes).padStart(2, '0')}m</span>
                        <span>:</span>
                        <span>{String(modalTimeLeft.seconds).padStart(2, '0')}s</span>
                      </div>
                    )}
                  </div>

                  <div className="p-3.5 bg-[#1a0808] border border-[#2b0808] rounded-xl space-y-1">
                    <span className="text-[10px] uppercase text-slate-500">Net Worth (live)</span>
                    <p className="text-emerald-400">{inr(getNetWorth(selectedProfile))}</p>
                  </div>

                  <div className="p-3.5 bg-[#1a0808] border border-[#2b0808] rounded-xl space-y-1">
                    <span className="text-[10px] uppercase text-slate-500">Wallet Balance (cash)</span>
                    <p className="text-white">{inr(selectedProfile.wallet_balance)}</p>
                  </div>

                  <div className="p-3.5 bg-[#1a0808] border border-[#2b0808] rounded-xl space-y-1">
                    <span className="text-[10px] uppercase text-slate-500">Time on site (last 7 days)</span>
                    <p className="text-sky-400">{formatDuration(activity[selectedProfile.id])}</p>
                  </div>

                  <div className="p-3.5 bg-[#1a0808] border border-[#2b0808] rounded-xl space-y-1">
                    <span className="text-[10px] uppercase text-slate-500">Average per day (7-day)</span>
                    <p className="text-sky-400">{formatDuration((activity[selectedProfile.id] || 0) / 7)}</p>
                  </div>

                  <div className="p-3.5 bg-[#1a0808] border border-[#2b0808] rounded-xl space-y-1 col-span-1 md:col-span-2">
                    <span className="text-[10px] uppercase text-slate-500">Registration Date</span>
                    <p className="text-slate-300 text-[11px]">
                      {selectedProfile.created_at ? new Date(selectedProfile.created_at).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>

              </div>

              {/* Modal Controls */}
              <div className="p-6 border-t border-[#2b0808] bg-[#1a0808] flex items-center justify-between gap-3 font-mono">
                <button
                  onClick={() => handleDeleteDossier(selectedProfile.id, selectedProfile.name || 'User Account')}
                  className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-black uppercase cursor-pointer"
                >
                  Delete Dossier
                </button>

                <button
                  onClick={() => setSelectedId(null)}
                  className="px-5 py-2 bg-[#0f0505] border border-[#2b0808] text-slate-300 rounded-xl text-xs font-black uppercase cursor-pointer"
                >
                  Close
                </button>
              </div>

            </div>
          </div>
        );
      })()}

    </main>
  );
}