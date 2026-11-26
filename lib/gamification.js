export const BB_TO_CASH = 2;
export const MIN_BB = 10;
export const CAP_BB = 1000;

export const LEVELS = [
  { min: 0, name: 'Calf' },
  { min: 300, name: 'Grazer' },
  { min: 800, name: 'Young Bull' },
  { min: 1600, name: 'Charger' },
  { min: 2800, name: 'Market Bull' },
  { min: 4500, name: 'Trend Spotter' },
  { min: 6800, name: 'Chart Master' },
  { min: 9500, name: 'Bull Rider' },
  { min: 12500, name: 'Wall Street Bull' },
  { min: 16000, name: 'Market Legend' },
  { min: 19500, name: 'Bull Run Hero' },
  { min: 23000, name: 'Bull Run Champion' },
];

export function levelFor(xp) {
  let i = 0;
  LEVELS.forEach((l, k) => { if (xp >= l.min) i = k; });
  const cur = LEVELS[i];
  const next = LEVELS[i + 1] || null;
  return {
    index: i,
    name: cur.name,
    next: next ? next.name : null,
    pct: next ? Math.round(((xp - cur.min) / (next.min - cur.min)) * 100) : 100,
    toNext: next ? next.min - xp : 0,
  };
}

export const AVATARS = [
  { id: 'calf', name: 'Bull calf', emoji: '\u{1F402}', from: '#B7F34A', to: '#19C6B4', minLevel: 0 },
  { id: 'fox', name: 'Fox', emoji: '\u{1F98A}', from: '#FFB347', to: '#FF765E', minLevel: 0 },
  { id: 'panda', name: 'Panda', emoji: '\u{1F43C}', from: '#CBD5E1', to: '#64748B', minLevel: 0 },
  { id: 'penguin', name: 'Penguin', emoji: '\u{1F427}', from: '#38BDF8', to: '#6366F1', minLevel: 0 },
  { id: 'octopus', name: 'Octopus', emoji: '\u{1F419}', from: '#B28DFF', to: '#FF5C8A', minLevel: 0 },
  { id: 'owl', name: 'Owl', emoji: '\u{1F989}', from: '#FBBF24', to: '#92400E', minLevel: 0 },
  { id: 'robot', name: 'Robot', emoji: '\u{1F916}', from: '#94A3B8', to: '#38BDF8', minLevel: 1 },
  { id: 'frog', name: 'Frog', emoji: '\u{1F438}', from: '#86EFAC', to: '#16A34A', minLevel: 1 },
  { id: 'dino', name: 'Dino', emoji: '\u{1F995}', from: '#A3E635', to: '#15803D', minLevel: 2 },
  { id: 'shark', name: 'Shark', emoji: '\u{1F988}', from: '#22D3EE', to: '#1D4ED8', minLevel: 2 },
  { id: 'alien', name: 'Alien', emoji: '\u{1F47D}', from: '#3DF2C0', to: '#6D28D9', minLevel: 3 },
  { id: 'tiger', name: 'Tiger', emoji: '\u{1F42F}', from: '#FDBA74', to: '#EA580C', minLevel: 3 },
  { id: 'rocket', name: 'Rocket', emoji: '\u{1F680}', from: '#FF765E', to: '#7C3AED', minLevel: 4 },
  { id: 'unicorn', name: 'Unicorn', emoji: '\u{1F984}', from: '#F9A8D4', to: '#818CF8', minLevel: 4 },
  { id: 'lion', name: 'Lion', emoji: '\u{1F981}', from: '#FCD34D', to: '#B45309', minLevel: 5 },
  { id: 'dragon', name: 'Dragon', emoji: '\u{1F409}', from: '#F43F5E', to: '#F59E0B', minLevel: 6 },
  { id: 'ghost', name: 'Ghost', emoji: '\u{1F47B}', from: '#E2E8F0', to: '#8B5CF6', minLevel: 7 },
  { id: 'eagle', name: 'Eagle', emoji: '\u{1F985}', from: '#FDE047', to: '#92400E', minLevel: 8 },
  { id: 'golden', name: 'Golden bull', emoji: '\u{1F402}', from: '#FDE68A', to: '#F59E0B', minLevel: 9 },
  { id: 'diamond', name: 'Diamond', emoji: '\u{1F48E}', from: '#67E8F9', to: '#C084FC', minLevel: 11 },
];
export const avatarById = (id) => AVATARS.find((a) => a.id === id) || AVATARS[0];

