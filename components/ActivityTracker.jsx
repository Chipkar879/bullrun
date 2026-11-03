'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const BEAT_MS = 30000;

// Counts time only while the tab is open AND visible, for logged-in users.
export default function ActivityTracker() {
  useEffect(() => {
    let last = Date.now();

    const beat = async () => {
      const now = Date.now();
      const elapsed = Math.min(Math.round((now - last) / 1000), 60);
      last = now;

      if (document.visibilityState !== 'visible' || elapsed <= 0) return;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        const { error } = await supabase.rpc('log_activity', { p_seconds: elapsed });
        if (error) console.warn('Activity log failed:', error.message);
      } catch (err) {
        console.warn('Activity log error:', err);
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') last = Date.now();
    };

    const timer = setInterval(beat, BEAT_MS);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return null;
}