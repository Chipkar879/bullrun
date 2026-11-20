// Server-only Supabase helpers. The service-role key must NEVER be put in a NEXT_PUBLIC_ variable.
import { createClient } from '@supabase/supabase-js';

export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Server is missing SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

// Reads the logged-in user from the "Authorization: Bearer <token>" header
export async function userFromRequest(req, admin) {
  const header = req.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data || !data.user) return null;
  return data.user;
}
