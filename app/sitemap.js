export default async function sitemap() {
  const baseUrl = 'https://stockbazaar.vercel.app';

  // Define your platform's static route endpoints
  const routes = [
    '',
    '/simulator',
    '/quiz',
    '/modules',
    '/leaderboard',
    '/pricing',
  ];

  // Map them into the formal sitemap XML layout structure
  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString(),
    changeFrequency: route === '/leaderboard' || route === '/quiz' ? 'daily' : 'weekly',
    priority: route === '' ? 1.0 : 0.8,
  }));
}