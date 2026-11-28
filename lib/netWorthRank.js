// One rule for the net worth rank, used by every page, so the numbers always match.
// Teachers and school admins are staff, so they are never ranked.
export const onlyRanked = (query) => query.not('role', 'in', '(teacher,school_admin)');

// Filter for "everyone placed above this person". Equal net worth is ordered by id.
export const aheadOf = (netWorth, id) =>
  `net_worth.gt.${netWorth},and(net_worth.eq.${netWorth},id.lt.${id})`;

export const isRankedProfile = (p) =>
  !!p.role &&
  p.role !== 'teacher' &&
  p.role !== 'school_admin' &&
  p.net_worth !== null &&
  p.net_worth !== undefined;

// World position of one user. Returns null if they have no saved net worth yet.
export async function getWorldRank(client, id) {
  const { data, error } = await client
    .from('profiles')
    .select('net_worth')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data || data.net_worth === null) return null;

  const netWorth = Number(data.net_worth);
  const { count, error: countError } = await onlyRanked(
    client.from('profiles').select('id', { count: 'exact', head: true })
  ).or(aheadOf(netWorth, id));
  if (countError) throw countError;

  return { rank: (count || 0) + 1, netWorth };
}
