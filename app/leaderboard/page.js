'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';

const TOP_STEP = 5;
const NEIGHBOURS = 1;
const FIELDS =
  'id, name, role, school_id, specific_class_id, wallet_balance, net_worth';
const MEDALS = ['\u{1F947}', '\u{1F948}', '\u{1F949}'];

const TRACK_STYLES = {
  student: 'border-sky-800/60 bg-sky-950/40 text-sky-300',
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
    glow: 'rgba(250, 204, 21, 0.38)',
    tint: 'linear-gradient(180deg, rgba(250,204,21,0.20), rgba(250,204,21,0.03) 70%)',
    ring: 'rgba(250, 204, 21, 0.65)',
    height: 'min-h-[200px] sm:min-h-[230px]',
  },
  2: {
    glow: 'rgba(148, 163, 184, 0.34)',
    tint: 'linear-gradient(180deg, rgba(148,163,184,0.20), rgba(148,163,184,0.03) 70%)',
    ring: 'rgba(148, 163, 184, 0.65)',
    height: 'min-h-[168px] sm:min-h-[190px]',
  },
  3: {
    glow: 'rgba(251, 146, 60, 0.34)',
    tint: 'linear-gradient(180deg, rgba(251,146,60,0.20), rgba(251,146,60,0.03) 70%)',
    ring: 'rgba(251, 146, 60, 0.65)',
    height: 'min-h-[148px] sm:min-h-[165px]',
  },
};

const formatMoney = (value) =>
  '\u20B9' +
  Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

