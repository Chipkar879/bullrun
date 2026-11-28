import { getUserFromRequest } from '@/lib/supabaseAdmin';
import { studentSummary } from '@/lib/studentSummary';
import { getRank } from '@/lib/ranks';

export const dynamic = 'force-dynamic';

const MAX_IDS = 40;
const BATCH = 5;
const KEEP_MS = 30000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const cache = new Map();

// Works out a player's rank (Silver 1, Gold 2...). Only the rank is sent back, never their XP.
async function rankOf(id, fresh) {
  const hit = cache.get(id);
  if (!fresh && hit && Date.now() - hit.at < KEEP_MS) return hit.rank;
  const summary = await studentSummary({ id }, { save: false });
  const rank = getRank(summary.xp).rank.id;
  cache.set(id, { rank, at: Date.now() });
  return rank;
}

export async function POST(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const list = Array.isArray(body.ids) ? body.ids : [];
    const ids = [...new Set(list.filter((id) => typeof id === 'string' && UUID.test(id)))].slice(0, MAX_IDS);

    const ranks = {};
    for (let i = 0; i < ids.length; i += BATCH) {
      await Promise.all(
        ids.slice(i, i + BATCH).map(async (id) => {
          try {
            ranks[id] = await rankOf(id, id === user.id);
          } catch (e) {
            console.error('rank lookup failed', e);
            ranks[id] = null;
          }
        })
      );
    }
    return Response.json({ ranks });
  } catch (e) {
    console.error('leaderboard-ranks failed', e);
    return Response.json({ error: 'Could not load ranks' }, { status: 500 });
  }
}
