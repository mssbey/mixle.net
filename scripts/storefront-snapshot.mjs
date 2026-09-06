// Vitrin regresyon referansı.
//
// Üretim derlemesini başlatır, temsili rotaları çeker ve HTML'lerini bir klasöre
// yazar. Veri katmanı değişiklikleri öncesi/sonrası çalıştırılıp `diff` ile
// karşılaştırmak içindir: çıktı farkı = vitrin regresyonu.
//
// Kullanım:
//   node scripts/storefront-snapshot.mjs <cikti-klasoru> [port]
//
// Not: `next build` çağırmaz — derlemenin hazır olduğunu varsayar.
//      Önce `npm run build` çalıştırın.

import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const outDir = process.argv[2];
const port = Number(process.argv[3] ?? 3999);

if (!outDir) {
  console.error('Kullanım: node scripts/storefront-snapshot.mjs <cikti-klasoru> [port]');
  process.exit(1);
}

/** Vitrinin veri katmanına dokunan temsili rotaları. */
const ROUTES = [
  '/',
  '/urunler',
  '/urunler?kategori=meyveli',
  '/urunler?siralama=fiyat-artan',
  '/kategori/meyveli',
  '/kategori/ferah',
  '/kategori/tatli-kremsi',
  '/kategori/icecek',
  '/kategori/tutun',
  '/kategori/mix',
  '/kategori/diy-kitler',
  '/kategori/nbase',
  '/koleksiyon/golden-drop',
  '/koleksiyon/purple-reserve',
  '/koleksiyon/fresh-lab',
  '/urun/purple-mirage',
  '/cok-satanlar',
  '/yeni-gelenler',
  '/kampanyalar',
  '/arama?q=vanilya',
  '/sepet',
  '/favoriler',
  '/aroma-rehberi',
  '/sss',
  '/hakkimizda',
  '/sitemap.xml',
];

/** Her istekte değişen, karşılaştırmayı anlamsız kılan parçaları temizler. */
function normalize(html) {
  return html
    // Next.js derleme kimliği ve chunk karmaları
    .replace(/"buildId":"[^"]*"/g, '"buildId":"<BUILD>"')
    .replace(/\/_next\/static\/[^/"']+\//g, '/_next/static/<HASH>/')
    .replace(/\?dpl=[a-z0-9]+/gi, '?dpl=<DPL>')
    // React akış sınırlarının rastgele kimlikleri
    .replace(/(_R_|_r_|B:|S:|P:)[0-9a-z]+/g, '$1<ID>')
    .replace(/id="_?R[0-9a-z]*"/g, 'id="<RID>"')
    // Zaman damgaları
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z/g, '<TS>')
    .replace(/<lastmod>[^<]*<\/lastmod>/g, '<lastmod><TS></lastmod>');
}

function fileNameFor(route) {
  const safe = route.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '') || 'index';
  return `${safe}.html`;
}

async function waitForServer(url, timeoutMs = 90_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(url, { redirect: 'manual' });
      if (res.status > 0) return;
    } catch {
      // sunucu henüz ayakta değil
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Sunucu ${timeoutMs} ms içinde açılmadı: ${url}`);
}

const base = `http://127.0.0.1:${port}`;

const server = spawn(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['next', 'start', '-p', String(port)],
  { stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32' },
);

let serverLog = '';
server.stdout.on('data', (d) => (serverLog += d));
server.stderr.on('data', (d) => (serverLog += d));

let failures = 0;

try {
  await waitForServer(base);
  await mkdir(outDir, { recursive: true });

  for (const route of ROUTES) {
    const res = await fetch(base + route, { headers: { 'accept-language': 'tr-TR' } });
    const body = await res.text();
    if (!res.ok) {
      failures += 1;
      console.error(`  ${res.status} ${route}`);
    }
    const header = `<!-- ${route} | HTTP ${res.status} -->\n`;
    await writeFile(path.join(outDir, fileNameFor(route)), header + normalize(body), 'utf8');
    console.log(`  ${res.status} ${route}`);
  }
} catch (err) {
  console.error(err);
  console.error('--- sunucu günlüğü ---');
  console.error(serverLog.slice(-2000));
  failures += 1;
} finally {
  server.kill();
}

console.log(
  failures === 0
    ? `\nAnlık görüntü tamam: ${outDir}`
    : `\n${failures} rota başarısız — çıktı yine de yazıldı: ${outDir}`,
);
process.exit(failures === 0 ? 0 : 1);
