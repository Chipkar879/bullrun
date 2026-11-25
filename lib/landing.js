import { supabase } from '@/lib/supabase';

// Decides where a user lands after signup or sign-in.
// Fewer than the required modules finished -> /modules, otherwise -> /simulator.
// Progress is read from the same localStorage key the modules page writes.
const PROGRESS_KEY = 'bullrun_module_progress';

export async function getLandingPath() {
  try {
    const res = await fetch('/api/onboarding-modules', { cache: 'no-store' });
    if (!res.ok) return '/modules';
    const data = await res.json();
    const required = Array.isArray(data.required) ? data.required : [];
    if (required.length === 0) return '/modules';

    let done = [];
    try { done = JSON.parse(window.localStorage.getItem(PROGRESS_KEY) || '[]'); } catch (e) {}
    if (!Array.isArray(done)) done = [];

    return required.every((id) => done.includes(id)) ? '/simulator' : '/modules';
  } catch (e) {
    return '/modules';
  }
}

export async function goToLanding() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data: me } = await supabase.from('profiles').select('role').eq('id', session.user.id).maybeSingle();
      if (me && (me.role === 'school_admin' || me.role === 'teacher')) {
        window.location.href = '/school';
        return;
      }
    }
  } catch (e) {}
  const path = await getLandingPath();
  window.location.href = path;
}