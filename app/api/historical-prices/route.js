import { NextResponse } from 'next/server';
import { ASSETS, ASSET_BY_SYM } from '@/lib/catalog';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Simulated prices for every asset in lib/catalog.js. All names and prices are invented.
// Every price is a pure function of (asset, time): all devices see the same numbers.
//
// Engine in short:
//  - one shared market shock, one shared shock per category, and one shock per asset;
//    each asset mixes them with a beta (how much it follows the market)
//  - each asset has its own tick length (liquid = 15 s, mid = 30 s, thin = 60 s)
//  - fictional news events (per asset, per category, whole market) cause a jump that fades
//  - news is only published at or after the moment it happens, and prices react at the next tick
//  - day change = today's price vs the last price of the previous India (IST) day
//  - history = one point per 5 minutes from 00:00 IST today up to now, ending at the live price

const DEFAULT_VOL = 0.0016;
const SEED = 'bullrun-v2';        // change this text to reshuffle every price path
const BASE_MS = 15000;            // shortest tick
const PHI = 0.998;                // pull toward base per 15 s (closer to 1 = slower pull)
const NBASE = 6600;               // 15 s ticks of memory (about 27.5 hours)
const DAY_MS = 86400000;
const IST_MS = 19800000;
const HISTORY_STEP_MS = 300000;   // day chart: one point every 5 minutes
const RANGES = { '15m': { ms: 900000, step: 15000 }, '1h': { ms: 3600000, step: 60000 } };
const SLOT_MS = 30 * 60 * 1000;   // news slots
const STAT = 1 / Math.sqrt(1 - PHI * PHI);   // typical spread of a walk, in units of vol

const TICK_BY_LIQ = { high: BASE_MS, mid: BASE_MS * 2, low: BASE_MS * 4 };

// How much an asset follows the whole market (beta) and its own category.
const BETA = {
  'Banking & NBFC': 0.6, IT: 0.5, 'Energy & Power': 0.5, 'Metals & Mining': 0.65,
  'Pharma & Health': 0.3, 'FMCG & Consumer': 0.35, Auto: 0.6, 'Infra & Industrials': 0.6,
  'Telecom & Media': 0.45, Commodities: 0.15, Currency: 0.05, ETFs: 0.5, Indices: 0.5,
};

function loadings(asset) {
  const b = asset.beta ?? BETA[asset.category] ?? 0.4;
  const s = asset.cls === 'equity' ? 0.4 : asset.cls === 'commodity' ? 0.2 : 0.1;
  return { b, s };
}

