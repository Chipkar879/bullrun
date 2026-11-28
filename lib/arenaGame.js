// BullRun Arena engine.
// 12 made-up companies (2 in each of 6 sectors), real-life style news, 30 game days.
// Classic = 60 seconds per day (30 min). Fast = 30 seconds per day (15 min).
// Pure functions only: the page calls reducer() once per second and per click.

export const START_CASH = 100000;
export const DAYS = 30;

export const MODES = {
  classic: {
    id: 'classic',
    name: 'Classic',
    daySecs: 60,
    stepSecs: 5,
    blurb: '30 minutes. 60 seconds per game day.',
  },
  fast: {
    id: 'fast',
    name: 'Fast',
    daySecs: 30,
    stepSecs: 3,
    blurb: '15 minutes. Same market, double speed.',
  },
};

const COMPANIES = [
  { sym: 'NVS', name: 'Nova Systems', icon: '\u{1F4BB}', sector: 'Technology', price: 1450, vol: 0.016, desc: 'Builds software for banks and big companies. Grows fast, but its price swings a lot.' },
  { sym: 'PXC', name: 'Pixel Cloud', icon: '\u{2601}\u{FE0F}', sector: 'Technology', price: 820, vol: 0.019, desc: 'Cloud storage and apps. Young, popular and a bit wild.' },
  { sym: 'BTB', name: 'Bharat Trust Bank', icon: '\u{1F3E6}', sector: 'Banking', price: 1120, vol: 0.011, desc: 'A large bank with millions of savers. Slow and steady.' },
  { sym: 'CNF', name: 'Capital Nest Finance', icon: '\u{1F4B3}', sector: 'Banking', price: 640, vol: 0.015, desc: 'Gives loans and credit cards. Earns more when people borrow more.' },
  { sym: 'SGP', name: 'SunGrid Power', icon: '\u{2600}\u{FE0F}', sector: 'Energy', price: 310, vol: 0.017, desc: 'Solar and wind power. Loves new government support.' },
  { sym: 'PTA', name: 'Petro Arc', icon: '\u{1F6E2}\u{FE0F}', sector: 'Energy', price: 1780, vol: 0.013, desc: 'Oil and gas. Its price follows crude oil closely.' },
  { sym: 'CWL', name: 'CureWell Labs', icon: '\u{1F48A}', sector: 'Pharma', price: 950, vol: 0.012, desc: 'Makes medicines sold in India and abroad.' },
  { sym: 'VGH', name: 'VitaGen Health', icon: '\u{1F9EC}', sector: 'Pharma', price: 460, vol: 0.018, desc: 'Researches new treatments. One trial result can move it a lot.' },
  { sym: 'VLM', name: 'Volt Motors', icon: '\u{1F697}', sector: 'Auto', price: 2250, vol: 0.016, desc: 'Electric and petrol cars. Sales jump at festival time.' },
  { sym: 'TQW', name: 'Torque Wheels', icon: '\u{1F3CD}\u{FE0F}', sector: 'Auto', price: 540, vol: 0.014, desc: 'Two-wheelers for everyday riders.' },
  { sym: 'FBK', name: 'Fresh Basket', icon: '\u{1F6D2}', sector: 'Consumer', price: 270, vol: 0.010, desc: 'Groceries and daily needs. People buy it in good times and bad.' },
  { sym: 'SHR', name: 'StyleHub Retail', icon: '\u{1F455}', sector: 'Consumer', price: 730, vol: 0.015, desc: 'Fashion stores and online shopping.' },
];

export const SECTORS = ['Technology', 'Banking', 'Energy', 'Pharma', 'Auto', 'Consumer'];

