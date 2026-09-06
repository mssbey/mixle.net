import puppeteer from 'puppeteer-core';

import { findChrome } from './chrome-path.mjs';
const CHROME = findChrome();
const BASE = 'http://localhost:3111';
const PAGES = [
  '/', '/urunler', '/kategori/meyveli', '/koleksiyon/purple-reserve',
  '/urun/purple-mirage', '/yeni-gelenler', '/cok-satanlar', '/kampanyalar',
  '/aroma-rehberi', '/hakkimizda', '/sss', '/iletisim', '/favoriler', '/sepet',
  '/arama?q=meyve', '/gizlilik-politikasi', '/mesafeli-satis-sozlesmesi',
  '/iade-ve-teslimat', '/cerez-politikasi', '/hesabim', '/does-not-exist',
  // F1: checkout ve hesap akışları (oturumsuz — /hesabim girişe yönlenir)
  '/odeme', '/giris', '/kayit', '/siparis-takibi', '/siparis/tamamlandi?no=NA-2026-000001',
];

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--window-size=1440,900'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

let totalIssues = 0;
for (const path of PAGES) {
  const messages = [];
  const onConsole = (msg) => {
    const type = msg.type();
    const expected404 = path === '/does-not-exist' && msg.location().url === BASE + path && msg.text().includes('404 (Not Found)');
    if (!expected404 && (type === 'error' || type === 'warning')) messages.push(`[${type}] ${msg.text()}`);
  };
  const onPageError = (err) => messages.push(`[pageerror] ${err.message}`);
  page.on('console', onConsole);
  page.on('pageerror', onPageError);

  try {
    const res = await page.goto(BASE + path, { waitUntil: 'networkidle0', timeout: 20000 });
    const status = res ? res.status() : 'no-response';
    const expected = path === '/does-not-exist' ? 404 : 200;
    if (status !== expected) messages.push('[http] Expected ' + expected + ', received ' + status);
    await new Promise((r) => setTimeout(r, 300));
    console.log(`\n=== ${path} [HTTP ${status}] ===`);
    if (messages.length === 0) console.log('  (temiz)');
    for (const m of messages) {
      console.log('  ' + m);
      totalIssues++;
    }
  } catch (e) {
    console.log(`\n=== ${path} ===`);
    console.log('  [nav-error] ' + e.message);
    totalIssues++;
  }
  page.off('console', onConsole);
  page.off('pageerror', onPageError);
}

console.log(`\nTOPLAM SORUN: ${totalIssues}`);
await browser.close();
process.exit(totalIssues > 0 ? 1 : 0);
