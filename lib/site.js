// Single source of truth for the public site address and SEO text.
// To change the domain: set NEXT_PUBLIC_SITE_URL in Vercel (and .env.local), or edit the fallback below.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://bullrun-arena.vercel.app').replace(/\/$/, '');
export const SITE_NAME = 'Bull Run';
export const SITE_TITLE = 'Bull Run: Stock Market Game for Students in India';
export const SITE_DESCRIPTION =
  'Learn investing risk-free. Bull Run is a paper trading game for students in India with simulated prices, daily quizzes, school leaderboards and lessons.';

const graph = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'Organization', '@id': SITE_URL + '/#org', name: SITE_NAME, url: SITE_URL },
    { '@type': 'WebSite', '@id': SITE_URL + '/#website', url: SITE_URL, name: SITE_NAME, inLanguage: 'en-IN', publisher: { '@id': SITE_URL + '/#org' } },
    {
      '@type': 'WebApplication',
      name: SITE_NAME,
      url: SITE_URL,
      applicationCategory: 'EducationalApplication',
      operatingSystem: 'Any',
      description: SITE_DESCRIPTION,
      inLanguage: 'en-IN',
      audience: { '@type': 'PeopleAudience', suggestedMinAge: 13, suggestedMaxAge: 18 },
    },
  ],
};
// "<" is escaped so the JSON can never close the script tag early
export const JSON_LD = JSON.stringify(graph).split('<').join('\\u003c');
