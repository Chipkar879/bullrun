// Arena game rules. Pure functions: no screen code here, so the numbers are easy to change.

export const START_CASH = 10000;
export const DAYS = 30;
export const MODES = {
  blitz: { id: 'blitz', name: 'Blitz', daySecs: 5, blurb: 'About 2.5 minutes', rivalBoost: 1 },
  classic: { id: 'classic', name: 'Classic', daySecs: 9, blurb: 'About 4.5 minutes', rivalBoost: 1.6 },
};
const NEWS_EVERY = 11; // seconds between headlines
const NEWS_DELAY = 5; // seconds to react before a headline hits the price
const WIN_MIN = 50; // a closed position must earn this much to count as a win
const MISSION_POINTS = 150;

const STOCKS = [
  ['TECH', 'TechCorp Inc.', 1250, '\u{1F4BB}', 'Cybernetics', 'Next-gen AI neural chip developer expanding across global markets.'],
  ['GRN', 'GreenEnergy Co.', 380, '\u{26A1}', 'Clean Tech', 'Harnessing fusion solar power plants for zero-emission energy.'],
  ['MOON', 'AeroSpace Ltd.', 2340, '\u{1F680}', 'Space Infra', 'Building asteroid mining shuttles and lunar orbital stations.'],
  ['CHIP', 'SemiconductorX', 760, '\u{1F52C}', 'Hardware', 'Manufacturing 1nm micro-quantum processors for autonomous tech.'],
  ['ZOM', 'ZombieGames', 710, '\u{1F3AE}', 'Gaming & VR', 'Creators of a huge full-immersion metaverse game.'],
  ['FOOD', 'FoodieHub', 425, '\u{1F355}', 'Consumer', 'Autonomous drone food delivery service operating in 100+ cities.'],
  ['BANK', 'DigitalBank Ltd.', 1860, '\u{1F3E6}', 'FinTech', 'Instant payment settlement network for young users.'],
  ['EDU', 'EduTech Corp.', 312, '\u{1F393}', 'EdTech', 'AI tutors customising learning pathways for millions of students.'],
  ['SPORT', 'SportXcel', 584, '\u{1F3C6}', 'Athletics', 'Smart athletic gear tracking performance live.'],
  ['PHARMA', 'PharmaCorp', 1120, '\u{1F9EA}', 'Biotech', 'Gene-editing therapies and health diagnostics.'],
];

// [headline, company, price effect]
const NEWS = [
  ['Tech sector boom', 'TECH', 0.22], ['AI breakthrough announced', 'TECH', 0.3], ['Autonomous robot launch', 'TECH', 0.18],
  ['Quantum computing milestone', 'TECH', 0.26], ['Major data centre outage', 'TECH', -0.16], ['Global cloud server crash', 'TECH', -0.22],
  ['Chip shortage hits factories', 'CHIP', -0.18], ['1nm chip breakthrough', 'CHIP', 0.28], ['Foundry fire reported', 'CHIP', -0.22],
  ['AI computer demand explodes', 'CHIP', 0.24], ['Rocket launch successful', 'MOON', 0.28], ['Asteroid mining contract won', 'MOON', 0.32],
  ['Space station funding approved', 'MOON', 0.2], ['Space debris hits shuttle', 'MOON', -0.24], ['Fusion reactor passes safety test', 'GRN', 0.26],
  ['Solar record broken', 'GRN', 0.22], ['Battery subsidy approved', 'GRN', 0.18], ['Rare mineral supply delayed', 'GRN', -0.14],
  ['Game hits 100M players', 'ZOM', 0.3], ['VR headset sold out', 'ZOM', 0.21], ['Game delayed after bug backlash', 'ZOM', -0.19],
  ['Esports final breaks viewing record', 'ZOM', 0.16], ['Food trend goes viral', 'FOOD', 0.24], ['Delivery drones approved', 'FOOD', 0.27],
  ['Delivery worker strike', 'FOOD', -0.17], ['Cyberattack reported', 'BANK', -0.15], ['Payments cross 1 billion', 'BANK', 0.24],
  ['Interest rate change lifts margins', 'BANK', 0.17], ['Compliance audit brings a fine', 'BANK', -0.13], ['Gene-editing trial succeeds', 'PHARMA', 0.32],
  ['Diagnostic tool approved', 'PHARMA', 0.24], ['Drug patent rejected', 'PHARMA', -0.21], ['AI tutor subscriptions surge', 'EDU', 0.23],
  ['University partnership signed', 'EDU', 0.19], ['Servers crash in exam week', 'EDU', -0.14], ['Pro league adopts smart wear', 'SPORT', 0.26],
  ['Tracker shoe goes viral', 'SPORT', 0.21], ['Shoe launch delayed', 'SPORT', -0.15], ['Bull rally sweeps every sector', 'ALL', 0.12],
  ['Market-wide pull-back', 'ALL', -0.1],
];

