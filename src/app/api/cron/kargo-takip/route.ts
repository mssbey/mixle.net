// Zamanlanmış kargo takip senkronizasyonu — Vercel Cron / harici zamanlayıcı
// buraya vurur. Panel oturumu gerektirmez; paylaşılan `CRON_SECRET` ile korunur.
// Aynı mantığı `/admin/kargolar` "Takibi yenile" ve `scripts/sync-shipments.mts`
// de kullanır (`syncAllActiveShipments`).

import { syncAllActiveShipments } from '@/server/shipping/tracking';

export const dynamic = 'force-dynamic';

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // yapılandırılmamışsa hiç çalıştırma — sessiz açık kapı olmasın
  const header = request.headers.get('authorization');
  const bearer = header?.startsWith('Bearer ') ? header.slice(7) : null;
  const query = new URL(request.url).searchParams.get('secret');
  return bearer === secret || query === secret;
}

async function run(request: Request): Promise<Response> {
  if (!authorized(request)) {
    return Response.json({ error: 'unauthorized', message: 'Geçersiz veya eksik CRON_SECRET.' }, { status: 401 });
  }
  const results = await syncAllActiveShipments();
  const updated = results.filter((r) => r.updated).length;
  return Response.json({ ok: true, total: results.length, updated, results });
}

export const GET = run;
export const POST = run;