// ---------- News ----------
const COMPANY_UP = [
  '{n} reports record quarterly profit',
  '{n} wins a big new contract',
  '{n} launches a hit new product',
  '{n} announces a surprise dividend',
  '{n} opens its biggest expansion yet',
];
const COMPANY_DOWN = [
  '{n} profit falls short of estimates',
  '{n} recalls a popular product',
  'Regulator opens a probe into {n}',
  '{n} loses a major customer',
  'Top boss of {n} resigns suddenly',
];
const SECTOR_NEWS = {
  Technology: {
    up: ['Global demand for Indian tech services surges', 'Government announces big push for digital India'],
    down: ['New data rules raise costs for tech firms', 'Clients cut tech spending as growth slows'],
  },
  Banking: {
    up: ['RBI cuts interest rates, loan demand set to grow', 'Bad loans fall across the banking sector'],
    down: ['Bad loans rise across lenders', 'RBI tightens rules for banks and lenders'],
  },
  Energy: {
    up: ['Crude oil climbs on supply worries', 'Government unveils a large clean energy plan'],
    down: ['Government caps fuel prices', 'Oil prices slide as demand cools'],
  },
  Pharma: {
    up: ['Government raises health spending', 'Overseas orders for Indian medicines jump'],
    down: ['Drug price controls announced', 'Overseas regulator tightens checks on Indian medicines'],
  },
  Auto: {
    up: ['Festive season car sales hit a record', 'Cheaper car loans lift vehicle demand'],
    down: ['Chip shortage slows vehicle production', 'Steel prices surge, raising making costs'],
  },
  Consumer: {
    up: ['Strong monsoon lifts rural spending', 'Shoppers spend more as incomes rise'],
    down: ['Food inflation squeezes household budgets', 'Shoppers cut spending as prices climb'],
  },
};
const MARKET_UP = [
  'Budget cuts income tax and markets cheer',
  'Inflation falls more than expected',
  'Foreign investors pour money into India',
];
const MARKET_DOWN = [
  'Global sell-off rattles markets',
  'Inflation jumps above forecasts',
  'Foreign investors pull money out of India',
];

// ---------- Missions and trophies ----------
export const MISSIONS = [
  { id: 'rich', icon: '\u{1F4B0}', text: 'Grow your net worth to \u20B91,15,000', goal: START_CASH * 1.15, read: (g) => netWorth(g) },
  { id: 'spread', icon: '\u{1F9FA}', text: 'Own shares in 4 companies at the same time', goal: 4, read: (g) => Object.keys(g.holdings).length },
  { id: 'sectors', icon: '\u{1F30D}', text: 'Own shares in 3 different sectors at once', goal: 3, read: (g) => heldSectors(g) },
  { id: 'active', icon: '\u{26A1}', text: 'Make 8 trades', goal: 8, read: (g) => g.stats.trades },
  { id: 'profit', icon: '\u{2705}', text: 'Sell 3 times at a profit', goal: 3, read: (g) => g.stats.wins },
  { id: 'newsbuy', icon: '\u{1F4F0}', text: 'Buy a company soon after good news about it (2 times)', goal: 2, read: (g) => g.stats.newsBuys.length },
  { id: 'dodge', icon: '\u{1F6E1}\u{FE0F}', text: 'Sell a company soon after bad news about it', goal: 1, read: (g) => g.stats.dodges.length },
];

export const TROPHIES = [
  { id: 'first', icon: '\u{1F3AC}', name: 'First Trade', hint: 'Make a trade' },
  { id: 'green', icon: '\u{1F4B5}', name: 'In The Green', hint: 'Finish with a profit' },
  { id: 'champion', icon: '\u{1F3C6}', name: 'Arena Champion', hint: 'Finish in 1st place' },
  { id: 'master', icon: '\u{1F3AF}', name: 'Mission Master', hint: 'Finish all 3 missions' },
  { id: 'diverse', icon: '\u{1F9FA}', name: 'Diversified', hint: 'Own 6 companies at once' },
  { id: 'hawk', icon: '\u{1F4F0}', name: 'News Hawk', hint: 'Buy after good news 3 times' },
  { id: 'dodger', icon: '\u{1F6E1}\u{FE0F}', name: 'Dodged It', hint: 'Sell right after bad news' },
  { id: 'big', icon: '\u{1F680}', name: 'Big Win', hint: 'Reach \u20B91,50,000' },
];

const BOT_DEFS = [
  { id: 'bot-steady', name: 'Steady Sam', icon: '\u{1F422}', style: 'steady' },
  { id: 'bot-bold', name: 'Bold Bhavna', icon: '\u{1F981}', style: 'bold' },
  { id: 'bot-sector', name: 'Sector Sid', icon: '\u{1F3AF}', style: 'sector' },
  { id: 'bot-news', name: 'News Nina', icon: '\u{1F4F0}', style: 'chaser' },
];