export const RARITY = {
  common: { label: 'Common', color: '#94A3B8' },
  rare: { label: 'Rare', color: '#38BDF8' },
  epic: { label: 'Epic', color: '#B28DFF' },
  legendary: { label: 'Legendary', color: '#FBBF24' },
};

const PAL = [
  ['#B7F34A', '#19C6B4'], ['#FFB347', '#FF765E'], ['#38BDF8', '#6366F1'], ['#B28DFF', '#FF5C8A'],
  ['#FBBF24', '#F97316'], ['#3DF2C0', '#6D28D9'], ['#F43F5E', '#F59E0B'], ['#86EFAC', '#15803D'],
];
const b = (id, name, hint, icon, rarity, c) => ({ id, name, hint, icon, rarity, c });
const MODULE_ICONS = ['\u{1F4D8}', '\u{1F4B0}', '\u{1F4CA}', '\u{1F3E6}', '\u{1F9E0}', '\u{1F30D}', '\u{1F9EE}', '\u{1F6E1}\uFE0F', '\u{1F4F0}', '\u{1F9ED}', '\u{1F3C6}', '\u{1F451}'];
const moduleBadges = MODULE_ICONS.map((icon, i) =>
  b('module_' + (i + 1), 'Module ' + (i + 1) + ' done', 'Finish every lesson in Module ' + (i + 1), icon, i >= 11 ? 'legendary' : i >= 7 ? 'epic' : 'rare', PAL[i % PAL.length])
);

export const BADGES = [
  b('first_lesson', 'First lesson', 'Pass any lesson quiz', '\u{1F4D6}', 'common', PAL[0]),
  b('ten_lessons', 'Bookworm', 'Pass 10 lessons', '\u{1F4DA}', 'common', PAL[2]),
  b('fifty_lessons', 'Scholar', 'Pass 50 lessons', '\u{1F393}', 'rare', PAL[3]),
  b('hundred_lessons', 'Professor', 'Pass 100 lessons', '\u{1F9D9}', 'epic', PAL[5]),
  b('all_lessons', 'Market master', 'Pass every lesson', '\u{1F31F}', 'legendary', PAL[4]),
  ...moduleBadges,
  b('first_trade', 'First trade', 'Make your first practice trade', '\u{1F6D2}', 'common', PAL[1]),
  b('ten_trades', 'Active trader', 'Make 10 trades', '\u{1F501}', 'common', PAL[2]),
  b('fifty_trades', 'Busy bull', 'Make 50 trades', '\u{1F402}', 'rare', PAL[6]),
  b('hundred_trades', 'Trading machine', 'Make 100 trades', '\u{1F916}', 'epic', PAL[5]),
  b('diversified', 'Diversified', 'Trade in 3 different sectors', '\u{1F9FA}', 'common', PAL[7]),
  b('sector_5', 'Sector explorer', 'Trade in 5 different sectors', '\u{1F5FA}\uFE0F', 'rare', PAL[3]),
  b('in_profit', 'In the green', 'Grow your net worth above the starting amount', '\u{1F4C8}', 'common', PAL[0]),
  b('lakhpati', 'Lakhpati', 'Reach a net worth of 1,00,000', '\u{1F4B8}', 'epic', PAL[4]),
  b('perfect_quiz', 'Perfect quiz', 'Score full marks on a daily quiz', '\u{1F3AF}', 'rare', PAL[1]),
  b('quiz_10', 'Quiz regular', 'Play the daily quiz on 10 days', '\u{1F9E9}', 'common', PAL[2]),
  b('quiz_30', 'Quiz champion', 'Play the daily quiz on 30 days', '\u{1F3C5}', 'epic', PAL[3]),
  b('streak_3', '3-day streak', 'Play the daily quiz 3 days in a row', '\u{1F525}', 'common', PAL[6]),
  b('streak_7', '7-day streak', 'Play the daily quiz 7 days in a row', '\u26A1', 'rare', PAL[4]),
  b('streak_30', '30-day streak', 'Play the daily quiz 30 days in a row', '\u{1F30B}', 'legendary', PAL[6]),
  b('bb_converter', 'Bucks to cash', 'Convert Bazaar Bucks into practice cash', '\u{1FA99}', 'common', PAL[4]),
];