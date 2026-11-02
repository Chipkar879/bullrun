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

function applyScope(query, scope, profile) {
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
          const windowEnd = myIndex + NEIGHBOURS;

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
    [rankingScope, topCount]
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

  return (
    <main className="min-h-screen bg-black text-slate-100 font-sans pt-24 pb-20">
      <Navbar />

      <section className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
        <header className="text-center space-y-3">
          <span className="inline-block rounded-full border border-[#2b0808] bg-[#1a0808] px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-[#ff3333]">
            {'\u{1F3C6}'} Real-Time Arena Rankings
          </span>

          <h1 className="text-3xl sm:text-5xl font-black text-white">
            Global Trading Leaderboard
          </h1>

          <p className="max-w-md mx-auto text-xs text-slate-400">
            Rankings based on the portfolio values saved by the simulator.
          </p>
        </header>

        <div className="flex justify-center">
          <div className="flex flex-wrap justify-center gap-2 rounded-2xl border border-[#2b0808] bg-[#0f0505] p-2">
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
                    setTopCount(TOP_STEP);
                  }}
                  className={`rounded-xl px-4 py-2 text-xs font-black uppercase transition-colors ${
                    rankingScope === tab.id
                      ? 'bg-[#7a0000] text-white'
                      : 'text-slate-400 hover:bg-[#1a0808] hover:text-white'
                  } disabled:cursor-not-allowed disabled:opacity-30`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border-2 border-[#2b0808] border-b-4 border-b-[#7a0000] bg-[#0f0505] shadow-2xl">
          {loading ? (
            <p className="p-12 text-center text-sm text-slate-400">
              Loading rankings...
            </p>
          ) : errorMessage ? (
            <p className="p-12 text-center text-sm text-red-400">
              {errorMessage}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[#1a0808] text-[10px] uppercase text-slate-400">
                  <tr>
                    <th className="p-4 text-center">Rank</th>
                    <th className="p-4">Trader</th>
                    <th className="p-4">Track</th>
                    <th className="p-4 text-right">Net Worth</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#2b0808] text-xs">
                  {entries.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-10 text-center text-slate-500">
                        No traders found.
                      </td>
                    </tr>
                  ) : (
                    entries.map((entry) => {
                      if (entry.type === 'gap') {
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
                                className="mt-1 rounded-full border border-[#2b0808] bg-[#1a0808] px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-300 transition-colors hover:border-[#7a0000] hover:text-white"
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

                      return (
                        <tr
                          key={trader.id}
                          className={
                            isCurrentUser
                              ? 'bg-[#7a0000]/25 shadow-[inset_3px_0_0_#ff3333]'
                              : 'hover:bg-[#1a0808]'
                          }
                        >
                          <td className="p-4 text-center font-black text-white">
                            {rank <= 3 ? MEDALS[rank - 1] : `#${rank}`}
                          </td>

                          <td className="p-4">
                            <span
                              className={
                                isCurrentUser
                                  ? 'text-[#ff3333] font-black'
                                  : 'text-white'
                              }
                            >
                              {trader.name || 'Anonymous Trader'}
                              {isCurrentUser ? ' (You)' : ''}
                            </span>
                          </td>

                          <td className="p-4">
                            <TrackBadge role={trader.role} />
                          </td>

                          <td className="p-4 text-right font-mono font-black text-emerald-400">
                            {'\u20B9'}
                            {Number(value).toLocaleString('en-IN', {
                              maximumFractionDigits: 2,
                            })}
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