// ---------- Helpers ----------
export const money = (n) => (n < 0 ? '-' : '') + '\u20B9' + Math.round(Math.abs(n)).toLocaleString('en-IN');
export const signed = (n) => (n >= 0 ? '+' : '-') + money(Math.abs(n));
const round2 = (n) => Math.round(n * 100) / 100;

function makeRng(seed) {
  let s = seed | 0;
  const f = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  f.get = () => s;
  return f;
}
const gauss = (rnd) => (rnd() + rnd() + rnd() - 1.5) * 2;
const pick = (rnd, list) => list[Math.floor(rnd() * list.length)];

function heldSectors(g) {
  const set = new Set();
  Object.keys(g.holdings).forEach((sym) => {
    const st = g.stocks.find((s) => s.sym === sym);
    if (st) set.add(st.sector);
  });
  return set.size;
}

export function newsTouches(news, st) {
  if (!news) return false;
  if (news.sym) return news.sym === st.sym;
  return news.sector === 'ALL' || news.sector === st.sector;
}

export function netWorth(g) {
  return round2(g.cash + Object.keys(g.holdings).reduce((sum, sym) => {
    const st = g.stocks.find((s) => s.sym === sym);
    return sum + (st ? st.price * g.holdings[sym].shares : 0);
  }, 0));
}

const botWorth = (bot, stocks) =>
  round2(bot.cash + Object.keys(bot.holdings).reduce((sum, sym) => {
    const st = stocks.find((s) => s.sym === sym);
    return sum + (st ? st.price * bot.holdings[sym] : 0);
  }, 0));

export function standings(g) {
  const rows = [{ id: 'you', name: 'You', icon: '\u{2B50}', worth: netWorth(g) }];
  g.bots.forEach((b) => rows.push({ id: b.id, name: b.name, icon: b.icon, worth: botWorth(b, g.stocks) }));
  return rows.sort((a, b) => b.worth - a.worth);
}

export function finalScore(g) {
  return Math.max(0, Math.round((netWorth(g) / START_CASH) * 1000)) + 400 * g.missions.filter((m) => m.done).length;
}

// ---------- Building a new match ----------
function buildMatch(mode, seed) {
  const rnd = makeRng(seed);
  const m = MODES[mode] || MODES.classic;
  const total = DAYS * m.daySecs;

  const stocks = COMPANIES.map((c) => {
    const price = round2(c.price * (0.97 + rnd() * 0.06));
    const history = [price];
    for (let i = 0; i < 7; i += 1) history.unshift(round2(history[0] * (1 + gauss(rnd) * 0.006)));
    return { sym: c.sym, name: c.name, icon: c.icon, sector: c.sector, desc: c.desc, vol: c.vol, price, prevClose: price, history };
  });

  // News is planned up front, so every match has the same pace
  const COUNT = 32;
  const used = new Set();
  const schedule = [];
  for (let k = 0; k < COUNT; k += 1) {
    const at = Math.min(total - 15, Math.max(8, Math.round(((k + 0.2 + rnd() * 0.7) * total) / COUNT)));
    const up = rnd() < 0.5;
    const roll = rnd();
    let item = null;
    for (let tries = 0; tries < 8 && !item; tries += 1) {
      let text;
      let sym = null;
      let sector = 'ALL';
      let pct;
      if (roll < 0.5) {
        const st = pick(rnd, stocks);
        text = pick(rnd, up ? COMPANY_UP : COMPANY_DOWN).replace('{n}', st.name);
        sym = st.sym;
        sector = st.sector;
        pct = 5 + rnd() * 4;
      } else if (roll < 0.85) {
        sector = pick(rnd, SECTORS);
        text = pick(rnd, SECTOR_NEWS[sector][up ? 'up' : 'down']);
        pct = 3 + rnd() * 3;
      } else {
        text = pick(rnd, up ? MARKET_UP : MARKET_DOWN);
        pct = 2 + rnd() * 2;
      }
      if (!used.has(text)) {
        used.add(text);
        // The headline shows the direction. How the market really reacts is not guaranteed.
        const factor = rnd() < 0.12 ? -(0.2 + rnd() * 0.4) : 0.3 + rnd() * 1.0;
        item = { id: k + 1, at, sym, sector, text, pct: up ? round2(pct) : -round2(pct), real: (up ? 1 : -1) * pct * factor };
      }
    }
    if (item) schedule.push(item);
  }
  schedule.sort((a, b) => a.at - b.at);

  // Rival bots
  const bots = BOT_DEFS.map((def) => {
    const bot = { id: def.id, name: def.name, icon: def.icon, style: def.style, cash: START_CASH, holdings: {}, pending: [] };
    let basket = [];
    let share = 0.95;
    if (def.style === 'steady') basket = stocks.slice();
    if (def.style === 'bold') {
      const pool = stocks.slice();
      for (let i = 0; i < 3; i += 1) basket.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
    }
    if (def.style === 'sector') {
      const sec = pick(rnd, SECTORS);
      basket = stocks.filter((s) => s.sector === sec);
    }
    if (def.style === 'chaser') {
      basket = stocks.slice();
      share = 0.6;
    }
    basket.forEach((st) => {
      const shares = Math.floor((START_CASH * share) / basket.length / st.price);
      if (shares > 0) {
        bot.holdings[st.sym] = shares;
        bot.cash = round2(bot.cash - shares * st.price);
      }
    });
    return bot;
  });

  const pool = MISSIONS.slice();
  const missions = [];
  for (let i = 0; i < 3; i += 1) missions.push({ id: pool.splice(Math.floor(rnd() * pool.length), 1)[0].id, done: false });

  return {
    phase: 'RUNNING',
    mode: m.id,
    seed: rnd.get(),
    clock: 0,
    day: 1,
    secsLeft: m.daySecs,
    cash: START_CASH,
    holdings: {},
    stocks,
    bots,
    schedule,
    nextNews: 0,
    pressure: [],
    news: null,
    newsLog: [],
    missions,
    stats: { trades: 0, wins: 0, maxHeld: 0, newsBuys: [], dodges: [] },
    toasts: [],
    toastId: 0,
    fx: [],
    fxId: 0,
    party: 0,
    result: null,
  };
}

