'use client';

import { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import {
  SUPER_ADMIN_EMAIL,
  REFRESH_MS,
  DAY_MS,
  rankProfiles,
  getProfileFreezeStatus,
} from '@/lib/admin';

export const AdminContext = createContext(null);

// Audit trail: never lets a logging failure break an admin action
export async function logAction(action, target, details) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    await supabase.from('admin_logs').insert({
      admin_email: session?.user?.email || null,
      action,
      target_id: target && target.id ? String(target.id) : null,
      target_label: target ? target.name || target.email || null : null,
      details: details || null,
    });
  } catch (e) {
    /* ignore */
  }
}
export const useAdmin = () => useContext(AdminContext);

export default function AdminProvider({ children }) {
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(true);
  const [allProfiles, setAllProfiles] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [activity, setActivity] = useState({});
  const [activityRows, setActivityRows] = useState([]);
  const [lastSeen, setLastSeen] = useState({});
  const [progress, setProgress] = useState({ totals: {}, users: {} });
  const [now, setNow] = useState(Date.now());
  const [toast, setToast] = useState(null);

  const progressFetchedAt = useRef(0);
  const autoFrozenRef = useRef(new Set());
  const toastTimer = useRef(null);

  const showToast = useCallback((message, type = 'ok') => {
    setToast({ message, type });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  const patchProfile = useCallback((profileId, fields) => {
    setAllProfiles((prev) =>
      rankProfiles(prev.map((p) => (p.id === profileId ? { ...p, ...fields } : p)))
    );
  }, []);

  const patchMany = useCallback((ids, fields) => {
    const set = new Set(ids);
    setAllProfiles((prev) =>
      rankProfiles(prev.map((p) => (set.has(p.id) ? { ...p, ...fields } : p)))
    );
  }, []);

  /* ---------- data loading ---------- */
  const loadProgress = useCallback(async (force = false) => {
    if (!force && Date.now() - progressFetchedAt.current < 25000) return;
    progressFetchedAt.current = Date.now();
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData && sessionData.session ? sessionData.session.access_token : null;
      if (!token) return;
      const res = await fetch('/api/admin/user-progress', { headers: { Authorization: 'Bearer ' + token } });
      if (!res.ok) {
        console.warn('Module progress fetch failed (' + res.status + ')');
        return;
      }
      setProgress(await res.json());
    } catch (e) {
      console.warn('Module progress fetch error', e);
    }
  }, []);

  const fetchMasterData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);

    const { data, error } = await supabase.from('profiles').select('*');
    if (error) {
      console.error('Admin profile fetch failed:', error);
      setLoading(false);
      return;
    }

    setAllProfiles(rankProfiles(data || []));
    setLastUpdated(new Date());
    setLoading(false);
    loadProgress(false);

    const cutoff = new Date(Date.now() + 5.5 * 3600 * 1000 - 6 * 86400 * 1000).toISOString().slice(0, 10);
    const readActivity = (cols) => supabase.from('user_activity').select(cols).gte('day', cutoff);
    let { data: rows, error: actError } = await readActivity('user_id, day, seconds, last_seen');
    if (actError) {
      ({ data: rows, error: actError } = await readActivity('user_id, day, seconds'));
    }
    if (actError) {
      console.warn('Activity fetch failed:', actError.message);
      return;
    }

    const totals = {};
    const seenMap = {};
    (rows || []).forEach((r) => {
      totals[r.user_id] = (totals[r.user_id] || 0) + Number(r.seconds || 0);
      if (r.last_seen) {
        const t = new Date(r.last_seen).getTime();
        if (!seenMap[r.user_id] || t > seenMap[r.user_id]) seenMap[r.user_id] = t;
      }
    });
    setActivityRows(rows || []);
    setActivity(totals);
    setLastSeen(seenMap);
  }, [loadProgress]);

  /* ---------- auth gate ---------- */
  useEffect(() => {
    const verify = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user && session.user.email === SUPER_ADMIN_EMAIL) {
        setAuthorized(true);
      } else {
        window.location.href = '/';
        return;
      }
      setChecking(false);
    };
    verify();
  }, []);

  /* ---------- live sync ---------- */
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

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  /* ---------- auto-freeze when access expires ---------- */
  useEffect(() => {
    if (!authorized) return;
    allProfiles.forEach(async (p) => {
      const { isFrozen, isSuperAdmin } = getProfileFreezeStatus(p, now);
      if (!isFrozen) autoFrozenRef.current.delete(p.id);
      if (!isFrozen || isSuperAdmin || p.is_frozen === true) return;
      if (autoFrozenRef.current.has(p.id)) return;
      autoFrozenRef.current.add(p.id);

      const fields = { is_frozen: true, is_premium: false };
      const { error } = await supabase.from('profiles').update(fields).eq('id', p.id);
      if (error) {
        console.warn('Auto-freeze failed:', error.message);
        return;
      }
      patchProfile(p.id, fields);
    });
  }, [now, allProfiles, authorized, patchProfile]);

  /* ---------- derived lists ---------- */
  const pendingTeachers = useMemo(
    () => allProfiles.filter((p) => p.role === 'teacher' && p.verification_status === 'pending'),
    [allProfiles]
  );

  const expiringSoon = useMemo(() => {
    return allProfiles
      .map((p) => ({ p, st: getProfileFreezeStatus(p, now) }))
      .filter(({ st }) => !st.isFrozen && !st.isSuperAdmin && !st.isPermanent && st.expiryMs && st.expiryMs - now < 7 * DAY_MS)
      .sort((a, b) => a.st.expiryMs - b.st.expiryMs)
      .map(({ p, st }) => ({ ...p, expiryMs: st.expiryMs }));
  }, [allProfiles, now]);

  /* ---------- actions ---------- */
  const grantDays = useCallback(async (profile, days) => {
    if (profile.email === SUPER_ADMIN_EMAIL) {
      showToast('Super Admin account is permanently immune.', 'error');
      return false;
    }
    const n = parseInt(days, 10);
    if (isNaN(n) || n <= 0) {
      showToast('Enter a valid number of days.', 'error');
      return false;
    }
    const fields = {
      is_frozen: false,
      is_premium: true,
      access_expires_at: new Date(Date.now() + n * DAY_MS).toISOString(),
    };
    const { data, error } = await supabase.from('profiles').update(fields).eq('id', profile.id).select('id');
    if (error || !data || data.length === 0) {
      showToast(error ? error.message : 'No row updated. Check the admin UPDATE policy (RLS).', 'error');
      return false;
    }
    patchProfile(profile.id, fields);
    logAction('grant_days', profile, n + ' days');
    showToast(`Granted ${n} days to ${profile.name || profile.email}`);
    return true;
  }, [patchProfile, showToast]);

  const bulkGrant = useCallback(async (ids, days) => {
    const n = parseInt(days, 10);
    if (isNaN(n) || n <= 0) {
      showToast('Enter a valid number of days.', 'error');
      return false;
    }
    const safe = allProfiles.filter((p) => ids.includes(p.id) && p.email !== SUPER_ADMIN_EMAIL).map((p) => p.id);
    if (!safe.length) return false;
    if (!confirm(`Grant ${n} days to ${safe.length} account(s)?`)) return false;
    const fields = {
      is_frozen: false,
      is_premium: true,
      access_expires_at: new Date(Date.now() + n * DAY_MS).toISOString(),
    };
    const { data, error } = await supabase.from('profiles').update(fields).in('id', safe).select('id');
    if (error || !data || data.length === 0) {
      showToast(error ? error.message : 'No rows updated. Check RLS.', 'error');
      return false;
    }
    patchMany(safe, fields);
    logAction('bulk_grant', null, n + ' days to ' + data.length + ' accounts: ' + data.map((r) => r.id).join(', '));
    showToast(`Granted ${n} days to ${data.length} account(s)`);
    return true;
  }, [allProfiles, patchMany, showToast]);

  const bulkFreeze = useCallback(async (ids) => {
    const safe = allProfiles.filter((p) => ids.includes(p.id) && p.email !== SUPER_ADMIN_EMAIL).map((p) => p.id);
    if (!safe.length) return false;
    if (!confirm(`FREEZE ${safe.length} account(s)?`)) return false;
    const fields = { is_frozen: true, is_premium: false, access_expires_at: new Date(0).toISOString() };
    const { data, error } = await supabase.from('profiles').update(fields).in('id', safe).select('id');
    if (error || !data || data.length === 0) {
      showToast(error ? error.message : 'No rows updated. Check RLS.', 'error');
      return false;
    }
    patchMany(safe, fields);
    logAction('bulk_freeze', null, data.length + ' accounts: ' + data.map((r) => r.id).join(', '));
    showToast(`Froze ${data.length} account(s)`);
    return true;
  }, [allProfiles, patchMany, showToast]);

  const toggleFreeze = useCallback(async (profile, isCurrentlyFrozen) => {
    if (profile.email === SUPER_ADMIN_EMAIL) {
      showToast('Super Admin can never be frozen.', 'error');
      return false;
    }
    const freezing = !isCurrentlyFrozen;
    if (!confirm(`Are you sure you want to ${freezing ? 'FREEZE' : 'UNFREEZE'} this account?`)) return false;

    const fields = freezing
      ? { is_frozen: true, is_premium: false, access_expires_at: new Date(0).toISOString() }
      : { is_frozen: false, is_premium: true, access_expires_at: new Date(Date.now() + 7 * DAY_MS).toISOString() };

    const { data, error } = await supabase.from('profiles').update(fields).eq('id', profile.id).select('id');
    if (error || !data || data.length === 0) {
      showToast(error ? error.message : 'No row updated. Check RLS UPDATE policy for admin.', 'error');
      return false;
    }
    patchProfile(profile.id, fields);
    logAction(freezing ? 'freeze' : 'unfreeze', profile);
    showToast(`Account ${freezing ? 'frozen' : 'unfrozen'}`);
    return true;
  }, [patchProfile, showToast]);

  const deleteProfile = useCallback(async (profile) => {
    if (profile.email === SUPER_ADMIN_EMAIL) {
      showToast('Super Admin cannot be deleted.', 'error');
      return false;
    }
    const label = profile.name || profile.email || 'this user';
    const typed = prompt(`This permanently deletes the profile.\nType the name "${label}" to confirm:`);
    if (typed === null) return false;
    if (typed.trim() !== label) {
      showToast('Name did not match. Nothing was deleted.', 'error');
      return false;
    }
    const { error } = await supabase.from('profiles').delete().eq('id', profile.id);
    if (error) {
      showToast(error.message, 'error');
      return false;
    }
    setAllProfiles((prev) => rankProfiles(prev.filter((p) => p.id !== profile.id)));
    logAction('delete_user', profile);
    showToast('Profile deleted');
    return true;
  }, [showToast]);

  const updateTeacher = useCallback(async (teacherId, status) => {
    const { error } = await supabase.from('profiles').update({ verification_status: status }).eq('id', teacherId);
    if (error) {
      showToast(error.message, 'error');
      return false;
    }
    patchProfile(teacherId, { verification_status: status });
    logAction('teacher_' + status, { id: teacherId });
    showToast(`Teacher ${status}`);
    return true;
  }, [patchProfile, showToast]);

  const value = {
    authorized, checking, loading, now, lastUpdated, toast,
    allProfiles, activity, activityRows, lastSeen, progress,
    pendingTeachers, expiringSoon,
    refresh: () => fetchMasterData(true),
    showToast, grantDays, bulkGrant, bulkFreeze, toggleFreeze, deleteProfile, updateTeacher,
  };

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}