// One shared place for school pricing. Used by the pricing page AND the server.
export const SLABS = [
  { from: 1, to: 10, rate: 99 },
  { from: 11, to: 30, rate: 85 },
  { from: 31, to: 100, rate: 72 },
  { from: 101, to: 200, rate: 62 },
  { from: 201, to: 1000, rate: 55 },
];

export const MAX_SELF_SERVE_STUDENTS = 1000;

// Each student is charged at the rate of their own band.
// Returns a whole number of rupees, or null if the count is invalid / above 1000 (custom quote).
export function calcSchoolPrice(n) {
  const count = Number(n);
  if (!Number.isInteger(count) || count < 1 || count > MAX_SELF_SERVE_STUDENTS) return null;
  let total = 0;
  for (const s of SLABS) {
    if (count >= s.from) {
      const inBand = Math.min(count, s.to) - s.from + 1;
      total += inBand * s.rate;
    }
  }
  return total;
}

export function formatINR(n) {
  return 'Rs ' + Number(n).toLocaleString('en-IN');
}