'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { supabase } from '@/lib/supabase';
import AdminProvider, { useAdmin } from './AdminProvider';

const NAV = [
  {
    group: 'Core',
    items: [
      { href: '/admin', label: 'Overview', icon: '📊', ready: true, exact: true },
      { href: '/admin/users', label: 'Users', icon: '👥', ready: true },
      { href: '/admin/teachers', label: 'Teachers', icon: '📝', ready: true, badge: 'teachers' },
      { href: '/admin/access', label: 'Access & Expiry', icon: '⏳', ready: true, badge: 'expiring' },
    ],
  },
  {
    group: 'Engagement',
    items: [
      { href: '/admin/quiz', label: 'Quiz Arena', icon: '🎯', ready: true },
      { href: '/admin/progress', label: 'Learning Progress', icon: '📚', ready: true },
      { href: '/admin/schools', label: 'Schools & Classes', icon: '🏫', ready: true },
      { href: '/admin/inactive', label: 'Inactive Users', icon: '💤', ready: true },
    ],
  },
  {
    group: 'Control',
    items: [
      { href: '/admin/audit', label: 'Audit Log', icon: '🧾', ready: true },
      { href: '/admin/announcements', label: 'Announcements', icon: '📢', ready: true },
      { href: '/admin/settings', label: 'Settings', icon: '⚙️', ready: true },
    ],
  },
];

function Inner({ children }) {
  const { checking, authorized, lastUpdated, pendingTeachers, expiringSoon, toast } = useAdmin();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState(false);

  if (checking || !authorized) {
    return (
      <main className="min-h-screen bg-bull-bg text-slate-100 antialiased font-sans">
        <Navbar />
        <div className="max-w-6xl mx-auto px-6 pt-32 flex justify-center">
          <div className="space-y-4 text-center">
            <div className="w-12 h-12 border-4 border-bull-lime border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider animate-pulse font-mono">
              Securing Admin Firewall Layer...
            </p>
          </div>
        </div>
      </main>
    );
  }

  const badges = { teachers: pendingTeachers.length, expiring: expiringSoon.length };
  const isActive = (item) => (item.exact ? pathname === item.href : pathname.startsWith(item.href));

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <main className="min-h-screen bg-bull-bg text-slate-100 antialiased font-sans max-w-full overflow-x-hidden">
      <Navbar />

      {open && <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setOpen(false)} />}

      <aside
        className={`fixed left-0 top-24 bottom-0 z-40 flex flex-col border-r border-bull-line bg-bull-surface transition-all duration-200
        ${collapsed ? 'lg:w-[72px]' : 'lg:w-64'} w-64 ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {NAV.map((g) => (
            <div key={g.group} className="space-y-1">
              {!collapsed && (
                <p className="px-3 text-xs font-black uppercase tracking-widest text-slate-500 font-mono">{g.group}</p>
              )}
              {g.items.map((item) => {
                const active = item.ready && isActive(item);
                const count = item.badge ? badges[item.badge] : 0;
                const base = 'flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold transition-all';
                const inner = (
                  <>
                    <span className="text-base leading-none">{item.icon}</span>
                    {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                    {!collapsed && count > 0 && (
                      <span className="rounded-full bg-amber-400 px-1.5 py-0.5 text-xs font-black text-bull-ink">{count}</span>
                    )}
                    {!collapsed && !item.ready && (
                      <span className="rounded border border-bull-line px-1.5 py-0.5 text-xs font-black uppercase text-slate-500">Soon</span>
                    )}
                  </>
                );
                if (!item.ready) {
                  return (
                    <div key={item.href} title={collapsed ? item.label + ' (soon)' : undefined} className={`${base} cursor-not-allowed text-slate-600`}>
                      {inner}
                    </div>
                  );
                }
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    title={collapsed ? item.label : undefined}
                    className={`${base} ${active ? 'bg-bull-lime text-bull-ink shadow-md' : 'text-slate-300 hover:bg-bull-raised hover:text-white'}`}
                  >
                    {inner}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        <div className="border-t border-bull-line p-3 space-y-2">
          {!collapsed && (
            <div className="px-2 text-xs font-mono text-slate-500">
              <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              LIVE · {lastUpdated ? lastUpdated.toLocaleTimeString('en-IN') : '--'}
            </div>
          )}
          <button onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-bold text-rose-400 hover:bg-rose-950/50 cursor-pointer">
            <span>🚪</span>
            {!collapsed && <span>Logout</span>}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-bold text-slate-400 hover:bg-bull-raised hover:text-white lg:flex cursor-pointer"
          >
            <span>{collapsed ? '»' : '«'}</span>
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-4 z-30 rounded-full border border-bull-line bg-bull-surface px-4 py-3 text-sm shadow-xl lg:hidden cursor-pointer"
        aria-label="Open admin menu"
      >
        ☰ Menu
      </button>

      <div className={`pt-24 pb-20 transition-all duration-200 ${collapsed ? 'lg:pl-[72px]' : 'lg:pl-64'}`}>
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 animate-fadeInFast">{children}</div>
      </div>

      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 max-w-sm rounded-xl border px-4 py-3 text-xs font-bold shadow-2xl ${
          toast.type === 'error' ? 'border-rose-800 bg-rose-950 text-rose-300' : 'border-emerald-800 bg-emerald-950 text-emerald-300'
        }`}>
          {toast.message}
        </div>
      )}
    </main>
  );
}

export default function AdminShell({ children }) {
  return (
    <AdminProvider>
      <Inner>{children}</Inner>
    </AdminProvider>
  );
}