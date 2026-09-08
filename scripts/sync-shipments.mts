// Kargo takip senkronizasyonu — ops betiği.
//
// Sunucu içindeki mantık `server-only` kullandığı için (bkz. proje kuralları)
// bu betik doğrudan içe aktaramaz; onun yerine korumalı cron ucuna HTTP isteği
// atar (`/api/cron/kargo-takip`) — Vercel Cron / Windows Görev Zamanlayıcı /
// systemd timer'ın üretimde yapacağı işin aynısı.
//
// Kullanım:
//   BASE_URL=https://magaza.com CRON_SECRET=... npx tsx scripts/sync-shipments.mts
// Yerelde (npm run dev/start çalışırken):
//   CRON_SECRET=... npx tsx scripts/sync-shipments.mts

import 'dotenv/config';

const base = (process.env.BASE_URL ?? 'http://127.0.0.1:3000').replace(/\/$/, '');
const secret = process.env.CRON_SECRET;

if (!secret) {
  console.error('CRON_SECRET tanımlı değil. .env dosyasına ekleyin ve ortama aynı değeri verin.');
  process.exit(1);
}

interface SyncResult {
  shipmentId: string;
  updated: boolean;
  reason: string;
  newStatus?: string;
}

try {
  const res = await fetch(`${base}/api/cron/kargo-takip`, {
    method: 'POST',
    headers: { authorization: `Bearer ${secret}` },
  });
  const body = (await res.json().catch(() => ({}))) as { ok?: boolean; total?: number; updated?: number; results?: SyncResult[]; message?: string };
  if (!res.ok) {
    console.error(`İstek başarısız (${res.status}): ${body.message ?? 'bilinmeyen hata'}`);
    process.exit(1);
  }
  console.log(`Toplam ${body.total ?? 0} aktif sevkiyat kontrol edildi, ${body.updated ?? 0} tanesi güncellendi.`);
  for (const r of body.results ?? []) {
    if (r.updated) console.log(`  ✓ ${r.shipmentId} → ${r.newStatus}`);
  }
  const skipped = (body.results ?? []).filter((r) => !r.updated);
  if (skipped.length > 0 && skipped.length === (body.total ?? 0)) {
    console.log(`  (Hiçbiri güncellenmedi — bağlı bir taşıyıcı API'si yok, bu beklenen durum: ${skipped[0]?.reason ?? ''})`);
  }
} catch (err) {
  console.error(`${base} adresine ulaşılamadı:`, err instanceof Error ? err.message : err);
  process.exit(1);
}
