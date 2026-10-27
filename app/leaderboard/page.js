
'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';

export default function Leaderboard() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rankingScope, setRankingScope] = useState('world');
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchRankings = useCallback(async (currentProfile = profile) => {
    try {
      let query = supabase
        .from('profiles')
        .select(
          'id, name, role, school_id, specific_class_id, wallet_balance, net_worth'
        );

      if (rankingScope === 'school' && currentProfile?.school_id) {
        query = query.eq('school_id', currentProfile.school_id);
      } else if (
        rankingScope === 'class' &&
        currentProfile?.specific_class_id
      ) {
        query = query.eq(
          'specific_class_id',
          currentProfile.specific_class_id
        );
      }

      const { data, error } = await query
        .order('net_worth', { ascending: false, nullsFirst: false })
        .limit(50);

      if (error) throw error;

      setLeaderboardData(data || []);
      setErrorMessage('');
    } catch (error) {
      console.error('Leaderboard fetch failed:', error);
      setErrorMessage(
        'Could not load the latest rankings. Please check your connection.'
      );
    } finally {
      setLoading(false);
    }
  }, [rankingScope, profile]);

  useEffect(() => {
    let active = true;

    async function initialise() {
      setLoading(true);

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
        setProfile(currentProfile);
      } else {
        setProfile(null);
      }

      if (active) {
        await fetchRankings(currentProfile);
      }
    }

    initialise();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      if (active) initialise();
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [fetchRankings]);

  useEffect(() => {
    fetchRankings();

    const channel = supabase
      .channel('leaderboard-profiles')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => fetchRankings()
      )
      .subscribe();

    const interval = setInterval(() => {
      fetchRankings();
    }, 10000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [fetchRankings]);

  const isPersonalTrack = profile?.role === 'personal';

  return (
    <main className="min-h-screen bg-black text-slate-100 font-sans pt-24 pb-20">
      <Navbar />

      <section className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
        <header className="text-center space-y-3">
          <span className="inline-block rounded-full border border-[#2b0808] bg-[#1a0808] px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-[#ff3333]">
            🏆 Real-Time Arena Rankings
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
              { id: 'world', label: '🌐 World Ranking' },
              { id: 'school', label: '🏫 School Ranking' },
              { id: 'class', label: '📋 Class Ranking' },
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
                  onClick={() => setRankingScope(tab.id)}
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
                  {leaderboardData.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-10 text-center text-slate-500">
                        No traders found.
                      </td>
                    </tr>
                  ) : (
                    leaderboardData.map((trader, index) => {
                      const isCurrentUser = trader.id === user?.id;
                      const value =
                        trader.net_worth ?? trader.wallet_balance ?? 0;

                      return (
                        <tr
                          key={trader.id}
                          className={
                            isCurrentUser
                              ? 'bg-[#7a0000]/20'
                              : 'hover:bg-[#1a0808]'
                          }
                        >
                          <td className="p-4 text-center font-black text-white">
                            {index < 3
                              ? ['🥇', '🥈', '🥉'][index]
                              : `#${index + 1}`}
                          </td>

                          <td className="p-4">
                            <span className={isCurrentUser ? 'text-[#ff3333] font-black' : 'text-white'}>
                              {trader.name || 'Anonymous Trader'}
                              {isCurrentUser ? ' (You)' : ''}
                            </span>
                          </td>

                          <td className="p-4">
                            {trader.role || 'personal'}
                          </td>

                          <td className="p-4 text-right font-mono font-black text-emerald-400">
                            ₹{Number(value).toLocaleString('en-IN', {
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
