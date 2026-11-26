export const BB_TO_CASH = 2;
export const MIN_BB = 10;
export const CAP_BB = 1000;

export const LEVELS = [
  { min: 0, name: 'Calf' },
  { min: 200, name: 'Young Bull' },
  { min: 600, name: 'Market Bull' },
  { min: 1500, name: 'Bull Run Champion' },
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
  { id: 'dino', name: 'Dino', emoji: '\u{1F995}', from: '#86EFAC', to: '#15803D', minLevel: 1 },
  { id: 'alien', name: 'Alien', emoji: '\u{1F47D}', from: '#3DF2C0', to: '#6D28D9', minLevel: 2 },
  { id: 'rocket', name: 'Rocket', emoji: '\u{1F680}', from: '#FF765E', to: '#7C3AED', minLevel: 2 },
  { id: 'dragon', name: 'Dragon', emoji: '\u{1F409}', from: '#F43F5E', to: '#F59E0B', minLevel: 2 },
  { id: 'golden', name: 'Golden bull', emoji: '\u{1F402}', from: '#FDE68A', to: '#F59E0B', minLevel: 3 },
];
export const avatarById = (id) => AVATARS.find((a) => a.id === id) || AVATARS[0];

export const BADGES = [
  { id: 'first_lesson', name: 'First lesson', hint: 'Pass any lesson quiz', icon: '\u{1F4D6}' },
  { id: 'module_1', name: 'Module 1 done', hint: 'Finish every lesson in Module 1', icon: '\u{1F393}' },
  { id: 'first_trade', name: 'First trade', hint: 'Make your first practice trade', icon: '\u{1F6D2}' },
  { id: 'ten_trades', name: 'Active trader', hint: 'Make 10 trades', icon: '\u{1F501}' },
  { id: 'diversified', name: 'Diversified', hint: 'Trade in 3 different sectors', icon: '\u{1F9FA}' },
  { id: 'in_profit', name: 'In the green', hint: 'Grow your net worth above the starting amount', icon: '\u{1F4C8}' },
  { id: 'perfect_quiz', name: 'Perfect quiz', hint: 'Score full marks on a daily quiz', icon: '\u{1F3AF}' },
  { id: 'streak_3', name: '3-day streak', hint: 'Play the daily quiz 3 days in a row', icon: '\u{1F525}' },
  { id: 'streak_7', name: '7-day streak', hint: 'Play the daily quiz 7 days in a row', icon: '\u26A1' },
];