// Computer rivals. "low" and "high" set where each one tends to finish.
const RIVALS = [
  { id: 'apex', name: 'ApexTrader', icon: '\u{1F981}', low: 13200, high: 16800 },
  { id: 'diamond', name: 'DiamondHands', icon: '\u{1F48E}', low: 12000, high: 14200 },
  { id: 'whale', name: 'CyberWhale', icon: '\u{1F40B}', low: 11000, high: 12600 },
  { id: 'paper', name: 'PaperTrader', icon: '\u{1F4C4}', low: 8800, high: 10800 },
];

export const MISSIONS = [
  { id: 'wins', icon: '\u{1F4B0}', text: 'Close 3 winning positions', goal: 3, read: (s) => s.stats.wins },
  { id: 'spread', icon: '\u{1F9FA}', text: 'Own 4 companies at once', goal: 4, read: (s) => s.stats.maxOwned },
  { id: 'news', icon: '\u{1F4F0}', text: 'Hold a company when its good news comes true', goal: 1, read: (s) => s.stats.newsHits },
  { id: 'dodge', icon: '\u{1F6E1}\u{FE0F}', text: 'Sell before bad news comes true', goal: 1, read: (s) => s.stats.dodges },
  { id: 'rich', icon: '\u{1F680}', text: 'Reach a net worth of 12,000', goal: 12000, read: (s) => s.stats.peak },
  { id: 'streak', icon: '\u{1F525}', text: 'Win 3 times in a row', goal: 3, read: (s) => s.stats.bestStreak },
  { id: 'big', icon: '\u{1F3AF}', text: 'Earn 500 on a single position', goal: 500, read: (s) => s.stats.bestTrade },
];

export const TROPHIES = [
  { id: 'first', icon: '\u{1F947}', name: 'First Win', hint: 'Close a winning position', test: (s) => s.stats.wins >= 1 },
  { id: 'hot', icon: '\u{1F525}', name: 'Hot Streak', hint: '3 wins in a row', test: (s) => s.stats.bestStreak >= 3 },
  { id: 'unstoppable', icon: '\u{26A1}', name: 'Unstoppable', hint: '5 wins in a row', test: (s) => s.stats.bestStreak >= 5 },
  { id: 'hawk', icon: '\u{1F985}', name: 'News Hawk', hint: 'Ride 3 true headlines in one match', test: (s) => s.stats.newsHits >= 3 },
  { id: 'spread', icon: '\u{1F9FA}', name: 'Diversifier', hint: 'Own 5 companies at once', test: (s) => s.stats.maxOwned >= 5 },
  { id: 'club', icon: '\u{1F48E}', name: '15K Club', hint: 'Finish with 15,000 or more', test: (s, worth) => worth >= 15000 },
  { id: 'champ', icon: '\u{1F451}', name: 'Arena Champion', hint: 'Finish in 1st place', test: (s, worth, place) => place === 1 },
  { id: 'master', icon: '\u{1F31F}', name: 'Mission Master', hint: 'Complete all 3 missions', test: (s) => s.missions.every((m) => m.done) },
];

// Small repeatable random generator, so the reducer stays pure
function makeRng(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.between = (lo, hi) => lo + (hi - lo) * next();
  next.seed = () => a;
  return next;
}

export const money = (n) => '\u{20B9}' + Math.round(n).toLocaleString('en-IN');
export const signed = (n) => (n < 0 ? '-' : '+') + money(Math.abs(n));