// ---------- State changes ----------
const withFx = (g, name) => ({ ...g, fxId: g.fxId + 1, fx: [...g.fx, { id: g.fxId + 1, name }].slice(-12) });
const withToast = (g, text, tone) => ({
  ...g,
  toastId: g.toastId + 1,
  toasts: [...g.toasts, { id: g.toastId + 1, text, tone, until: g.clock + 3 }].slice(-3),
});

function checkMissions(g) {
  let out = g;
  const missions = g.missions.map((m) => {
    if (m.done) return m;
    const rule = MISSIONS.find((x) => x.id === m.id);
    if (rule && rule.read(g) >= rule.goal) {
      out = withFx(withToast(out, 'Mission complete! +400 points', 'gold'), 'mission');
      return { ...m, done: true };
    }
    return m;
  });
  return { ...out, missions };
}

function recentNews(g, st, direction) {
  const window = Math.round(MODES[g.mode].daySecs * 0.5);
  return g.newsLog.find((n) => n.pct * direction > 0 && g.clock - n.at <= window && newsTouches(n, st));
}

function buy(g, action) {
  if (g.phase !== 'RUNNING') return g;
  const st = g.stocks.find((s) => s.sym === action.sym);
  if (!st) return g;
  let n;
  if (action.qty) n = Math.floor(action.qty);
  else {
    const spend = action.size >= 1 ? g.cash : g.cash * (action.size || 0.25);
    n = Math.floor(spend / st.price);
    if (n < 1 && g.cash >= st.price) n = 1;
  }
  const cost = round2(n * st.price);
  if (n < 1 || cost > g.cash + 0.001) return withFx(withToast(g, 'Not enough cash for that', 'bad'), 'deny');

  const old = g.holdings[st.sym];
  const shares = (old ? old.shares : 0) + n;
  const avg = ((old ? old.shares * old.avg : 0) + cost) / shares;
  let out = {
    ...g,
    cash: round2(g.cash - cost),
    holdings: { ...g.holdings, [st.sym]: { shares, avg: round2(avg) } },
  };
  const stats = { ...g.stats, trades: g.stats.trades + 1 };
  stats.maxHeld = Math.max(stats.maxHeld, Object.keys(out.holdings).length);
  const hit = recentNews(g, st, 1);
  if (hit && !stats.newsBuys.includes(hit.id)) stats.newsBuys = [...stats.newsBuys, hit.id];
  out.stats = stats;
  out = withFx(withToast(out, 'Bought ' + n + ' ' + st.sym + ' for ' + money(cost), 'info'), 'buy');
  return checkMissions(out);
}

