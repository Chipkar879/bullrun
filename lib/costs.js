// lib/costs.js
// Simulated trading charges. Pure functions, no imports, safe on server and browser.
// All rates and charge names are invented for this fictional market. Change a number here to retune.
// These are PRACTICE charges only. They do not describe any real broker, exchange or tax.

export const RATES = {
  STT_DELIVERY: 0.001,          // 0.1% on buy and sell (delivery)
  STT_INTRADAY_SELL: 0.00025,   // 0.025% on sell only (intraday)
  CTT_SELL: 0.0001,             // 0.01% on sell side (commodities)
  EXCHANGE: 0.0000297,          // 0.00297% of turnover (equity and funds)
  EXCHANGE_COMMODITY: 0.000021, // 0.0021% of turnover (simplified)
  EXCHANGE_CURRENCY: 0.0000035, // 0.00035% of turnover (simplified)
  SEBI: 0.000001,               // Rs 10 per crore
  STAMP_DELIVERY_BUY: 0.00015,  // 0.015% on buy (delivery)
  STAMP_OTHER_BUY: 0.00003,     // 0.003% on buy (intraday, commodity, currency)
  GST: 0.18,                    // on brokerage + SEBI + exchange
  BROKERAGE_PCT: 0.0003,        // intraday style: 0.03% ...
  BROKERAGE_CAP: 20,            // ... or Rs 20 per order, whichever is lower
  DP_CHARGE: 15,                // depository charge per delivery sell order
};

// Asset classes now come from lib/catalog.js (equity, etf, commodity, currency, index).
export { assetClassOf } from './catalog';

// Exchange charges differ by market (simplified practice rates).
function exchangeRate(cls) {
  if (cls === 'commodity') return RATES.EXCHANGE_COMMODITY;
  if (cls === 'currency') return RATES.EXCHANGE_CURRENCY;
  return RATES.EXCHANGE;
}

// Equity and ETF follow delivery/intraday rules. Commodity and currency do not.
export function usesDeliveryRules(cls) {
  return cls === 'equity' || cls === 'etf';
}

const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const r4 = (n) => Math.round((n + Number.EPSILON) * 10000) / 10000;
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const brokerage = (value) => Math.min(value * RATES.BROKERAGE_PCT, RATES.BROKERAGE_CAP);

function finish(lines) {
  const kept = lines.filter((l) => l.amount !== 0 || l.keepZero);
  const total = r2(kept.reduce((s, l) => s + l.amount, 0));
  return { lines: kept.map(({ key, label, amount }) => ({ key, label, amount })), total };
}

export function computeBuyCosts({ cls, price, qty }) {
  const value = price * qty;
  const delivery = usesDeliveryRules(cls);

  const brk = delivery ? 0 : r2(brokerage(value));
  const stt = delivery ? r2(value * RATES.STT_DELIVERY) : 0;
  const exch = r2(value * exchangeRate(cls));
  const sebi = r2(value * RATES.SEBI);
  const stamp = r2(value * (delivery ? RATES.STAMP_DELIVERY_BUY : RATES.STAMP_OTHER_BUY));
  const gst = r2(RATES.GST * (brk + exch + sebi));

  return finish([
    { key: 'brokerage', label: 'Brokerage', amount: brk, keepZero: true },
    { key: 'stt', label: 'Trade tax', amount: stt },
    { key: 'exchange', label: 'Market charges', amount: exch },
    { key: 'sebi', label: 'Regulator fee', amount: sebi },
    { key: 'stamp', label: 'Stamp charge', amount: stamp },
    { key: 'gst', label: 'Practice tax (18%)', amount: gst },
  ]);
}

// intradayQty = units sold that were bought earlier the same IST day.
// avgCost = the holding's average buy price (used to value the buy leg of the intraday part).
export function computeSellCosts({ cls, price, qty, intradayQty = 0, avgCost = 0 }) {
  const value = price * qty;

  if (!usesDeliveryRules(cls)) {
    const brk = r2(brokerage(value));
    const ctt = cls === 'commodity' ? r2(value * RATES.CTT_SELL) : 0;
    const exch = r2(value * exchangeRate(cls));
    const sebi = r2(value * RATES.SEBI);
    const gst = r2(RATES.GST * (brk + exch + sebi));
    return {
      ...finish([
        { key: 'brokerage', label: 'Brokerage', amount: brk, keepZero: true },
        { key: 'ctt', label: 'Commodity trade tax', amount: ctt },
        { key: 'exchange', label: 'Market charges', amount: exch },
        { key: 'sebi', label: 'Regulator fee', amount: sebi },
        { key: 'gst', label: 'Practice tax (18%)', amount: gst },
      ]),
      intradayQty: 0,
      deliveryQty: qty,
    };
  }

  const iq = r4(clamp(intradayQty, 0, qty));
  const dq = r4(qty - iq);
  const iv = iq * price;           // value of the intraday part at the sell price
  const dv = dq * price;           // value of the delivery part
  const bv = iq * avgCost;         // value of the intraday part at the buy price

  const brk = iq > 0 ? r2(brokerage(iv) + brokerage(bv)) : 0;
  const stt = r2(dv * RATES.STT_DELIVERY + iv * RATES.STT_INTRADAY_SELL);
  const exch = r2(value * exchangeRate(cls));
  const sebi = r2(value * RATES.SEBI);
  const dp = dq > 0 ? RATES.DP_CHARGE : 0;
  const gst = r2(RATES.GST * (brk + exch + sebi));
  // The buy was charged as delivery. The same-day part is re-priced as intraday:
  const rebateStt = iq > 0 ? -r2(bv * RATES.STT_DELIVERY) : 0;
  const rebateStamp = iq > 0 ? -r2(bv * (RATES.STAMP_DELIVERY_BUY - RATES.STAMP_OTHER_BUY)) : 0;

  return {
    ...finish([
      { key: 'brokerage', label: iq > 0 ? 'Brokerage (intraday, both legs)' : 'Brokerage', amount: brk, keepZero: true },
      { key: 'stt', label: 'Trade tax', amount: stt },
      { key: 'exchange', label: 'Market charges', amount: exch },
      { key: 'sebi', label: 'Regulator fee', amount: sebi },
      { key: 'gst', label: 'Practice tax (18%)', amount: gst },
      { key: 'dp', label: 'Custody charge', amount: dp },
      { key: 'rebate_stt', label: 'Same-day rebate: trade tax charged on the buy', amount: rebateStt },
      { key: 'rebate_stamp', label: 'Same-day rebate: stamp charge difference', amount: rebateStamp },
    ]),
    intradayQty: iq,
    deliveryQty: dq,
  };
}

// Sells use up units bought earlier today first, so same-day squaring is intraday.
export function intradayQtyFor({ boughtToday, soldToday, qty }) {
  return r4(clamp(boughtToday - soldToday, 0, qty));
}

// Start of the current India (IST, UTC+5:30) calendar day, in epoch milliseconds.
export function istDayStartMs(nowMs = Date.now()) {
  const OFFSET = 19800000;
  const DAY = 86400000;
  return Math.floor((nowMs + OFFSET) / DAY) * DAY - OFFSET;
}