export const holdingsValue = (s) =>
  Object.keys(s.holdings).reduce((sum, sym) => sum + s.holdings[sym].shares * s.stocks.find((x) => x.sym === sym).price, 0);
export const netWorth = (s) => s.cash + holdingsValue(s);

export function standings(s) {
  return [...s.rivals, { id: 'you', name: 'You', icon: '\u{1F402}', worth: netWorth(s) }].sort((a, b) => b.worth - a.worth);
}
const placeOf = (s) => standings(s).findIndex((p) => p.id === 'you') + 1;

export const multiplier = (streak) => Math.min(5, Math.max(1, streak));
export const finalScore = (s) => s.bonus + Math.max(0, Math.round((netWorth(s) - START_CASH) / 10));
export const gradeFor = (worth) =>
  worth >= 18000 ? 'S' : worth >= 14500 ? 'A' : worth >= 12000 ? 'B' : worth >= START_CASH ? 'C' : 'D';

export function newGame(mode = 'blitz', seed = 1) {
  const rng = makeRng(seed);
  const stocks = STOCKS.map(([sym, name, price, icon, sector, desc]) => {
    const history = [];
    let p = price;
    for (let i = 0; i < 24; i += 1) {
      history.unshift(Math.round(p));
      p *= 1 + rng.between(-0.012, 0.012);
    }
    return { sym, name, price, base: price, prevClose: price, icon, sector, desc, history, drift: rng.between(-0.006, 0.006) };
  });
  const pool = MISSIONS.map((m) => m.id);
  const missions = [];
  while (missions.length < 3) missions.push({ id: pool.splice(Math.floor(rng() * pool.length), 1)[0], done: false });
  const rivals = RIVALS.map((r) => ({ id: r.id, name: r.name, icon: r.icon, worth: START_CASH, target: Math.round(START_CASH + (rng.between(r.low, r.high) - START_CASH) * MODES[mode].rivalBoost), wobble: 0 }));

  return {
    phase: 'RUNNING', mode, clock: 0, day: 1, secsLeft: MODES[mode].daySecs,
    cash: START_CASH, holdings: {}, stocks, rivals, missions,
    news: null, flash: null, streak: 0, bonus: 0, bestPlace: 5,
    stats: { trades: 0, wins: 0, losses: 0, bestStreak: 0, bestTrade: 0, peak: START_CASH, maxOwned: 0, newsHits: 0, dodges: 0, fooled: 0 },
    toasts: [], fx: [], nextId: 1, party: 0, result: null, seed: rng.seed(),
  };
}

function say(s, text, tone, sound) {
  s.toasts = [...s.toasts.slice(-2), { id: s.nextId, text, tone, until: s.clock + 3 }];
  if (sound) s.fx = [...s.fx.slice(-5), { id: s.nextId, name: sound }];
  s.nextId += 1;
}

// Checks missions and overtakes after anything changes
function settle(s) {
  const worth = netWorth(s);
  s.stats = { ...s.stats, peak: Math.max(s.stats.peak, worth), maxOwned: Math.max(s.stats.maxOwned, Object.keys(s.holdings).length) };
  s.missions = s.missions.map((m) => {
    if (m.done) return m;
    const rule = MISSIONS.find((x) => x.id === m.id);
    if (rule.read(s) < rule.goal) return m;
    s.bonus += MISSION_POINTS;
    s.party += 1;
    say(s, 'Mission complete: ' + rule.text + ' (+' + MISSION_POINTS + ' points)', 'gold', 'mission');
    return { ...m, done: true };
  });
  const place = placeOf(s);
  if (s.clock > 5 && place < s.bestPlace && worth > START_CASH) {
    const passed = standings(s)[place];
    s.bestPlace = place;
    say(s, place === 1 ? 'You took 1st place!' : 'You passed ' + passed.name + '!', 'gold', 'overtake');
    if (place === 1) s.party += 1;
  }
}

function movePrice(st, change) {
  const price = Math.max(10, Math.round(st.price * (1 + change)));
  return { ...st, price, history: [...st.history.slice(1), price] };
}

