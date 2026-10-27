import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const BASE_PRICES = {
  GOLDBEES: 72,
  SILVERBEES: 95,
  TATASTEEL: 165,
  HINDALCO: 780,
  VEDL: 460,
  COALINDIA: 390,
  HDFCBANK: 980,
  ICICIBANK: 1400,
  SBIN: 850,
  BAJFINANCE: 1050,
  INFY: 1500,
  TCS: 3200,
  BHARTIARTL: 1900,
  RELIANCE: 1400,
  OIL: 400,
  NTPC: 350,
  ADANIPORTS: 1400,
  SUNPHARMA: 1700,
  TITAN: 3500,
  ITC: 400,
  LT: 3500,
  MARUTI: 12500,
};

const TIME_ZONE = 'Asia/Kolkata';
const OPEN_MINUTE = 9 * 60 + 15;
const CLOSE_MINUTE = 15 * 60 + 30;
const SESSION_MINUTES = CLOSE_MINUTE - OPEN_MINUTE;

function getIndiaClock() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts.filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value])
  );

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    weekday: values.weekday,
    minute: Number(values.hour) * 60 + Number(values.minute),
    time: `${values.hour}:${values.minute}`,
  };
}

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

function previousWeekday(date) {
  const result = new Date(date);
  do {
    result.setUTCDate(result.getUTCDate() - 1);
  } while (result.getUTCDay() === 0 || result.getUTCDay() === 6);
  return result;
}

function getSession(clock) {
  const today = new Date(
    Date.UTC(clock.year, clock.month - 1, clock.day)
  );

  const weekday = clock.weekday !== 'Sat' && clock.weekday !== 'Sun';
  const open =
    weekday &&
    clock.minute >= OPEN_MINUTE &&
    clock.minute < CLOSE_MINUTE;

  let sessionDate;
  let minuteIndex;

  if (open) {
    sessionDate = today;
    minuteIndex = clock.minute - OPEN_MINUTE;
  } else if (weekday && clock.minute >= CLOSE_MINUTE) {
    sessionDate = today;
    minuteIndex = SESSION_MINUTES;
  } else {
    sessionDate = previousWeekday(today);
    minuteIndex = SESSION_MINUTES;
  }

  return {
    open,
    sessionDate: dateKey(sessionDate),
    minuteIndex,
    indiaTime: clock.time,
  };
}

// Stable pseudo-random value: identical input always gives identical output.
function random01(text) {
  let hash = 2166136261;

  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  hash += hash << 13;
  hash ^= hash >>> 7;
  hash += hash << 3;
  hash ^= hash >>> 17;
  hash += hash << 5;

  return (hash >>> 0) / 4294967295;
}

function priceAt(symbol, basePrice, sessionDate, minuteIndex) {
  let price = basePrice;

  for (let minute = 1; minute <= minuteIndex; minute += 1) {
    const random = random01(`${symbol}:${sessionDate}:${minute}`);
    const returnPct = (random - 0.5) * 0.0008;
    price *= 1 + returnPct;
  }

  return Number(price.toFixed(2));
}

function getHistory(symbol, basePrice, sessionDate, minuteIndex) {
  const firstMinute = Math.max(0, minuteIndex - 59);
  const history = [];

  for (let minute = firstMinute; minute <= minuteIndex; minute += 1) {
    const close = priceAt(symbol, basePrice, sessionDate, minute);

    history.push({
      time: minute,
      close,
    });
  }

  return history;
}

export async function GET() {
  try {
    const clock = getIndiaClock();
    const session = getSession(clock);

    const prices = Object.entries(BASE_PRICES).map(([symbol, basePrice]) => {
      const history = getHistory(
        symbol,
        basePrice,
        session.sessionDate,
        session.minuteIndex
      );

      const price = history[history.length - 1]?.close ?? basePrice;
      const firstPrice = history[0]?.close ?? price;
      const changePct =
        firstPrice > 0
          ? (((price - firstPrice) / firstPrice) * 100).toFixed(2)
          : '0.00';

      return {
        symbol,
        price,
        changePct: `${Number(changePct) > 0 ? '+' : ''}${changePct}%`,
        history,
      };
    });

    return NextResponse.json(
      {
        mode: 'prototype',
        isRealHistoricalData: false,
        dataLabel: 'SIMULATED MARKET DATA',
        marketOpen: session.open,
        indiaTime: session.indiaTime,
        sessionDate: session.sessionDate,
        prices,
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (error) {
    console.error('Historical simulation API error:', error);

    return NextResponse.json(
      { error: 'Could not generate simulated prices.' },
      { status: 500 }
    );
  }
}