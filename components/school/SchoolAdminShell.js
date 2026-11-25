'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { supabase } from '@/lib/supabase';
import { useAdmin } from '@/components/admin/AdminProvider';
import SchoolAdminProvider from './SchoolAdminProvider';

const BASE = '/school/admin';
const NAV = [
  {
    group: 'Core',
    items: [
      { href: BASE, label: 'Overview', exact: true },
      { href: '/school', label: 'Users', exact: true },
      { href: BASE + '/teachers', label: 'Teachers', badge: 'teachers' },
      { href: BASE + '/access', label: 'Access & Expiry', badge: 'expiring' },
    ],
  },
  {
    group: 'Engagement',
    items: [
      { href: BASE + '/progress', label: 'Learning Progress' },
      { href: BASE + '/schools', label: 'Classes' },
    ],
  },
];

function Inner({ children }) {
  const { checking, authorized, lastUpdated, pendingTeachers, expiringSoon, toast, school } = useAdmin();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  if (checking || !authorized) {
    return (
      <main className="min-h-screen bg-bull-bg text-slate-100 antialiased font-sans">
        <Navbar />
        <div className="max-w-6xl mx-auto px-6 pt-32 flex justify-center">
          <div className="space-y-4 text-center">
            <div className="w-12 h-12 border-4 border-bull-lime border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-slate-400 text-sm font-bold animate-pulse">Loading your school admin...</p>
          </div>
        </div>
      </main>
    );
  }

  const badges = { teachers: pendingTeachers.length, expiring: expiringSoon.length };
  const isActive = (item) => (item.exact ? pathname === item.href : pathname.startsWith(item.href));
  const logout = async () => { await supabase.auth.signOut(); window.location.href = '/'; };

  return (
    <main className="min-h-screen bg-bull-bg text-slate-100 antialiased font-sans max-w-full overflow-x-hidden">
      <Navbar />
      {open && <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setOpen(false)} />}

      <aside className={`fixed left-0 top-16 bottom-0 z-40 flex w-64 flex-col border-r border-bull-line bg-bull-surface transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          <div className="px-3">
            <p className="truncate text-sm font-black text-white">{school?.name}</p>
            <p className="font-mono text-xs text-slate-400">{school?.code} | {school?.status}</p>
          </div>
          {NAV.map((g) => (
            <div key={g.group} className="space-y-1">
              <p className="px-3 text-xs font-black uppercase tracking-widest text-slate-500 font-mono">{g.group}</p>
              {g.items.map((item) => {
                const count = item.badge ? badges[item.badge] : 0;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-all ${isActive(item) ? 'bg-bull-lime text-bull-ink shadow-md' : 'text-slate-300 hover:bg-bull-raised hover:text-white'}`}
                  >
                    <span className="flex-1 truncate">{item.label}</span>
                    {count > 0 && <span className="rounded-full bg-amber-400 px-2 py-0.5 text-xs font-black text-bull-ink">{count}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
          <Link href="/school" className="block rounded-xl px-3 py-2.5 text-sm font-bold text-slate-400 hover:bg-bull-raised hover:text-white">Back to School dashboard</Link>
        </div>
        <div className="border-t border-bull-line p-3 space-y-2">
          <div className="px-2 text-xs font-mono text-slate-500">
            <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            LIVE | {lastUpdated ? lastUpdated.toLocaleTimeString('en-IN') : '--'}
          </div>
          <button onClick={logout} className="w-full rounded-xl px-3 py-2 text-left text-sm font-bold text-rose-400 hover:bg-rose-950/50 cursor-pointer">Logout</button>
        </div>
      </aside>

      <button onClick={() => setOpen(true)} className="fixed bottom-4 left-4 z-30 rounded-full border border-bull-line bg-bull-surface px-4 py-3 text-sm font-bold shadow-xl lg:hidden cursor-pointer" aria-label="Open admin menu">
        Menu
      </button>

      <div className="pt-16 pb-20 lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6">{children}</div>
      </div>

      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 max-w-sm rounded-xl border px-4 py-3 text-sm font-bold shadow-2xl ${toast.type === 'error' ? 'border-rose-800 bg-rose-950 text-rose-300' : 'border-emerald-800 bg-emerald-950 text-emerald-300'}`}>
          {toast.message}
        </div>
      )}
    </main>
  );
}

export default function SchoolAdminShell({ children }) {
  return (
    <SchoolAdminProvider>
      <Inner>{children}</Inner>
    </SchoolAdminProvider>
  );
}