function tick(s, rng) {
  s.clock += 1;
  s.toasts = s.toasts.filter((t) => t.until > s.clock);
  if (s.flash && s.flash.until <= s.clock) s.flash = null;

  // Prices follow short trends with some noise, and are gently pulled back towards their start
  s.stocks = s.stocks.map((st) => {
    const drift = rng() < 0.08 ? rng.between(-0.008, 0.008) : st.drift;
    const pull = ((st.base - st.price) / st.base) * 0.004;
    return { ...movePrice(st, drift + pull + rng.between(-0.012, 0.012)), drift };
  });

  // A pending headline reaches the market
  if (s.news && s.clock >= s.news.hitsAt) {
    const n = s.news;
    const real = n.real;
    const effect = real ? n.pct * 0.5 : -n.pct * 0.45;
    s.stocks = s.stocks.map((st) => (n.sym === 'ALL' || st.sym === n.sym ? movePrice(st, effect) : st));
    const holds = n.sym === 'ALL' ? Object.keys(s.holdings).length > 0 : !!s.holdings[n.sym];
    if (real && n.pct > 0 && holds) s.stats = { ...s.stats, newsHits: s.stats.newsHits + 1 };
    if (real && n.pct < 0 && n.sold) s.stats = { ...s.stats, dodges: s.stats.dodges + 1 };
    if (!real && n.pct > 0 && holds) s.stats = { ...s.stats, fooled: s.stats.fooled + 1 };
    s.flash = { real, up: effect > 0, sym: n.sym, text: n.text, until: s.clock + 3 };
    s.fx = [...s.fx.slice(-5), { id: s.nextId, name: effect > 0 ? 'newsUp' : 'newsDown' }];
    s.nextId += 1;
    s.news = null;
  }

  // A new headline breaks (not in the last few seconds, so there is always time to react)
  const secsToEnd = (DAYS - s.day) * MODES[s.mode].daySecs + s.secsLeft;
  if (!s.news && s.clock % NEWS_EVERY === 4 && secsToEnd > NEWS_DELAY + 1) {
    const [text, sym, pct] = NEWS[Math.floor(rng() * NEWS.length)];
    const confirmed = rng() < 0.5;
    s.news = { text, sym, pct, confirmed, real: rng() < (confirmed ? 0.9 : 0.55), hitsAt: s.clock + NEWS_DELAY, held: Object.keys(s.holdings), sold: false };
    s.flash = null;
    s.fx = [...s.fx.slice(-5), { id: s.nextId, name: 'alert' }];
    s.nextId += 1;
  }

  // Rivals drift towards their finishing value
  const total = DAYS * MODES[s.mode].daySecs;
  const done = Math.min(1, s.clock / total);
  s.rivals = s.rivals.map((r) => {
    const wobble = r.wobble * 0.9 + rng.between(-160, 160);
    return { ...r, wobble, worth: Math.round(START_CASH + (r.target - START_CASH) * done + wobble * Math.min(1, s.clock / 15)) };
  });

  s.secsLeft -= 1;
  let ended = false;
  if (s.secsLeft <= 0) {
    if (s.day >= DAYS) ended = true;
    else {
      s.day += 1;
      s.secsLeft = MODES[s.mode].daySecs;
      // The close is taken just before the latest move, so a new day never starts flat at 0.00%
      s.stocks = s.stocks.map((st) => ({ ...st, prevClose: st.history[st.history.length - 2] }));
      if (s.day === DAYS - 4) say(s, 'Final 5 days! Make them count.', 'gold', 'alert');
    }
  }

  settle(s);

  if (ended) {
    const worth = netWorth(s);
    const place = placeOf(s);
    s.phase = 'FINISHED';
    s.secsLeft = 0;
    s.news = null;
    s.toasts = [];
    s.result = {
      worth,
      place,
      score: finalScore(s),
      grade: gradeFor(worth),
      trophies: TROPHIES.filter((t) => t.test(s, worth, place)).map((t) => t.id),
      tip: coachTip(s),
    };
    if (place <= 2) s.party += 1;
    s.fx = [...s.fx.slice(-5), { id: s.nextId, name: 'finish' }];
    s.nextId += 1;
  }
}

