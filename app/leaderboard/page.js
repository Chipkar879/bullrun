'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import Mascot from '@/components/Mascot';
import RankBadge from '@/components/RankBadge';
import { RANKS } from '@/lib/ranks';
import { avatarById } from '@/lib/gamification';
import { onlyRanked, aheadOf } from '@/lib/netWorthRank';

const TOP_STEP = 5;
const NEIGHBOURS = 1;
const FIELDS =
  'id, name, role, school_id, specific_class_id, wallet_balance, net_worth, avatar';
const MEDALS = ['\u{1F947}', '\u{1F948}', '\u{1F949}'];

const TRACK_STYLES = {
  student: 'border-sky-500 bg-[#0c4a6e] text-sky-100',
  teacher: 'border-amber-800/60 bg-amber-950/40 text-amber-300',
  admin: 'border-fuchsia-800/60 bg-fuchsia-950/40 text-fuchsia-300',
  personal: 'border-emerald-800/60 bg-emerald-950/40 text-emerald-300',
};

const TRACK_LABELS = {
  student: 'Student',
  teacher: 'Teacher',
  admin: 'Admin',
  personal: 'Personal',
};

// Podium colours. Low-opacity tints so they sit well in both light and dark mode.
const PODIUM = {
  1: {
    glow: 'rgba(250, 204, 21, 0.55)',
    tint: 'linear-gradient(180deg, rgba(250,204,21,0.34), rgba(250,204,21,0.05) 75%)',
    ring: 'rgba(234, 179, 8, 0.9)',
    step: 'linear-gradient(180deg, #fde047, #f59e0b)',
    stepHeight: 'h-20 sm:h-28',
    place: '1st',
  },
  2: {
    glow: 'rgba(148, 163, 184, 0.45)',
    tint: 'linear-gradient(180deg, rgba(148,163,184,0.30), rgba(148,163,184,0.05) 75%)',
    ring: 'rgba(148, 163, 184, 0.85)',
    step: 'linear-gradient(180deg, #e2e8f0, #94a3b8)',
    stepHeight: 'h-14 sm:h-20',
    place: '2nd',
  },
  3: {
    glow: 'rgba(251, 146, 60, 0.45)',
    tint: 'linear-gradient(180deg, rgba(251,146,60,0.30), rgba(251,146,60,0.05) 75%)',
    ring: 'rgba(234, 110, 30, 0.85)',
    step: 'linear-gradient(180deg, #fdba74, #ea580c)',
    stepHeight: 'h-10 sm:h-14',
    place: '3rd',
  },
};

const ordinal = (n) => {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return n + 'th';
  return n + (['th', 'st', 'nd', 'rd'][n % 10] || 'th');
};

const worthOf = (trader) => Number(trader.net_worth ?? trader.wallet_balance ?? 0);

const formatMoney = (value) =>
  '\u20B9' +
  Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

