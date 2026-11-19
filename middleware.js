import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPER_ADMIN_EMAIL = 'vikrantchipkar7@gmail.com';

export async function middleware(req) {
  const res = NextResponse.next();
  const { pathname } = req.nextUrl;

  // 1. Static files & internal assets always pass
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon.ico') ||
    pathname === '/icon.svg' ||
    pathname === '/apple-icon.png' ||
    pathname.startsWith('/opengraph-image') ||
    pathname.startsWith('/twitter-image') ||
    pathname === '/sitemap.xml' ||
    pathname === '/robots.txt' ||
    pathname === '/manifest.webmanifest'
  ) {
    return res;
  }

  // 2. Open public pages
  const isAlwaysAllowedPage =
    pathname === '/' ||
    pathname.startsWith('/pricing') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/auth');

  // 3. Extract the auth token from cookies
  const allCookies = req.cookies.getAll();
  const authCookie = allCookies.find((c) =>
    c.name.includes('-auth-token') || c.name.startsWith('sb-')
  );

  let user = null;
  let accessToken = null;

  if (authCookie) {
    try {
      let rawVal = authCookie.value;
      if (rawVal.startsWith('base64-')) {
        rawVal = Buffer.from(rawVal.replace('base64-', ''), 'base64').toString('utf-8');
      }
      const parsed = JSON.parse(rawVal);
      accessToken = Array.isArray(parsed) ? parsed[0] : parsed?.access_token || parsed;

      if (accessToken && typeof accessToken === 'string') {
        const supabaseAuth = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        );
        const { data } = await supabaseAuth.auth.getUser(accessToken);
        user = data?.user || null;
      }
    } catch {
      user = null;
    }
  }

  // NOT LOGGED IN
  if (!user) {
    if (isAlwaysAllowedPage) return res;
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/signup';
    loginUrl.searchParams.set('mode', 'login');
    return NextResponse.redirect(loginUrl);
  }

  // SUPER ADMIN IMMUNITY
  if (user.email === SUPER_ADMIN_EMAIL) {
    return res;
  }

  // QUERY PROFILE WITH USER'S AUTH HEADER (Bypasses RLS blocks)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    }
  );

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_frozen, is_premium, access_expires_at, created_at, role')
    .eq('id', user.id)
    .maybeSingle();

  if (profile) {
    if (profile.role === 'admin') return res;

    let expiryMs;
    if (profile.access_expires_at) {
      expiryMs = new Date(profile.access_expires_at).getTime();
    } else {
      const createdAtMs = profile.created_at ? new Date(profile.created_at).getTime() : Date.now();
      expiryMs = createdAtMs + 7 * 24 * 60 * 60 * 1000;
    }

    const hasPremium = Boolean(profile.is_premium);
    const isTrialExpired = Date.now() >= expiryMs && !hasPremium;
    
    // HARD ENFORCEMENT: If is_frozen is TRUE in Supabase, BLOCK IMMEDIATELY
    const isFrozen = Boolean(profile.is_frozen) || isTrialExpired;

    if (isFrozen) {
      const isAllowedForFrozenUser = pathname === '/' || pathname.startsWith('/pricing');
      if (!isAllowedForFrozenUser) {
        const pricingUrl = req.nextUrl.clone();
        pricingUrl.pathname = '/pricing';
        return NextResponse.redirect(pricingUrl);
      }
    }
  }

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};