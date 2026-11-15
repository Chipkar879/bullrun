import { SITE_URL } from '@/lib/site';

// Only public pages belong here. Everything else needs a login and redirects to /signup.
export default function sitemap() {
  const lastModified = new Date();
  return ['', '/pricing'].map((route) => ({
    url: SITE_URL + route,
    lastModified,
  }));
}
