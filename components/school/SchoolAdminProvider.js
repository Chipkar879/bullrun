'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { AdminContext } from '@/components/admin/AdminProvider';
import { REFRESH_MS, DAY_MS, rankProfiles, getProfileFreezeStatus } from '@/lib/admin';

async function api(method, body) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { status: 401, json: {} };
  const res = await fetch('/api/school/admin', {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, json };
}

export default function SchoolAdminProvider({ children }) {
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(true);
  const [school, setSchool] = useState(null);
  const [canWrite, setCanWrite] = useState(false);
  const [allProfiles, setAllProfiles] = useState([]);
  const [activity, setActivity] = useState({});
  const [activityRows, setActivityRows] = useState([]);
  const [lastSeen, setLastSeen] = useState({});
  const [progress, setProgress] = useState({ totals: {}, users: {} });
  const [lastUpdated, setLastUpdated] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const showToast = useCallback((message, type = 'ok') => {
    setToast({ message, type });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const r = await api('GET');
    if (r.status === 401) { window.location.href = '/signup?mode=login'; return; }
    if (r.status === 403) { window.location.href = '/school'; return; }
    if (!r.ok) { setLoading(false); showToast(r.json.error || 'Could not load school data.', 'error'); return; }

    const j = r.json;
    setSchool(j.school);
    setCanWrite(!!j.canWrite);
    setAllProfiles(rankProfiles(j.profiles || []));
    setProgress(j.progress || { totals: {}, users: {} });

    const totals = {};
    const seen = {};
    (j.activityRows || []).forEach((row) => {
      totals[row.user_id] = (totals[row.user_id] || 0) + Number(row.seconds || 0);
      if (row.last_seen) {
        const t = new Date(row.last_seen).getTime();
        if (!seen[row.user_id] || t > seen[row.user_id]) seen[row.user_id] = t;
      }
    });
    setActivityRows(j.activityRows || []);
    setActivity(totals);
    setLastSeen(seen);
    setLastUpdated(new Date());
    setAuthorized(true);
    setChecking(false);
    setLoading(false);
  }, [showToast]);

  useEffect(() => {
    load(false);
    const refresh = () => { if (!document.hidden) load(true); };
    const interval = setInterval(refresh, REFRESH_MS);
    document.addEventListener('visibilitychange', refresh);
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', refresh); };
  }, [load]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

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

  const run = useCallback(async (body, okMsg) => {
    if (!canWrite) { showToast('Your school is not open for changes.', 'error'); return false; }
    const r = await api('POST', body);
    if (!r.ok) { showToast(r.json.error || 'Action failed.', 'error'); return false; }
    showToast(okMsg);
    await load(true);
    return true;
  }, [canWrite, load, showToast]);

  const toggleFreeze = useCallback(async (profile, isCurrentlyFrozen) => {
    const freezing = !isCurrentlyFrozen;
    if (!confirm('Are you sure you want to ' + (freezing ? 'FREEZE' : 'UNFREEZE') + ' this account?')) return false;
    return run({ action: 'freeze', id: profile.id, freeze: freezing }, freezing ? 'Account frozen' : 'Account unfrozen');
  }, [run]);

  const bulkFreeze = useCallback(async (ids) => {
    if (!ids.length) return false;
    if (!confirm('FREEZE ' + ids.length + ' account(s)?')) return false;
    return run({ action: 'bulk_freeze', ids }, 'Accounts frozen');
  }, [run]);

  const updateTeacher = useCallback(async (teacherId, status) => {
    return run({ action: 'teacher_status', id: teacherId, status }, 'Teacher ' + status);
  }, [run]);

  const grantDays = useCallback(async () => {
    showToast('Access for school members is covered by your school plan.', 'error');
    return false;
  }, [showToast]);
  const bulkGrant = grantDays;
  const deleteProfile = useCallback(async () => {
    showToast('School admins cannot delete accounts. Contact Bull Run support.', 'error');
    return false;
  }, [showToast]);

  const value = {
    authorized, checking, loading, now, lastUpdated, toast,
    allProfiles, activity, activityRows, lastSeen, progress,
    pendingTeachers, expiringSoon,
    refresh: () => load(true),
    showToast, grantDays, bulkGrant, bulkFreeze, toggleFreeze, deleteProfile, updateTeacher,
    school, schoolMode: true,
  };

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}
