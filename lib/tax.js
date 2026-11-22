// lib/tax.js
// Practice-money report card: matches sells to earlier buys (oldest first) and estimates a
// made-up "practice gains tax". The tax is an ESTIMATE only and is never taken from cash.
// All rates are invented for this simulation. Change a number here to retune.

export const TAX = {
  shortDays: 30,     // holding shorter than this many days counts as a short hold
  shortRate: 0.2,    // practice rate on net gains from short holds
  longRate: 0.1,     // practice rate on net gains from longer holds
};

const DAY = 86400000;
const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

// rows = the user's trade_history rows, oldest first.
export function buildReport(rows) {
  const lots = {};          // sym -> [{ qty, price, feePerUnit, t }]
  const sells = [];         // one entry per sell order
  let charges = 0;
  let slippage = 0;
  let buys = 0;
  let sellCount = 0;
  let unmatchedQty = 0;
  let shortGain = 0;
  let longGain = 0;
  let heldDaysWeighted = 0;
  let heldQty = 0;

  (rows || []).forEach((row) => {
    const qty = Number(row.qty);
    const price = Number(row.price);
    const fees = Number(row.fees_total || 0);
    const t = new Date(row.created_at).getTime();
    charges += fees;
    slippage += Number(row.fees?.slippage || 0);
    if (!(qty > 0)) return;

    if (row.side === 'BUY') {
      buys += 1;
      (lots[row.sym] = lots[row.sym] || []).push({ qty, price, feePerUnit: fees / qty, t });
      return;
    }

    sellCount += 1;
    const queue = lots[row.sym] || [];
    const sellFeePerUnit = fees / qty;
    let remaining = qty;
    let gain = 0;
    let matched = 0;
    while (remaining > 1e-9 && queue.length) {
      const lot = queue[0];
      const take = Math.min(lot.qty, remaining);
      const g = (price - lot.price) * take - take * (lot.feePerUnit + sellFeePerUnit);
      const days = (t - lot.t) / DAY;
      gain += g;
      matched += take;
      heldDaysWeighted += days * take;
      heldQty += take;
      if (days < TAX.shortDays) shortGain += g; else longGain += g;
      lot.qty -= take;
      remaining -= take;
      if (lot.qty <= 1e-9) queue.shift();
    }
    if (remaining > 1e-9) unmatchedQty += remaining;
    if (matched > 0) sells.push({ sym: row.sym, gain: r2(gain), t });
  });

  const realized = r2(shortGain + longGain);
  const estTax = r2(Math.max(0, shortGain) * TAX.shortRate + Math.max(0, longGain) * TAX.longRate);
  const wins = sells.filter((s) => s.gain > 0).length;
  const sorted = [...sells].sort((a, b) => b.gain - a.gain);

  return {
    trades: buys + sellCount,
    buys,
    sells: sellCount,
    chargesPaid: r2(charges),
    slippagePaid: r2(slippage),
    realizedGain: realized,
    shortHoldGain: r2(shortGain),
    longHoldGain: r2(longGain),
    estimatedTax: estTax,
    afterTaxGain: r2(realized - estTax),
    winRatePct: sells.length ? Math.round((wins / sells.length) * 100) : null,
    wins,
    losses: sells.length - wins,
    avgHoldDays: heldQty > 0 ? Math.round((heldDaysWeighted / heldQty) * 10) / 10 : null,
    best: sorted.length && sorted[0].gain > 0 ? sorted[0] : null,
    worst: sorted.length && sorted[sorted.length - 1].gain < 0 ? sorted[sorted.length - 1] : null,
    unmatchedQty: Math.round(unmatchedQty * 10000) / 10000,
    rates: { ...TAX },
  };
}