function coachTip(s) {
  if (s.stats.trades === 0) return 'You watched from the side. Try buying one company when confirmed good news breaks.';
  if (s.stats.fooled >= 2) return 'Rumours caught you out. Check whether news is Confirmed before putting in a lot of money.';
  if (s.stats.maxOwned <= 1) return 'You kept everything in one company. Spreading money out softens a bad headline.';
  if (s.stats.losses > s.stats.wins) return 'More losses than wins. Decide your selling point before you buy.';
  return 'Good control. Next match, try taking profits a little earlier to build longer win streaks.';
}

// size: share of cash to spend (0.25, 0.5, 1). qty: exact number of units.
export function reducer(state, action) {
  if (action.type === 'start') return newGame(action.mode, action.seed);
  if (action.type === 'quit') return null;
  if (!state || state.phase !== 'RUNNING') return state;
  const s = { ...state };
  const rng = makeRng(s.seed);

  if (action.type === 'tick') {
    tick(s, rng);
    s.seed = rng.seed();
    return s;
  }

  const st = s.stocks.find((x) => x.sym === action.sym);
  if (!st) return state;
  const held = s.holdings[st.sym];

  if (action.type === 'buy') {
    // A size button always buys at least 1 unit if there is enough cash for it
    const qty = action.qty || Math.max(Math.floor((s.cash * action.size) / st.price), s.cash >= st.price ? 1 : 0);
    if (qty <= 0 || qty * st.price > s.cash) {
      say(s, 'Not enough cash for ' + st.sym + '. Try a bigger size or sell something.', 'bad', 'deny');
      return s;
    }
    const old = held || { shares: 0, avg: 0, banked: 0 };
    const shares = old.shares + qty;
    s.cash -= qty * st.price;
    s.holdings = { ...s.holdings, [st.sym]: { shares, avg: (old.avg * old.shares + st.price * qty) / shares, banked: old.banked } };
    s.stats = { ...s.stats, trades: s.stats.trades + 1 };
    say(s, 'Bought ' + qty + ' ' + st.sym, 'info', 'buy');
  } else if (action.type === 'sell') {
    const qty = action.qty || (held ? held.shares : 0);
    if (!held || qty <= 0 || qty > held.shares) {
      say(s, 'You do not own that many ' + st.sym + ' units.', 'bad', 'deny');
      return s;
    }
    const gain = Math.round((st.price - held.avg) * qty);
    const banked = held.banked + gain;
    s.cash += qty * st.price;
    s.holdings = { ...s.holdings };
    s.stats = { ...s.stats, trades: s.stats.trades + 1 };
    // A dodge only counts for a company that was already owned when the bad news broke
    if (s.news && s.news.pct < 0 && s.news.held.includes(st.sym) && (s.news.sym === st.sym || s.news.sym === 'ALL')) s.news = { ...s.news, sold: true };

    if (qty < held.shares) {
      s.holdings[st.sym] = { ...held, shares: held.shares - qty, banked };
      say(s, 'Sold ' + qty + ' ' + st.sym + ' (' + signed(gain) + ')', gain >= 0 ? 'good' : 'bad', gain >= 0 ? 'sell' : 'loss');
    } else {
      delete s.holdings[st.sym];
      // A streak only counts when a whole position is closed
      if (banked >= WIN_MIN) {
        s.streak += 1;
        const points = Math.round(banked / 10) * multiplier(s.streak);
        s.bonus += points;
        s.stats = { ...s.stats, wins: s.stats.wins + 1, bestStreak: Math.max(s.stats.bestStreak, s.streak), bestTrade: Math.max(s.stats.bestTrade, banked) };
        say(s, signed(banked) + ' on ' + st.sym + '! +' + points + ' points' + (s.streak > 1 ? ' (x' + multiplier(s.streak) + ' streak)' : ''), 'good', s.streak > 2 ? 'streak' : 'win');
        if (s.streak === 3 || s.streak === 5) s.party += 1;
      } else if (banked < 0) {
        s.streak = 0;
        s.stats = { ...s.stats, losses: s.stats.losses + 1 };
        say(s, signed(banked) + ' on ' + st.sym + '. Streak reset.', 'bad', 'loss');
      } else {
        say(s, 'Closed ' + st.sym + ' (' + signed(banked) + ')', 'info', 'sell');
      }
    }
  } else return state;

  settle(s);
  return s;
}