function TrackBadge({ role }) {
  const key = role || 'personal';
  const style =
    TRACK_STYLES[key] || 'border-slate-700 bg-slate-900/60 text-slate-300';
  const label = TRACK_LABELS[key] || key;

  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${style}`}
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

function Avatar({ name, size = 'h-9 w-9 text-sm' }) {
  const letter = String(name || 'A').trim().charAt(0).toUpperCase() || 'A';
  return (
    <span
      className={`${size} shrink-0 grid place-items-center rounded-full border border-bull-line bg-bull-raised font-black text-white`}
    >
      {letter}
    </span>
  );
}

function applyScope(query, scope, profile) {
  // Staff are not paying students, so they never appear on any ranking.
  query = query.not('role', 'in', '(teacher,school_admin)');
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
          ).or(
            `net_worth.gt.${value},and(net_worth.eq.${value},id.lt.${currentProfile.id})`
          );

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
          'Could not load the latest rankings. Please check your connection.'
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
  const podiumSlots = [2, 1, 3]
    .map((rank) => rowEntries.find((entry) => entry.rank === rank))
    .filter(Boolean);
  const showPodium = !loading && !errorMessage && rowEntries.some((e) => e.rank === 1);

  const myEntry = user ? rowEntries.find((entry) => entry.trader.id === user.id) : null;
  const myValue = myEntry ? Number(myEntry.trader.net_worth ?? myEntry.trader.wallet_balance ?? 0) : 0;
  const aheadEntry = myEntry ? rowEntries.find((entry) => entry.rank === myEntry.rank - 1) : null;
  const aheadGap = aheadEntry
    ? Number(aheadEntry.trader.net_worth ?? aheadEntry.trader.wallet_balance ?? 0) - myValue
    : 0;

  return (
    <main className="min-h-screen bg-bull-bg text-slate-100 font-sans pt-24 pb-20 relative overflow-hidden">
      <style>{`
        @keyframes lb-rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes lb-ping { 0% { transform: scale(1); opacity: .7; } 80%, 100% { transform: scale(2.6); opacity: 0; } }
        @keyframes lb-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        .lb-rise { animation: lb-rise .5s ease-out both; }
        .lb-ping { animation: lb-ping 1.8s ease-out infinite; }
        .lb-float { animation: lb-float 3.2s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .lb-rise, .lb-ping, .lb-float { animation: none !important; }
        }
      `}</style>

      <Navbar />

      {/* Ambient glow: lime from the bottom and a soft halo behind the title */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(700px 320px at 50% 8%, rgba(163,230,53,0.16), transparent 70%), radial-gradient(900px 440px at 50% 118%, rgba(163,230,53,0.16), transparent 65%)',
        }}
      />

      <section className="relative max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
        <header className="text-center space-y-3">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="inline-block rounded-full border border-bull-line bg-bull-raised px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-bull-lime">
              {'\u{1F3C6}'} Real-Time Arena Rankings
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-bull-line bg-bull-surface px-3 py-1.5 text-xs font-bold text-slate-300">
              <span className="relative flex h-2 w-2">
                <span className="lb-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              Live, updates every 10 seconds
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white">
            Global Trading Leaderboard
          </h1>

          <p className="max-w-md mx-auto text-xs text-slate-400">
            Rankings based on the portfolio values saved by the simulator.
          </p>
        </header>

        <div className="flex justify-center">
          <div className="flex flex-wrap justify-center gap-2 rounded-2xl border border-bull-line bg-bull-surface p-2">
            {[
              { id: 'world', label: '\u{1F310} World Ranking' },
              { id: 'school', label: '\u{1F3EB} School Ranking' },
              { id: 'class', label: '\u{1F4CB} Class Ranking' },
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
                  className={`rounded-xl px-4 py-2 text-xs font-black uppercase transition-colors ${
                    rankingScope === tab.id
                      ? 'bg-bull-lime text-bull-ink'
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
          <div className="grid grid-cols-3 items-end gap-2 sm:gap-5 pt-4">
            {podiumSlots.map((entry, slot) => {
              const { trader, rank } = entry;
              const style = PODIUM[rank];
              const value = trader.net_worth ?? trader.wallet_balance ?? 0;
              const isCurrentUser = trader.id === user?.id;

              return (
                <div
                  key={trader.id}
                  className="lb-rise relative"
                  style={{ animationDelay: `${slot * 120}ms` }}
                >
                  <div
                    className={`relative flex flex-col items-center justify-end text-center rounded-3xl border bg-bull-surface px-2 sm:px-4 pb-4 pt-8 ${style.height}`}
                    style={{
                      backgroundImage: style.tint,
                      borderColor: style.ring,
                      boxShadow: `0 18px 40px -18px ${style.glow}, inset 0 1px 0 rgba(255,255,255,0.08)`,
                    }}
                  >
                    <div
                      className={`absolute -top-5 left-1/2 -translate-x-1/2 text-3xl sm:text-4xl ${rank === 1 ? 'lb-float' : ''}`}
                      style={{ filter: `drop-shadow(0 6px 10px ${style.glow})` }}
                      aria-hidden="true"
                    >
                      {MEDALS[rank - 1]}
                    </div>

                    <Avatar
                      name={trader.name}
                      size={rank === 1 ? 'h-14 w-14 text-xl' : 'h-11 w-11 text-base'}
                    />

                    <div
                      className={
                        'mt-2 w-full truncate text-xs sm:text-sm font-black ' +
                        (isCurrentUser ? 'text-bull-lime' : 'text-white')
                      }
                    >
                      {trader.name || 'Anonymous Trader'}
                      {isCurrentUser ? ' (You)' : ''}
                    </div>

                    <div className="mt-1 w-full truncate font-mono text-xs sm:text-base font-black text-emerald-400">
                      {formatMoney(value)}
                    </div>

                    </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Your position */}
        {!loading && !errorMessage && myEntry && (
          <div
            className="lb-rise relative overflow-hidden rounded-3xl border border-bull-line bg-bull-surface p-5 sm:p-6"
            style={{
              backgroundImage:
                'radial-gradient(120% 90% at 50% 130%, rgba(163,230,53,0.30), transparent 62%)',
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-bull-lime/60 bg-bull-raised">
                  <span className="font-mono text-2xl font-black text-bull-lime">
                    #{myEntry.rank}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    Your position
                  </div>
                  <div className="font-mono text-2xl sm:text-3xl font-black text-white tabular-nums break-words">
                    <CountUp value={myValue} />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <span className="rounded-full border border-bull-line bg-bull-raised px-3 py-1.5 text-xs font-bold text-slate-300">
                  {myEntry.rank === 1
                    ? "You're in the lead"
                    : aheadEntry
                      ? formatMoney(Math.max(0, aheadGap)) + ' to pass #' + aheadEntry.rank
                      : 'Keep climbing'}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="overflow-hidden rounded-3xl border-2 border-bull-line border-b-4 border-b-bull-lime-dark bg-bull-surface shadow-2xl">
          {loading ? (
            <p className="p-12 text-center text-sm text-slate-400">
              Loading rankings...
            </p>
          ) : errorMessage ? (
            <p className="p-12 text-center text-sm text-rose-400">
              {errorMessage}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-bull-raised text-[10px] uppercase text-slate-400">
                  <tr>
                    <th className="p-4 text-center">Rank</th>
                    <th className="p-4">Trader</th>
                    <th className="p-4">Track</th>
                    <th className="p-4 text-right">Net Worth</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-bull-line text-xs">
                  {entries.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-10 text-center text-slate-500">
                        No traders found.
                      </td>
                    </tr>
                  ) : (
                    entries.map((entry, index) => {
                      if (entry.type === 'gap') {
                        return (
                          <tr key={entry.key}>
                            <td colSpan={4} className="py-3 text-center">
                              <div className="text-xl font-black tracking-[0.4em] text-slate-600">
                                {'\u22EF'}
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  setBottomCount((count) => count + TOP_STEP)
                                }
                                className="mt-1 rounded-full border border-bull-line bg-bull-raised px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-300 transition-colors hover:border-bull-lime/50 hover:text-white"
                              >
                                Show {TOP_STEP} more below
                              </button>
                            </td>
                          </tr>
                        );
                      }

                      if (entry.type === 'unused-gap') {
                        return (
                          <tr key={entry.key}>
                            <td
                              colSpan={4}
                              className="py-2 text-center text-xl font-black tracking-[0.4em] text-slate-600"
                            >
                              {'\u22EF'}
                            </td>
                          </tr>
                        );
                      }

                      if (entry.type === 'more') {
                        return (
                          <tr key={entry.key}>
                            <td colSpan={4} className="py-3 text-center">
                              <div className="text-xl font-black tracking-[0.4em] text-slate-600">
                                {'\u22EF'}
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  setTopCount((count) => count + TOP_STEP)
                                }
                                className="mt-1 rounded-full border border-bull-line bg-bull-raised px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-300 transition-colors hover:border-bull-lime/50 hover:text-white"
                              >
                                Show {TOP_STEP} more
                              </button>
                            </td>
                          </tr>
                        );
                      }

                      const { trader, rank } = entry;
                      const isCurrentUser = trader.id === user?.id;
                      const value =
                        trader.net_worth ?? trader.wallet_balance ?? 0;
                      const podiumRing =
                        rank <= 3 && !isCurrentUser
                          ? { boxShadow: `inset 3px 0 0 ${PODIUM[rank].ring}` }
                          : undefined;

                      return (
                        <tr
                          key={trader.id}
                          className={
                            'lb-rise transition-colors ' +
                            (isCurrentUser
                              ? 'bg-bull-lime/25 shadow-[inset_3px_0_0_var(--color-bull-lime)]'
                              : 'hover:bg-bull-raised')
                          }
                          style={{
                            animationDelay: `${Math.min(index, 10) * 40}ms`,
                            ...podiumRing,
                          }}
                        >
                          <td className="p-4 text-center font-black text-white">
                            {rank <= 3 ? MEDALS[rank - 1] : `#${rank}`}
                          </td>

                          <td className="p-4">
                            <div className="flex items-center gap-3 min-w-0">
                              <Avatar name={trader.name} />
                              <span
                                className={
                                  isCurrentUser
                                    ? 'text-bull-lime font-black'
                                    : 'text-white'
                                }
                              >
                                {trader.name || 'Anonymous Trader'}
                                {isCurrentUser ? ' (You)' : ''}
                              </span>
                            </div>
                          </td>

                          <td className="p-4">
                            <TrackBadge role={trader.role} />
                          </td>

                          <td className="p-4 text-right">
                            <div className="font-mono font-black text-emerald-400">
                              {'\u20B9'}
                              {Number(value).toLocaleString('en-IN', {
                                maximumFractionDigits: 2,
                              })}
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
      </section>
    </main>
  );
}