const LB_CSS = `
@keyframes lb-rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
@keyframes lb-jump { 0% { opacity: 0; transform: translateY(60px) scale(.85); } 65% { opacity: 1; transform: translateY(-12px) scale(1.03); } 100% { opacity: 1; transform: none; } }
@keyframes lb-slide { from { opacity: 0; transform: translateX(-28px); } to { opacity: 1; transform: none; } }
@keyframes lb-ping { 0% { transform: scale(1); opacity: .7; } 80%, 100% { transform: scale(2.6); opacity: 0; } }
@keyframes lb-float { 0%, 100% { transform: translateY(0) rotate(-6deg); } 50% { transform: translateY(-8px) rotate(6deg); } }
@keyframes lb-fall { 0% { transform: translateY(-10vh) rotate(0); opacity: 1; } 100% { transform: translateY(110vh) rotate(540deg); opacity: 0; } }
@keyframes lb-spin { to { transform: translate(-50%, -50%) rotate(360deg); } }
@keyframes lb-shine { 0%, 60% { transform: translateX(-160%) skewX(-18deg); } 100% { transform: translateX(360%) skewX(-18deg); } }
@keyframes lb-glow { 0%, 100% { filter: brightness(1); } 50% { filter: brightness(1.1); } }
@keyframes lb-pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(163,230,53,.65); } 70% { box-shadow: 0 0 0 14px rgba(163,230,53,0); } }
@keyframes lb-sway { 0%, 100% { transform: rotate(var(--from)); } 50% { transform: rotate(var(--to)); } }
@keyframes lb-colour { to { background-position: 200% center; } }
.lb-rise { animation: lb-rise .5s ease-out both; }
.lb-jump { animation: lb-jump .75s cubic-bezier(.34,1.4,.64,1) both; }
.lb-slide { animation: lb-slide .45s ease-out both; }
.lb-ping { animation: lb-ping 1.8s ease-out infinite; }
.lb-float { animation: lb-float 2.6s ease-in-out infinite; }
.lb-fall { position: fixed; top: 0; animation-name: lb-fall; animation-timing-function: linear; animation-fill-mode: both; }
.lb-glow { animation: lb-glow 2.4s ease-in-out infinite; }
.lb-pulse { animation: lb-pulse 2s ease-out infinite; }
.lb-rays { position: absolute; left: 50%; top: 35%; width: 190%; aspect-ratio: 1; transform: translate(-50%, -50%); pointer-events: none; border-radius: 9999px;
  background: repeating-conic-gradient(rgba(250,204,21,.34) 0deg 9deg, transparent 9deg 24deg);
  -webkit-mask-image: radial-gradient(circle, #000 20%, transparent 68%); mask-image: radial-gradient(circle, #000 20%, transparent 68%);
  animation: lb-spin 18s linear infinite; }
.lb-shine { position: absolute; top: 0; bottom: 0; left: 0; width: 35%; background: linear-gradient(90deg, transparent, rgba(255,255,255,.45), transparent); animation: lb-shine 3.6s ease-in-out infinite both; }
.lb-beam { position: absolute; top: -80px; width: 190px; height: 640px; transform-origin: top center; filter: blur(18px);
  background: linear-gradient(180deg, rgba(250,204,21,.28), transparent 85%); clip-path: polygon(42% 0, 58% 0, 100% 100%, 0 100%); animation: lb-sway 7s ease-in-out infinite; }
.lb-beam-left { left: 8%; --from: -34deg; --to: -12deg; }
.lb-beam-right { right: 8%; --from: 34deg; --to: 12deg; animation-delay: -3.5s; }
.lb-title { background: linear-gradient(90deg, #d97706, #f5b92e, #65a30d, #0d9488, #d97706); background-size: 200% auto; -webkit-background-clip: text; background-clip: text; color: transparent; animation: lb-colour 5s linear infinite; }
@media (prefers-reduced-motion: reduce) {
  .lb-rise, .lb-jump, .lb-slide, .lb-ping, .lb-float, .lb-glow, .lb-pulse, .lb-rays, .lb-shine, .lb-beam, .lb-title { animation: none !important; }
  .lb-fall, .lb-shine { display: none; }
}
`;

