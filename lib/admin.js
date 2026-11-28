import { isRankedProfile } from './netWorthRank';

export const SUPER_ADMIN_EMAIL = 'verymystery18@gmail.com';
export const REFRESH_MS = 10000;
export const ONLINE_MS = 90 * 1000;
export const DAY_MS = 24 * 60 * 60 * 1000;

export const inr = (value) =>
  `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export const getNetWorth = (p) => Number(p.net_worth ?? p.wallet_balance ?? 0) || 0;

export const formatDuration = (seconds) => {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  return h + 'h ' + m + 'm';
};

export const formatLeft = (ms) => {
  const t = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(t / 86400);
  const h = Math.floor((t % 86400) / 3600);
  const m = Math.floor((t % 3600) / 60);
  if (d > 0) return d + 'd ' + h + 'h';
  if (h > 0) return h + 'h ' + m + 'm';
  return m + 'm';
};

export const timeAgo = (ms) => {
  const sec = Math.max(0, Math.round(ms / 1000));
  if (sec < 90) return 'just now';
  const min = Math.round(sec / 60);
  if (min < 60) return min + ' min ago';
  const hr = Math.round(min / 60);
  if (hr < 48) return hr + ' h ago';
  return Math.round(hr / 24) + ' d ago';
};

// IST day key (YYYY-MM-DD) for a timestamp in ms
export const istDayKey = (ms) => new Date(ms + 5.5 * 3600 * 1000).toISOString().slice(0, 10);

export const localDayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const isOnline = (lastSeen, id, now) => {
  const t = lastSeen[id];
  return !!t && now - t < ONLINE_MS;
};

export const progressSummary = (uid, prog) => {
  const mods = (prog && prog.users && prog.users[uid]) || {};
  const totals = (prog && prog.totals) || {};
  const nums = Object.keys(totals).map(Number).sort((a, b) => a - b);
  let reached = 0;
  let doneAll = 0;
  let totalAll = 0;
  nums.forEach((n) => {
    const d = Number(mods[n] || 0);
    doneAll += d;
    totalAll += totals[n];
    if (d > 0) reached = n;
  });
  return {
    mods,
    reached,
    reachedDone: Number(mods[reached] || 0),
    reachedTotal: totals[reached] || 0,
    doneAll,
    totalAll,
  };
};

export const rankProfiles = (list) => {
  let position = 0;
  return [...list]
    .sort((a, b) => {
      const diff = getNetWorth(b) - getNetWorth(a);
      if (diff !== 0) return diff;
      return String(a.id).localeCompare(String(b.id));
    })
    // Staff are listed but not numbered, same as the leaderboard
    .map((p) => ({ ...p, rank: isRankedProfile(p) ? (position += 1) : '-' }));
};

export const getProfileFreezeStatus = (p, now = Date.now()) => {
  if (p.email === SUPER_ADMIN_EMAIL) {
    return { isFrozen: false, isSuperAdmin: true, isPermanent: true, expiryMs: null };
  }
  if (p.is_frozen === true) {
    return { isFrozen: true, isSuperAdmin: false, isPermanent: false, expiryMs: 0 };
  }
  if (!p.access_expires_at && p.is_premium) {
    return { isFrozen: false, isSuperAdmin: false, isPermanent: true, expiryMs: null };
  }
  let expiryMs;
  if (p.access_expires_at) {
    expiryMs = new Date(p.access_expires_at).getTime();
  } else {
    const createdAt = p.created_at ? new Date(p.created_at).getTime() : now;
    expiryMs = createdAt + 7 * DAY_MS;
  }
  return { isFrozen: now >= expiryMs, isSuperAdmin: false, isPermanent: false, expiryMs };
};