function sell(g, action) {
  if (g.phase !== 'RUNNING') return g;
  const st = g.stocks.find((s) => s.sym === action.sym);
  const hold = st && g.holdings[st.sym];
  if (!hold) return g;
  const n = Math.min(hold.shares, action.qty ? Math.floor(action.qty) : hold.shares);
  if (n < 1) return g;
  const proceeds = round2(n * st.price);
  const profit = round2((st.price - hold.avg) * n);
  const holdings = { ...g.holdings };
  if (n >= hold.shares) delete holdings[st.sym];
  else holdings[st.sym] = { shares: hold.shares - n, avg: hold.avg };
  const stats = { ...g.stats, trades: g.stats.trades + 1, wins: g.stats.wins + (profit > 0 ? 1 : 0) };
  const hit = recentNews(g, st, -1);
  if (hit && !stats.dodges.includes(hit.id)) stats.dodges = [...stats.dodges, hit.id];
  let out = { ...g, cash: round2(g.cash + proceeds), holdings, stats };
  out = withFx(withToast(out, 'Sold ' + n + ' ' + st.sym + ', ' + signed(profit), profit >= 0 ? 'good' : 'bad'), profit > 0 ? 'win' : profit < 0 ? 'loss' : 'sell');
  return checkMissions(out);
}

function botTrade(bot, st, dir, frac) {
  const b = { ...bot, holdings: { ...bot.holdings } };
  if (dir > 0) {
    const shares = Math.floor((b.cash * frac) / st.price);
    if (shares > 0) {
      b.holdings[st.sym] = (b.holdings[st.sym] || 0) + shares;
      b.cash = round2(b.cash - shares * st.price);
    }
  } else if (b.holdings[st.sym]) {
    b.cash = round2(b.cash + b.holdings[st.sym] * st.price);
    delete b.holdings[st.sym];
  }
  return b;
}

function tip(g, r) {
  const idle = g.cash / Math.max(1, r.worth);
  const held = Object.keys(g.holdings).length;
  if (g.stats.trades === 0) return 'You never traded. Money sitting idle does not grow, so read the headlines and make a move.';
  if (idle > 0.6) return 'More than half your money sat idle as cash. Cash cannot grow while it waits.';
  if (held <= 1 && r.worth < START_CASH) return 'Your money was in one company. Spreading it across sectors lowers your risk.';
  if (g.stats.newsBuys.length === 0) return 'Try buying soon after good news about a company, and selling after bad news.';
  if (g.stats.trades >= 4 && g.stats.wins / g.stats.trades < 0.4) return 'Many of your sales lost money. Headlines do not always move prices the way you expect, so do not chase every story.';
  return g.mode === 'classic' ? 'Nice work. Try Fast mode for the same market at double speed.' : 'Nice work. Try Classic mode for a longer, calmer game.';
}

function finish(g) {
  const table = standings(g);
  const place = table.findIndex((p) => p.id === 'you') + 1;
  const worth = netWorth(g);
  const ratio = worth / START_CASH;
  const grade = ratio >= 1.25 ? 'S' : ratio >= 1.12 ? 'A' : ratio >= 1.04 ? 'B' : ratio >= 0.97 ? 'C' : 'D';
  const trophies = [];
  const done = g.missions.filter((m) => m.done).length;
  if (g.stats.trades >= 1) trophies.push('first');
  if (worth > START_CASH) trophies.push('green');
  if (place === 1) trophies.push('champion');
  if (done === g.missions.length) trophies.push('master');
  if (g.stats.maxHeld >= 6) trophies.push('diverse');
  if (g.stats.newsBuys.length >= 3) trophies.push('hawk');
  if (g.stats.dodges.length >= 1) trophies.push('dodger');
  if (worth >= 150000) trophies.push('big');
  const r = { place, worth, grade, score: finalScore(g), trophies, tip: '' };
  r.tip = tip(g, r);
  return { ...g, phase: 'FINISHED', result: r, party: place === 1 ? 1 : 0, news: null };
}

