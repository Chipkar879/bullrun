import { admin } from './supabaseAdmin';

export async function getServerPrices(origin) {
  const res = await fetch(`${origin}/api/historical-prices`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Price API returned ${res.status}`);
  const json = await res.json();
  const map = {};
  (json.prices || []).forEach((item) => {
    const price = Number(item.price);
    if (item.symbol && Number.isFinite(price) && price > 0) map[item.symbol] = price;
  });
  return map;
}

export function isIndianMarketOpen(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata', weekday: 'short',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const get = (t) => parts.find((p) => p.type === t)?.value;
  const mins = Number(get('hour')) * 60 + Number(get('minute'));
  return !['Sat', 'Sun'].includes(get('weekday')) && mins >= 9 * 60 + 15 && mins < 15 * 60 + 30;
}

export async function recomputeNetWorth(userId, prices) {
  const [{ data: prof, error: e1 }, { data: rows, error: e2 }] = await Promise.all([
    admin.from('profiles').select('wallet_balance').eq('id', userId).single(),
    admin.from('user_holdings').select('sym, shares, avg_price').eq('user_id', userId),
  ]);
  if (e1 || e2) throw e1 || e2;

  const holdingsValue = (rows || []).reduce(
    (sum, r) => sum + Number(r.shares) * Number(prices[r.sym] ?? r.avg_price ?? 0), 0);
  const net = Number((Number(prof.wallet_balance) + holdingsValue).toFixed(2));

  const { error } = await admin.from('profiles').update({ net_worth: net }).eq('id', userId);
  if (error) throw error;
  return net;
}