function TrackBadge({ role }) {
  const key = role || 'personal';
  const style =
    TRACK_STYLES[key] || 'border-slate-700 bg-slate-900/60 text-slate-300';
  const label = TRACK_LABELS[key] || key;

  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-black uppercase tracking-wider ${style}`}
    >
      {label}
    </span>
  );
}

// Counts a number up to its value (and between updates). Respects reduced motion.
function CountUp({ value }) {
  const [shown, setShown] = useState(0);
  const shownRef = useRef(0);

  useEffect(() => {
    const to = Number(value) || 0;
    const from = shownRef.current;
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduce || from === to) {
      shownRef.current = to;
      setShown(to);
      return undefined;
    }

    const start = performance.now();
    const duration = 900;
    let raf;

    const step = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = from + (to - from) * eased;
      shownRef.current = current;
      setShown(current);
      if (progress < 1) raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <>{formatMoney(shown)}</>;
}

function Avatar({ id, size = 'h-10 w-10 text-lg' }) {
  const a = avatarById(id);
  return (
    <span
      aria-hidden="true"
      className={`${size} shrink-0 grid place-items-center rounded-full shadow-lg select-none`}
      style={{ background: `linear-gradient(135deg, ${a.from}, ${a.to})` }}
    >
      {a.emoji}
    </span>
  );
}

// The XP rank (Silver 1, Gold 2...). rankId: undefined = still loading, null = not available.
function RankChip({ rankId }) {
  const rank = RANKS.find((r) => r.id === rankId);
  if (!rank) {
    return (
      <span className={`text-xs font-black text-slate-400 ${rankId === undefined ? 'animate-pulse' : ''}`}>
        {rankId === undefined ? '\u2022\u2022\u2022' : '\u2014'}
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border py-1 pl-1.5 pr-2.5 text-xs font-black"
      style={{ background: '#0B1220', borderColor: rank.c[1], color: rank.c[0], boxShadow: `0 0 12px -3px ${rank.c[1]}` }}
    >
      <span className="hidden sm:inline-flex"><RankBadge rank={rank} size={18} /></span>
      {rank.name}
    </span>
  );
}

function Confetti() {
  const [bits] = useState(() =>
    Array.from({ length: 44 }).map((_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.9,
      duration: 2.2 + Math.random() * 1.6,
      size: 14 + Math.random() * 16,
      icon: ['\u{1F389}', '\u2728', '\u{1F451}', '\u{1F4B0}', '\u{1F525}'][i % 5],
    }))
  );
  const [over, setOver] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setOver(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  if (over) return null;
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[70] overflow-hidden">
      {bits.map((b, i) => (
        <span
          key={i}
          className="lb-fall"
          style={{ left: `${b.left}%`, fontSize: b.size, animationDelay: `${b.delay}s`, animationDuration: `${b.duration}s` }}
        >
          {b.icon}
        </span>
      ))}
    </div>
  );
}

function applyScope(query, scope, profile) {
  // Staff are not paying students, so they never appear on any ranking.
  query = onlyRanked(query);
  if (scope === 'school' && profile?.school_id) {
    return query.eq('school_id', profile.school_id);
  }
  if (scope === 'class' && profile?.specific_class_id) {
    return query.eq('specific_class_id', profile.specific_class_id);
  }
  return query;
}

export default function Leaderboard() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rankingScope, setRankingScope] = useState('world');
  const [topCount, setTopCount] = useState(TOP_STEP);
  const [bottomCount, setBottomCount] = useState(NEIGHBOURS);
  const [entries, setEntries] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [ranks, setRanks] = useState({});
  const [ranksFailed, setRanksFailed] = useState(false);
  const [party, setParty] = useState(0);

  const profileRef = useRef(null);
  const requestRef = useRef(0);
  const readyRef = useRef(false);

  const fetchRankings = useCallback(
    async (passedProfile) => {
      const requestId = requestRef.current + 1;
      requestRef.current = requestId;
      const currentProfile = passedProfile ?? profileRef.current;

      try {
        const rankedQuery = () =>
          applyScope(
            supabase.from('profiles').select(FIELDS, { count: 'exact' }),
            rankingScope,
            currentProfile
          )
            .order('net_worth', { ascending: false, nullsFirst: false })
            .order('id', { ascending: true });

        let myValue = null;

        if (currentProfile?.id) {
          const { data: mine, error: mineError } = await supabase
            .from('profiles')
            .select('net_worth')
            .eq('id', currentProfile.id)
            .maybeSingle();

          if (mineError) throw mineError;
          myValue = mine?.net_worth ?? null;
        }

        const ranked = myValue !== null && Number.isFinite(Number(myValue));

        const toEntries = (rows, startIndex) =>
          (rows || []).map((trader, i) => ({
            type: 'row',
            rank: startIndex + i + 1,
            trader,
          }));

        let nextEntries = [];

        if (!ranked) {
          const { data, count, error } = await rankedQuery().range(
            0,
            topCount - 1
          );
          if (error) throw error;

          const rows = data || [];
          nextEntries = toEntries(rows, 0);
          if ((count ?? 0) > rows.length) {
            nextEntries.push({ type: 'more', key: 'more' });
          }
        } else {
          const value = Number(myValue);

          const { count: ahead, error: aheadError } = await applyScope(
            supabase
              .from('profiles')
              .select('id', { count: 'exact', head: true }),
            rankingScope,
            currentProfile
          ).or(aheadOf(value, currentProfile.id));

          if (aheadError) throw aheadError;

          const myIndex = ahead ?? 0;
          const windowStart = Math.max(0, myIndex - NEIGHBOURS);
          const windowEnd = myIndex + bottomCount;

          if (windowStart <= topCount) {
            const end = Math.max(topCount - 1, windowEnd);
            const { data, count, error } = await rankedQuery().range(0, end);
            if (error) throw error;

            const rows = data || [];
            nextEntries = toEntries(rows, 0);
            if ((count ?? 0) > rows.length) {
              nextEntries.push({ type: 'gap', key: 'gap-bottom' });
            }
          } else {
            const [topRes, windowRes] = await Promise.all([
              rankedQuery().range(0, topCount - 1),
              rankedQuery().range(windowStart, windowEnd),
            ]);

            if (topRes.error) throw topRes.error;
            if (windowRes.error) throw windowRes.error;

            const windowRows = windowRes.data || [];

            nextEntries = [
              ...toEntries(topRes.data, 0),
              { type: 'more', key: 'more' },
              ...toEntries(windowRows, windowStart),
            ];

            if ((windowRes.count ?? 0) > windowStart + windowRows.length) {
              nextEntries.push({ type: 'gap', key: 'gap-bottom' });
            }
          }
        }

        if (requestId !== requestRef.current) return;
        setEntries(nextEntries);
        setErrorMessage('');
      } catch (error) {
        if (requestId !== requestRef.current) return;
        console.error('Leaderboard fetch failed:', error);
        setErrorMessage(
          'Could not load the latest standings. Please check your connection.'
        );
      } finally {
        if (requestId === requestRef.current) setLoading(false);
      }
    },
    [rankingScope, topCount, bottomCount]
  );

  const fetchRef = useRef(fetchRankings);

  useEffect(() => {
    fetchRef.current = fetchRankings;
  }, [fetchRankings]);

  useEffect(() => {
    let active = true;

    async function initialise(showLoading) {
      if (showLoading) setLoading(true);

      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error('Session fetch failed:', error);
      }

      if (!active) return;

      const currentUser = session?.user ?? null;
      setUser(currentUser);

      let currentProfile = null;

      if (currentUser) {
        const { data, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .maybeSingle();

        if (profileError) {
          console.error('Profile fetch failed:', profileError);
        }

        currentProfile = data ?? null;
        profileRef.current = currentProfile;
        setProfile(currentProfile);
      } else {
        profileRef.current = null;
        setProfile(null);
      }

      if (active) {
        await fetchRef.current(currentProfile);
        readyRef.current = true;
      }
    }

    initialise(true);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      if (active) initialise(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (readyRef.current) fetchRankings();
  }, [fetchRankings]);

  useEffect(() => {
    const refresh = () => {
      if (readyRef.current) fetchRef.current();
    };

    const channel = supabase
      .channel('leaderboard-profiles')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        refresh
      )
      .subscribe();

    const interval = setInterval(refresh, 10000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  const isPersonalTrack = profile?.role === 'personal';

  // ---- display-only values, all derived from the rows already loaded ----
  const rowEntries = entries.filter((entry) => entry.type === 'row');
  const byPlace = (place) => rowEntries.find((entry) => entry.rank === place);
  const podiumSlots = [2, 1, 3].map(byPlace).filter(Boolean);
  const champion = byPlace(1);
  const showPodium = !loading && !errorMessage && !!champion;

  const myEntry = user ? rowEntries.find((entry) => entry.trader.id === user.id) : null;
  const myPlace = myEntry ? myEntry.rank : 0;
  const myValue = myEntry ? worthOf(myEntry.trader) : 0;
  const aheadEntry = myEntry ? byPlace(myPlace - 1) : null;
  const behindEntry = myEntry ? byPlace(myPlace + 1) : null;
  const thirdEntry = byPlace(3);
  const nameOf = (entry) => entry.trader.name || 'Anonymous Trader';

  const headline =
    myPlace === 1
      ? 'The crown is yours. Defend it!'
      : myPlace <= 3
        ? 'You are on the podium!'
        : myPlace <= 10
          ? 'Top 10! The podium is calling.'
          : 'Time to charge up the board!';

  const chips = [];
  if (aheadEntry) {
    const gap = worthOf(aheadEntry.trader) - myValue;
    chips.push(
      gap > 0
        ? `\u{1F3AF} ${formatMoney(gap)} to catch ${nameOf(aheadEntry)}`
        : `\u{1F3AF} Level with ${nameOf(aheadEntry)}`
    );
  }
  if (myPlace > 4 && thirdEntry) {
    chips.push(`\u{1F949} ${formatMoney(Math.max(0, worthOf(thirdEntry.trader) - myValue))} to the podium`);
  }
  if (behindEntry) {
    const lead = myValue - worthOf(behindEntry.trader);
    chips.push(
      lead > 0
        ? `\u{1F6E1}\u{FE0F} ${formatMoney(lead)} ahead of ${nameOf(behindEntry)}`
        : `\u{1F6E1}\u{FE0F} ${nameOf(behindEntry)} is level with you`
    );
  }

  // XP ranks for the players on screen, refreshed every minute
  const idKey = rowEntries.map((entry) => entry.trader.id).join(',');
  const userId = user?.id;

  useEffect(() => {
    if (!userId || !idKey) return undefined;
    let active = true;

    const loadRanks = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const ids = idKey.split(',');
        for (let i = 0; i < ids.length; i += 40) {
          const res = await fetch('/api/leaderboard-ranks', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer ' + session.access_token,
            },
            body: JSON.stringify({ ids: ids.slice(i, i + 40) }),
          });
          if (!res.ok) throw new Error('Rank request failed (' + res.status + ')');
          const out = await res.json();
          if (!active) return;
          setRanks((previous) => ({ ...previous, ...out.ranks }));
        }
        if (active) setRanksFailed(false);
      } catch (error) {
        console.warn('Could not load ranks', error);
        if (active) setRanksFailed(true);
      }
    };

    loadRanks();
    const timer = setInterval(loadRanks, 60000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [userId, idKey]);

  const rankIdFor = (id) => {
    if (id in ranks) return ranks[id];
    return !userId || ranksFailed ? null : undefined;
  };

  return (
    <main className="min-h-screen bg-bull-bg text-slate-100 font-sans pt-24 pb-20 relative overflow-hidden">
      <style>{LB_CSS}</style>

      <Navbar />

      {showPodium && <Confetti key={party} />}

      {/* Ambient glow and two swaying spotlights */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(760px 380px at 50% 10%, rgba(250,204,21,0.18), transparent 70%), radial-gradient(900px 440px at 50% 118%, rgba(163,230,53,0.18), transparent 65%)',
        }}
      />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[620px] overflow-hidden">
        <div className="lb-beam lb-beam-left" />
        <div className="lb-beam lb-beam-right" />
      </div>

      <section className="relative max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
        <header className="text-center space-y-3">
          <div className="flex justify-center"><Mascot mood="trophy" size={160} eager /></div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="inline-block rounded-full border border-bull-line bg-bull-raised px-4 py-1.5 text-xs font-black uppercase tracking-widest text-bull-lime">
              {'\u{1F525}'} The Bull Run Arena
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-bull-line bg-bull-surface px-3 py-1.5 text-xs font-bold text-slate-300">
              <span className="relative flex h-2 w-2">
                <span className="lb-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              Live, updates every 10 seconds
            </span>
          </div>

          <h1 className="lb-title text-4xl sm:text-6xl font-black leading-tight">
            Who Rules The Market?
          </h1>

          <p className="max-w-md mx-auto text-sm font-bold text-slate-300">
            {showPodium
              ? `\u{1F451} ${nameOf(champion)} holds the crown. Think you can take it?`
              : 'The highest portfolio value takes the crown.'}
          </p>
        </header>

        <div className="flex justify-center">
          <div className="flex flex-wrap justify-center gap-2 rounded-2xl border border-bull-line bg-bull-surface p-2">
            {[
              { id: 'world', label: '\u{1F310} World' },
              { id: 'school', label: '\u{1F3EB} School' },
              { id: 'class', label: '\u{1F4CB} Class' },
            ].map((tab) => {
              const disabled =
                tab.id !== 'world' &&
                (isPersonalTrack ||
                  (tab.id === 'school' && !profile?.school_id) ||
                  (tab.id === 'class' && !profile?.specific_class_id));

              return (
                <button
                  key={tab.id}
                  disabled={disabled}
                  onClick={() => {
                    setRankingScope(tab.id);
                    setBottomCount(NEIGHBOURS);
                    setTopCount(TOP_STEP);
                  }}
                  className={`rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-wider transition ${
                    rankingScope === tab.id
                      ? 'bg-bull-lime text-bull-ink scale-105'
                      : 'text-slate-400 hover:bg-bull-raised hover:text-white'
                  } disabled:cursor-not-allowed disabled:opacity-30`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Podium: the top three, taken from the rows already loaded */}
        {showPodium && (
          <div className="grid grid-cols-3 items-end gap-2 sm:gap-5 pt-10">
            {podiumSlots.map((entry) => {
              const { trader, rank: place } = entry;
              const style = PODIUM[place];
              const first = place === 1;
              const isCurrentUser = trader.id === user?.id;
              // 3rd appears first, then 2nd, and the champion lands last
              const delay = (3 - place) * 0.28;

              return (
                <div
                  key={trader.id}
                  className="lb-jump relative min-w-0"
                  style={{ animationDelay: `${delay}s`, gridColumnStart: place === 1 ? 2 : place === 2 ? 1 : 3, gridRowStart: 1 }}
                >
                  {first && <div aria-hidden="true" className="lb-rays" />}

                  <div
                    onClick={first ? () => setParty((n) => n + 1) : undefined}
                    className={`relative flex flex-col items-center text-center rounded-t-3xl border-2 border-b-0 bg-bull-surface px-1.5 sm:px-4 pb-4 ${first ? 'lb-glow cursor-pointer pt-9' : 'pt-6'}`}
                    style={{
                      backgroundImage: style.tint,
                      borderColor: style.ring,
                      boxShadow: `0 18px 44px -16px ${style.glow}`,
                    }}
                  >
                    <span aria-hidden="true" className="absolute inset-0 overflow-hidden rounded-t-3xl pointer-events-none">
                      <span className="lb-shine" style={{ animationDelay: `${place * 0.7}s` }} />
                    </span>

                    <div
                      aria-hidden="true"
                      className={`absolute left-1/2 -translate-x-1/2 ${first ? '-top-9 text-5xl sm:text-6xl' : '-top-5 text-3xl sm:text-4xl'}`}
                      style={{ filter: `drop-shadow(0 6px 10px ${style.glow})` }}
                    >
                      <span className={first ? 'lb-float inline-block' : 'inline-block'}>
                        {first ? '\u{1F451}' : MEDALS[place - 1]}
                      </span>
                    </div>

                    <Avatar
                      id={trader.avatar}
                      size={first ? 'h-16 w-16 sm:h-20 sm:w-20 text-3xl sm:text-4xl' : 'h-12 w-12 sm:h-14 sm:w-14 text-2xl sm:text-3xl'}
                    />

                    <div
                      className={
                        'mt-2 w-full truncate font-black ' +
                        (first ? 'text-sm sm:text-lg ' : 'text-xs sm:text-sm ') +
                        (isCurrentUser ? 'text-bull-lime' : 'text-white')
                      }
                    >
                      {trader.name || 'Anonymous Trader'}
                      {isCurrentUser ? ' (You)' : ''}
                    </div>

                    <div className={`mt-1 mb-2 w-full break-words font-mono font-black tabular-nums text-emerald-400 ${first ? 'text-sm sm:text-xl' : 'text-xs sm:text-base'}`}>
                      <CountUp value={worthOf(trader)} />
                    </div>

                    <RankChip rankId={rankIdFor(trader.id)} />
                  </div>

                  <div
                    className={`relative grid place-items-center rounded-b-2xl ${style.stepHeight}`}
                    style={{ background: style.step, color: '#0B1220' }}
                  >
                    <span className={`font-black ${first ? 'text-3xl sm:text-5xl' : 'text-2xl sm:text-3xl'}`}>{style.place}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Your place */}
        {!loading && !errorMessage && myEntry && (
          <div
            className="lb-rise relative overflow-hidden rounded-3xl border-2 border-bull-lime bg-bull-surface p-5 sm:p-6"
            style={{
              backgroundImage:
                'radial-gradient(120% 90% at 50% 130%, rgba(163,230,53,0.35), transparent 62%)',
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="lb-pulse grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-bull-lime text-bull-ink">
                  <span className="font-mono text-2xl font-black">{ordinal(myPlace)}</span>
                </div>
                <div className="sm:hidden">
                  <RankChip rankId={rankIdFor(myEntry.trader.id)} />
                </div>
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Your place</span>
                  <span className="hidden sm:inline-flex"><RankChip rankId={rankIdFor(myEntry.trader.id)} /></span>
                </div>
                <div className="text-lg sm:text-xl font-black text-white">{headline}</div>
                <div className="font-mono text-2xl sm:text-3xl font-black text-white tabular-nums break-words">
                  <CountUp value={myValue} />
                </div>
              </div>

              <a
                href="/simulator"
                className="self-start sm:self-center rounded-2xl bg-bull-lime px-5 py-3 text-xs font-black uppercase tracking-wider text-bull-ink transition hover:scale-105 active:scale-95"
              >
                {'\u{26A1}'} Trade now
              </a>
            </div>

            {chips.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {chips.map((chip) => (
                  <span key={chip.slice(0, 3)} className="rounded-full border border-bull-line bg-bull-raised px-3 py-1.5 text-xs font-bold text-slate-300">
                    {chip}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="overflow-hidden rounded-3xl border-2 border-bull-line border-b-4 border-b-bull-lime-dark bg-bull-surface shadow-2xl">
          {loading ? (
            <p className="p-12 text-center text-sm text-slate-400">
              Loading standings...
            </p>
          ) : errorMessage ? (
            <p className="p-12 text-center text-sm text-rose-400">
              {errorMessage}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-bull-raised text-xs uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-2 py-4 sm:px-4 text-center">Place</th>
                    <th className="px-2 py-4 sm:px-4">Trader</th>
                    <th className="px-2 py-4 sm:px-4">Rank</th>
                    <th className="hidden sm:table-cell px-4 py-4">Track</th>
                    <th className="px-2 py-4 sm:px-4 text-right">Net Worth</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-bull-line text-xs">
                  {entries.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-10 text-center text-slate-500">
                        No traders found.
                      </td>
                    </tr>
                  ) : (
                    entries.map((entry, index) => {
                      if (entry.type === 'gap' || entry.type === 'more') {
                        const below = entry.type === 'gap';
                        return (
                          <tr key={entry.key}>
                            <td colSpan={5} className="py-3 text-center">
                              <div className="text-xl font-black tracking-[0.4em] text-slate-600">
                                {'\u{22EF}'}
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  (below ? setBottomCount : setTopCount)((count) => count + TOP_STEP)
                                }
                                className="mt-1 rounded-full border border-bull-line bg-bull-raised px-4 py-1.5 text-xs font-black uppercase tracking-widest text-slate-300 transition-colors hover:border-bull-lime/50 hover:text-white"
                              >
                                Show {TOP_STEP} more{below ? ' below' : ''}
                              </button>
                            </td>
                          </tr>
                        );
                      }

                      const { trader, rank: place } = entry;
                      const isCurrentUser = trader.id === user?.id;
                      const podium = PODIUM[place];

                      return (
                        <tr
                          key={trader.id}
                          className={
                            'lb-slide transition-colors ' +
                            (isCurrentUser ? 'bg-bull-lime/30' : 'hover:bg-bull-raised')
                          }
                          style={{
                            animationDelay: `${Math.min(index, 10) * 70}ms`,
                            backgroundImage: podium && !isCurrentUser ? podium.tint.replace('180deg', '90deg') : undefined,
                            boxShadow: isCurrentUser
                              ? 'inset 5px 0 0 var(--color-bull-lime)'
                              : podium
                                ? `inset 5px 0 0 ${podium.ring}`
                                : undefined,
                          }}
                        >
                          <td className="px-2 py-4 sm:px-4 text-center">
                            {place <= 3 ? (
                              <span className="text-2xl" role="img" aria-label={ordinal(place)}>{MEDALS[place - 1]}</span>
                            ) : (
                              <span className="inline-grid h-9 min-w-9 place-items-center rounded-xl border border-bull-line bg-bull-raised px-1.5 font-mono font-black text-white">
                                {place}
                              </span>
                            )}
                          </td>

                          <td className="px-2 py-4 sm:px-4">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="hidden sm:inline-flex"><Avatar id={trader.avatar} /></span>
                              <span
                                className={
                                  'text-xs sm:text-sm font-black break-words ' +
                                  (isCurrentUser ? 'text-bull-lime' : 'text-white')
                                }
                              >
                                {trader.name || 'Anonymous Trader'}
                                {isCurrentUser ? ' (You)' : ''}
                              </span>
                            </div>
                          </td>

                          <td className="px-2 py-4 sm:px-4">
                            <RankChip rankId={rankIdFor(trader.id)} />
                          </td>

                          <td className="hidden sm:table-cell px-4 py-4">
                            <TrackBadge role={trader.role} />
                          </td>

                          <td className="px-2 py-4 sm:px-4 text-right">
                            <div className="font-mono text-xs sm:text-sm font-black text-emerald-400 tabular-nums">
                              {formatMoney(worthOf(trader))}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {!loading && !user && (
          <p className="text-center text-xs text-slate-400">Log in to see the rank of every trader.</p>
        )}
      </section>
    </main>
  );
}