function tick(state) {
  if (state.phase !== 'RUNNING') return state;
  const mode = MODES[state.mode];
  const total = DAYS * mode.daySecs;
  const rnd = makeRng(state.seed);
  let g = { ...state, clock: state.clock + 1 };
  g.day = Math.min(DAYS, Math.floor(g.clock / mode.daySecs) + 1);
  g.secsLeft = mode.daySecs - (g.clock % mode.daySecs);

  // New day: yesterday's close becomes the "previous close"
  if (g.clock % mode.daySecs === 0) g.stocks = g.stocks.map((s) => ({ ...s, prevClose: s.price }));

  // Headlines arrive without warning. A quarter of the move happens at once, the rest follows.
  while (g.nextNews < g.schedule.length && g.schedule[g.nextNews].at <= g.clock) {
    const n = g.schedule[g.nextNews];
    const hit = (s) => (n.sym ? s.sym === n.sym : n.sector === 'ALL' || s.sector === n.sector);
    const jump = n.real * 0.25;
    g.stocks = g.stocks.map((s) => {
      if (!hit(s)) return s;
      const price = Math.max(1, round2(s.price * (1 + jump / 100)));
      return { ...s, price, history: [...s.history, price].slice(-40) };
    });
    g.pressure = [...g.pressure, { sym: n.sym, sector: n.sector, left: n.real - jump }];
    const shown = { id: n.id, at: n.at, day: g.day, sym: n.sym, sector: n.sector, text: n.text, pct: n.pct };
    g.news = shown;
    g.newsLog = [shown, ...g.newsLog].slice(0, 8);
    g.nextNews += 1;
    g = withFx(g, 'alert');
    // News Nina reacts after a short delay
    g.bots = g.bots.map((b) => {
      if (b.style !== 'chaser' || n.sector === 'ALL') return b;
      const targets = n.sym ? g.stocks.filter((s) => s.sym === n.sym) : g.stocks.filter((s) => s.sector === n.sector);
      const delay = 2 + Math.floor(rnd() * 6);
      return { ...b, pending: [...b.pending, ...targets.map((s) => ({ at: g.clock + delay, sym: s.sym, dir: n.pct > 0 ? 1 : -1, frac: n.sym ? 0.6 : 0.4 }))] };
    });
  }

  // Prices move every few seconds
  if (g.clock % mode.stepSecs === 0) {
    const spd = mode.daySecs / mode.stepSecs;
    const root = Math.sqrt(spd);
    const rate = 1 - Math.exp(-mode.stepSecs / (mode.daySecs * 0.35));
    const market = (gauss(rnd) * 0.004) / root;
    const sectorMove = {};
    SECTORS.forEach((s) => { sectorMove[s] = (gauss(rnd) * 0.006) / root; });
    const push = g.pressure.map((p) => ({ ...p, step: p.left * rate }));
    g.stocks = g.stocks.map((s) => {
      let newsPct = 0;
      push.forEach((p) => {
        if (p.sym ? p.sym === s.sym : p.sector === 'ALL' || p.sector === s.sector) newsPct += p.step;
      });
      const ret = 0.0012 / spd + market + sectorMove[s.sector] + (gauss(rnd) * s.vol) / root + newsPct / 100;
      const price = Math.max(1, round2(s.price * (1 + ret)));
      return { ...s, price, history: [...s.history, price].slice(-40) };
    });
    g.pressure = push.map((p) => ({ sym: p.sym, sector: p.sector, left: p.left - p.step })).filter((p) => Math.abs(p.left) > 0.15);
  }

  // Rival bots act on their own plans
  g.bots = g.bots.map((b) => {
    let bot = b;
    const due = b.pending.filter((p) => p.at <= g.clock);
    if (due.length) {
      due.forEach((p) => {
        const st = g.stocks.find((s) => s.sym === p.sym);
        bot = botTrade(bot, st, p.dir, p.frac);
      });
      bot = { ...bot, pending: b.pending.filter((p) => p.at > g.clock) };
    }
    return bot;
  });

  g.toasts = g.toasts.filter((t) => t.until >= g.clock);
  if (g.news && g.clock - g.news.at >= Math.round(mode.daySecs * 0.5)) g.news = null;
  g.seed = rnd.get();
  g = checkMissions(g);
  if (g.clock >= total) g = finish(g);
  return g;
}

export function reducer(state, action) {
  switch (action.type) {
    case 'start':
      return buildMatch(action.mode, action.seed);
    case 'quit':
      return null;
    case 'tick':
      return state ? tick(state) : state;
    case 'buy':
      return state ? buy(state, action) : state;
    case 'sell':
      return state ? sell(state, action) : state;
    default:
      return state;
  }
}