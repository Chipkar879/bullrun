// Rank is earned from total XP (lessons, quizzes, trades). Change the numbers here to rebalance.
// c = [light, mid, dark] metal colours used by the badge.
export const RANKS = [
  { id: 'silver-1',     name: 'Silver 1',     tier: 'Silver',     min: 0,     chevrons: 1, c: ['#f1f5f9', '#b6c2d0', '#64748b'] },
  { id: 'silver-2',     name: 'Silver 2',     tier: 'Silver',     min: 300,   chevrons: 2, c: ['#f1f5f9', '#b6c2d0', '#64748b'] },
  { id: 'gold-1',       name: 'Gold 1',       tier: 'Gold',       min: 800,   chevrons: 1, c: ['#fef3c7', '#f5b92e', '#b45309'] },
  { id: 'gold-2',       name: 'Gold 2',       tier: 'Gold',       min: 1500,  chevrons: 2, c: ['#fef3c7', '#f5b92e', '#b45309'] },
  { id: 'platinum-1',   name: 'Platinum 1',   tier: 'Platinum',   min: 2500,  chevrons: 1, c: ['#cffafe', '#4fd1d9', '#0e7490'] },
  { id: 'platinum-2',   name: 'Platinum 2',   tier: 'Platinum',   min: 4000,  chevrons: 2, c: ['#cffafe', '#4fd1d9', '#0e7490'] },
  { id: 'diamond-1',    name: 'Diamond 1',    tier: 'Diamond',    min: 6000,  chevrons: 1, c: ['#ede9fe', '#a78bfa', '#6d28d9'] },
  { id: 'diamond-2',    name: 'Diamond 2',    tier: 'Diamond',    min: 9000,  chevrons: 2, c: ['#ede9fe', '#a78bfa', '#6d28d9'] },
  { id: 'ascendant-1',  name: 'Ascendant 1',  tier: 'Ascendant',  min: 13000, chevrons: 1, c: ['#d1fae5', '#34d399', '#047857'] },
  { id: 'ascendant-2',  name: 'Ascendant 2',  tier: 'Ascendant',  min: 18000, chevrons: 2, c: ['#d1fae5', '#34d399', '#047857'] },
  { id: 'immortal',     name: 'Immortal',     tier: 'Immortal',   min: 25000, chevrons: 3, c: ['#ffe4e6', '#fb4a6a', '#9f1239'] },
  { id: 'radiant',      name: 'Radiant',      tier: 'Radiant',    min: 35000, chevrons: 0, c: ['#fffbe0', '#ffe14d', '#f59e0b'], star: true },
];

export function getRank(xp) {
  const v = Math.max(0, Number(xp) || 0);
  let i = 0;
  for (let k = 0; k < RANKS.length; k += 1) if (v >= RANKS[k].min) i = k;
  const cur = RANKS[i];
  const next = RANKS[i + 1] || null;
  const pct = next ? Math.min(100, Math.round(((v - cur.min) / (next.min - cur.min)) * 100)) : 100;
  return { index: i, rank: cur, next, pct, toNext: next ? next.min - v : 0 };
}
