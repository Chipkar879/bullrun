import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const BASE_PRICES = {
  GOLDVLT: 72, SILVRVLT: 95, IRONWORKS: 165, ALUMINA: 780, TERRAMIN: 460,
  CARBONIA: 390, PRIMEBANK: 980, UNITYBANK: 1400, NATBANK: 850, CREDITO: 1050,
  INFOSPHR: 1500, TECHNOVA: 3200, SKYLINK: 1900, ENERGIA: 1400, PETROFLD: 400,
  VOLTARA: 350, HARBORLN: 1400, VITACURE: 1700, AURUM: 3500, CONSUMEX: 400,
  BUILDCRP: 3500, MOTORIA: 12500,
};

// Volatility per 15-second tick (higher = more movement).
const VOL = {
  GOLDVLT: 0.0008, SILVRVLT: 0.0012, IRONWORKS: 0.0018, ALUMINA: 0.0016,
  TERRAMIN: 0.0018, CARBONIA: 0.0020, PRIMEBANK: 0.0014, UNITYBANK: 0.0015,
  NATBANK: 0.0014, CREDITO: 0.0018, INFOSPHR: 0.0016, TECHNOVA: 0.0017,
  SKYLINK: 0.0018, ENERGIA: 0.0016, PETROFLD: 0.0020, VOLTARA: 0.0013,
  HARBORLN: 0.0016, VITACURE: 0.0016, AURUM: 0.0022, CONSUMEX: 0.0012,
  BUILDCRP: 0.0018, MOTORIA: 0.0020,
};
const DEFAULT_VOL = 0.0016;

const SEED = 'bullrun-v1';   // change this text to reshuffle every price path
const TICK_MS = 15000;       // one new price every 15 seconds, same for everyone
const PHI = 0.998;           // pull toward base (closer to 1 = slower pull)
const WINDOW = 2500;         // ticks of memory (~10 hours)
const TICKS_PER_MIN = 4;
const HISTORY_POINTS = 60;   // one point per minute, last hour
const TICKS_PER_DAY = 5760;

function hashString(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Deterministic uniform value in (0,1) for (seed, n).
function noise(seed, n) {
  let h = (seed ^ Math.imul(n, 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  return ((h >>> 0) + 0.5) / 4294967296;
}

// Deterministic standard-normal shock for a given tick (Box-Muller).
function shock(seed, tick) {
  const u1 = noise(seed, tick * 2);
  const u2 = noise(seed, tick * 2 + 1);
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// Log-deviation from base for each tick in the window ending at endTick.
function walk(seed, sigma, endTick) {
  const out = [];
  let x = 0;
  for (let tick = endTick - WINDOW + 1; tick <= endTick; tick += 1) {
    x = PHI * x + sigma * shock(seed, tick);
    out.push(x);
  }
  return out;
}

const toPrice = (base, x) => Number((base * Math.exp(x)).toFixed(2));

export async function GET() {
  try {
    const now = Date.now();
    const currentTick = Math.floor(now / TICK_MS);

    const prices = Object.entries(BASE_PRICES).map(([symbol, base]) => {
      const seed = hashString(`${SEED}:${symbol}`);
      const sigma = VOL[symbol] ?? DEFAULT_VOL;

      const xs = walk(seed, sigma, currentTick);
      const dayAgo = walk(seed, sigma, currentTick - TICKS_PER_DAY);

      const history = [];
      for (let i = HISTORY_POINTS - 1; i >= 0; i -= 1) {
        const index = xs.length - 1 - i * TICKS_PER_MIN;
        history.push({
          time: Math.floor(((currentTick - i * TICKS_PER_MIN) * TICK_MS) / 1000),
          close: toPrice(base, xs[index]),
        });
      }

      const price = toPrice(base, xs[xs.length - 1]);
      const before = toPrice(base, dayAgo[dayAgo.length - 1]);
      const change = before > 0 ? ((price - before) / before) * 100 : 0;

      return {
        symbol,
        price,
        changePct: `${change > 0 ? '+' : ''}${change.toFixed(2)}%`,
        history,
      };
    });

    return NextResponse.json(
      {
        mode: 'prototype',
        isRealHistoricalData: false,
        dataLabel: 'SIMULATED MARKET DATA',
        marketOpen: true,
        indiaTime: new Date(now).toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata' }),
        sessionDate: new Date(now).toISOString().slice(0, 10),
        prices,
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