function hashString(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function noise(seed, n) {
  let h = (seed ^ Math.imul(n, 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  return ((h >>> 0) + 0.5) / 4294967296;
}

function shock(seed, n) {
  const u1 = noise(seed, n * 2);
  const u2 = noise(seed, n * 2 + 1);
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

const toPrice = (base, rel) => Number((base * rel).toFixed(2));

// ---------- news events ----------

const T_ASSET = {
  equity: {
    up: ['{n} reports a stronger quarter than expected', '{n} signs a large new deal', '{n} unveils a new expansion plan'],
    down: ['{n} reports a weaker quarter than expected', '{n} faces a setback on a key project', '{n} warns of higher costs ahead'],
  },
  commodity: {
    up: ['Supply tightness lifts {n}', 'Strong demand report supports {n}'],
    down: ['Stock build-up weighs on {n}', 'Demand worries pull {n} lower'],
  },
  currency: {
    up: ['{n} firms as traders reassess the rate outlook', 'Inflows support {n}'],
    down: ['{n} eases as traders book profits', 'Outflows weigh on {n}'],
  },
};
const T_SECTOR = {
  up: ['{c} names rally on easier policy talk', '{c} names gain on strong demand data'],
  down: ['{c} names slip on cost worries', '{c} names fall on weak demand data'],
};
const T_MARKET = {
  up: ['Broad market lifts as risk appetite improves', 'Buyers return across the board'],
  down: ['Broad market weakens on caution', 'Sellers dominate across the board'],
};

const pick = (list, u) => list[Math.min(list.length - 1, Math.floor(u * list.length))];

// Events for one key inside [fromMs, toMs]. Same inputs always give the same events.
function eventsIn(key, prob, fromMs, toMs) {
  const out = [];
  for (let slot = Math.floor(fromMs / SLOT_MS); slot <= Math.floor(toMs / SLOT_MS); slot += 1) {
    const h = hashString(`${SEED}:ev:${key}:${slot}`);
    if (noise(h, 1) > prob) continue;
    const t = slot * SLOT_MS + Math.floor(noise(h, 2) * SLOT_MS);
    if (t < fromMs || t > toMs) continue;
    out.push({
      id: `${key}:${slot}`,
      t,
      dir: noise(h, 3) < 0.5 ? -1 : 1,
      mag: 0.8 + noise(h, 4) * 1.2,
      u: noise(h, 5),
    });
  }
  return out;
}

// ---------- the engine ----------

function buildAll(now, range) {
  const endBase = Math.floor(now / BASE_MS);
  const baseStart = endBase - NBASE + 1;
  const fromMs = baseStart * BASE_MS;

  const marketSeed = hashString(`${SEED}:market`);
  const mkt = new Float64Array(NBASE);
  for (let i = 0; i < NBASE; i += 1) mkt[i] = shock(marketSeed, baseStart + i);

  const secArrays = {};
  const sectorOf = (category) => {
    if (!secArrays[category]) {
      const seed = hashString(`${SEED}:cat:${category}`);
      const arr = new Float64Array(NBASE);
      for (let i = 0; i < NBASE; i += 1) arr[i] = shock(seed, baseStart + i);
      secArrays[category] = arr;
    }
    return secArrays[category];
  };

  // Sum of the base shocks inside one asset tick, scaled to keep unit spread.
  const group = (arr, idx, k) => {
    let sum = 0;
    for (let b = (idx - 1) * k + 1; b <= idx * k; b += 1) sum += arr[b - baseStart];
    return sum / Math.sqrt(k);
  };

  const marketEvents = eventsIn('m', 0.01, fromMs, now);
  const catEvents = {};
  const eventsOfCategory = (category) => {
    if (!catEvents[category]) catEvents[category] = eventsIn(`c:${category}`, 0.015, fromMs, now);
    return catEvents[category];
  };

  const news = [];
  const walks = {};

  ASSETS.forEach((asset) => {
    if (asset.basket || asset.tracks) return;
    const k = Math.round((TICK_BY_LIQ[asset.liq] || BASE_MS) / BASE_MS);
    const tickMs = k * BASE_MS;
    const phi = PHI ** k;
    const vol = asset.vol ?? DEFAULT_VOL;
    const sigma = vol * Math.sqrt(k);
    const { b, s } = loadings(asset);
    const idio = Math.sqrt(Math.max(0.05, 1 - b * b - s * s));
    const seed = hashString(`${SEED}:${asset.sym}`);
    const first = Math.ceil((baseStart - 1) / k) + 1;
    const end = Math.floor(endBase / k);
    const sec = sectorOf(asset.category);
    const spread = vol * STAT;

    // jumps: each event hits at the first tick that starts after the news time
    const jumps = new Map();
    const RAMP_MS = 300000;
    const rampTicks = Math.max(1, Math.round(RAMP_MS / tickMs));
    const addJump = (ev, size) => {
      const start = Math.ceil(ev.t / tickMs);
      const part = (ev.dir * ev.mag * size * 0.35) / rampTicks;
      for (let j = 0; j < rampTicks; j += 1) {
        const idx = start + j;
        if (idx < first || idx > end) continue;
        jumps.set(idx, (jumps.get(idx) || 0) + part);
      }
    };
    const own = eventsIn(`a:${asset.sym}`, 0.006, fromMs, now);
    own.forEach((ev) => {
      addJump(ev, spread);
      const set = T_ASSET[asset.cls] || T_ASSET.equity;
      news.push({
        id: ev.id, time: Math.floor(ev.t / 1000), scope: 'asset', sym: asset.sym,
        category: asset.category, direction: ev.dir,
        headline: pick(ev.dir > 0 ? set.up : set.down, ev.u).replace('{n}', asset.name),
      });
    });
    eventsOfCategory(asset.category).forEach((ev) => addJump(ev, spread * 0.6));
    marketEvents.forEach((ev) => addJump(ev, spread * 0.5 * (0.4 + b)));

    const out = new Float64Array(end - first + 1);
    let x = 0;
    for (let idx = first; idx <= end; idx += 1) {
      const z = b * group(mkt, idx, k) + s * group(sec, idx, k) + idio * shock(seed, idx);
      x = phi * x + sigma * z + (jumps.get(idx) || 0);
      out[idx - first] = x;
    }
    walks[asset.sym] = { out, first, end, k };
  });

  // sector and market headlines (one line each, not one per asset)
  const seenCats = new Set(ASSETS.filter((a) => !a.basket && !a.tracks).map((a) => a.category));
  seenCats.forEach((category) => {
    eventsOfCategory(category).forEach((ev) => news.push({
      id: ev.id, time: Math.floor(ev.t / 1000), scope: 'sector', category, direction: ev.dir,
      headline: pick(ev.dir > 0 ? T_SECTOR.up : T_SECTOR.down, ev.u).replace('{c}', category),
    }));
  });
  marketEvents.forEach((ev) => news.push({
    id: ev.id, time: Math.floor(ev.t / 1000), scope: 'market', direction: ev.dir,
    headline: pick(ev.dir > 0 ? T_MARKET.up : T_MARKET.down, ev.u),
  }));

  // price relative (price / base) of an own-priced asset at time T
  const relOwn = (sym, T) => {
    const w = walks[sym];
    if (!w) return 1;
    const idx = Math.min(w.end, Math.floor(Math.floor(T / BASE_MS) / w.k));
    return Math.exp(w.out[Math.max(0, idx - w.first)]);
  };

  const basketOf = (asset) => {
    if (asset.basket) return asset.basket;
    if (asset.tracks) return ASSET_BY_SYM[asset.tracks]?.basket || [];
    return null;
  };

  const relAt = (asset, T) => {
    const basket = basketOf(asset);
    if (!basket) return relOwn(asset.sym, T);
    let total = 0;
    let weights = 0;
    basket.forEach(([sym, weight]) => {
      total += weight * relOwn(sym, T);
      weights += weight;
    });
    return weights > 0 ? total / weights : 1;
  };

  // Fixed day axis: 00:00 to 24:00 India time.
  const dayStart = Math.floor((now + IST_MS) / DAY_MS) * DAY_MS - IST_MS;
  const dayEnd = dayStart + DAY_MS;
  const axis = RANGES[range]
    ? { start: now - RANGES[range].ms, end: now, step: RANGES[range].step }
    : { start: dayStart, end: dayEnd, step: HISTORY_STEP_MS };

  const prices = ASSETS.map((asset) => {
    const price = toPrice(asset.base, relAt(asset, now));
    const prevClose = toPrice(asset.base, relAt(asset, dayStart - 1));
    const change = prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0;

    const history = [];
    for (let t = axis.start; t < now; t += axis.step) {
      history.push({ time: Math.floor(t / 1000), close: toPrice(asset.base, relAt(asset, t)) });
    }
    history.push({ time: Math.floor(now / 1000), close: price });

    return {
      symbol: asset.sym,
      price,
      prevClose,
      changePct: `${change > 0 ? '+' : ''}${change.toFixed(2)}%`,
      history,
    };
  });

  news.sort((a, c) => c.time - a.time);

  return {
    prices,
    news: news.filter((n) => n.time * 1000 >= now - DAY_MS).slice(0, 80),
    session: { start: Math.floor(axis.start / 1000), end: Math.floor(axis.end / 1000), range: RANGES[range] ? range : 'day' },
  };
}

// Everyone gets the same numbers within a 15 s tick, so compute once per tick.
const cache = {};

export async function GET(request) {
  try {
    const now = Date.now();
    const currentTick = Math.floor(now / BASE_MS);

    const asked = new URL(request.url).searchParams.get('range');
    const key = RANGES[asked] ? asked : 'day';
    if (!cache[key] || cache[key].tick !== currentTick) {
      cache[key] = { tick: currentTick, data: buildAll(currentTick * BASE_MS, key) };
    }
    const data = cache[key].data;

    return NextResponse.json(
      {
        mode: 'prototype',
        isRealHistoricalData: false,
        dataLabel: 'SIMULATED MARKET DATA',
        marketOpen: true,
        indiaTime: new Date(now).toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata' }),
        sessionDate: new Date(now).toISOString().slice(0, 10),
        session: data.session,
        news: data.news,
        prices: data.prices,
      },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (error) {
    console.error('Price simulation API error:', error);
    return NextResponse.json(
      { error: 'Could not generate simulated prices.' },
      { status: 500 }
    );
  }
}
