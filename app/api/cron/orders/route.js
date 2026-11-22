import { processOrders } from '@/lib/orderEngine';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Called by the scheduled job in vercel.json. Vercel sends "Authorization: Bearer <CRON_SECRET>".
export async function GET(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== 'Bearer ' + secret) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const result = await processOrders(new URL(req.url).origin, null);
    return Response.json({
      filled: result.filled.length,
      failed: result.failed.length,
      expired: result.expired.length,
    });
  } catch (e) {
    console.error('cron orders failed', e);
    return Response.json({ error: 'Cron failed' }, { status: 500 });
  }
}
