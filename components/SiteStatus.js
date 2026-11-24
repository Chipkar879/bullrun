'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { SUPER_ADMIN_EMAIL } from '@/lib/admin';

const LEVELS = {
  info: 'border-sky-700/60 bg-sky-950/95 text-sky-100',
  warning: 'border-amber-600/60 bg-amber-950/95 text-amber-100',
  success: 'border-emerald-700/60 bg-emerald-950/95 text-emerald-100',
};
const ICONS = { info: 'ℹ️', warning: '⚠️', success: '✅' };
const KEY = 'bb_dismissed_announcements';

const same = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

export default function SiteStatus() {
  const pathname = usePathname() || '';
  const [items, setItems] = useState([]);
  const [dismissed, setDismissed] = useState([]);
  const [maintenance, setMaintenance] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    try { setDismissed(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch (e) { /* ignore */ }

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        let prof = null;
        if (session && session.user) {
          if (session.user.email === SUPER_ADMIN_EMAIL) setIsAdmin(true);
          const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
          prof = data;
        }

        const { data: ann } = await supabase.from('announcements').select('id, message, level, audience, target').order('created_at', { ascending: false }).limit(20);
        const mine = (ann || []).filter((a) => {
          if (a.audience === 'all') return true;
          if (!prof) return false;
          if (a.audience === 'school') return same(a.target, prof.school_id) || same(a.target, prof.school_code);
          if (a.audience === 'class') return same(a.target, prof.specific_class_id);
          return false;
        });
        setItems(mine);

        const { data: sets } = await supabase.from('app_settings').select('key, value').in('key', ['maintenance_mode', 'maintenance_message']);
        const m = {};
        (sets || []).forEach((r) => { m[r.key] = r.value; });
        if (m.maintenance_mode === 'true') setMaintenance(m.maintenance_message || 'We are upgrading Bull Run. Back shortly!');
      } catch (e) { /* the public site must never break because of this */ }
    })();
  }, []);

  const dismiss = (id) => {
    const next = [...dismissed, id];
    setDismissed(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch (e) { /* ignore */ }
  };

  const skip = pathname.startsWith('/admin');
  const exempt = skip || isAdmin || pathname.startsWith('/login') || pathname.startsWith('/auth');

  if (maintenance && !exempt) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-bull-bg p-6 text-center">
        <div className="max-w-md space-y-4">
          <div className="text-6xl">🛠️</div>
          <h1 className="text-2xl font-black text-white">Under maintenance</h1>
          <p className="text-sm font-medium text-slate-400">{maintenance}</p>
        </div>
      </div>
    );
  }

  const visible = items.filter((a) => !dismissed.includes(a.id));
  if (skip || visible.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-[60] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 space-y-2">
      {visible.slice(0, 3).map((a) => (
        <div key={a.id} className={`pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3 text-xs font-bold shadow-2xl backdrop-blur ${LEVELS[a.level] || LEVELS.info}`}>
          <span>{ICONS[a.level] || ICONS.info}</span>
          <p className="flex-1 leading-relaxed">{a.message}</p>
          <button onClick={() => dismiss(a.id)} aria-label="Dismiss" className="cursor-pointer opacity-70 hover:opacity-100">✕</button>
        </div>
      ))}
    </div>
  );
}