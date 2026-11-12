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

export function goToLanding() {
  getLandingPath().then((path) => { window.location.href = path; });
}