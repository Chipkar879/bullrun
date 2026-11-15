import { SITE_URL } from '@/lib/site';

export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Logged-in areas: crawlers would only be redirected to /signup
        disallow: ['/api/', '/admin/', '/auth/', '/profile', '/simulator', '/arena', '/quiz', '/modules', '/leaderboard'],
      },
    ],
    sitemap: SITE_URL + '/sitemap.xml',
  };
}
