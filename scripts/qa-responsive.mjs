import puppeteer from 'puppeteer-core';

import { findChrome } from './chrome-path.mjs';
const CHROME = findChrome();
const BASE = 'http://localhost:3111';
const WIDTHS = [360, 390, 768, 1024, 1440, 1920];
const PAGES = [
  '/', '/urunler', '/kategori/meyveli', '/koleksiyon/purple-reserve',
  '/urun/purple-mirage', '/sepet', '/favoriler', '/aroma-rehberi',
  '/hakkimizda', '/sss', '/iletisim', '/kampanyalar', '/arama?q=mango', '/arama?q=zzzz', '/does-not-exist',
  '/odeme', '/giris', '/kayit', '/siparis-takibi',
];

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
const page = await browser.newPage();

let issues = 0;
for (const width of WIDTHS) {
  await page.setViewport({ width, height: 900 });
  for (const path of PAGES) {
    await page.goto(BASE + path, { waitUntil: 'networkidle0', timeout: 20000 });
    await new Promise((r) => setTimeout(r, 150));
    const result = await page.evaluate(() => {
      const sw = document.documentElement.scrollWidth;
      const iw = window.innerWidth;
      let culprit = null;
      if (sw > iw) {
        let worst = null;
        document.querySelectorAll('body *').forEach((el) => {
          if (el.scrollWidth > iw + 2) {
            const r = el.getBoundingClientRect();
            if (!worst || el.scrollWidth > worst.scrollWidth) {
              worst = { tag: el.tagName, cls: el.className.toString().slice(0, 80), scrollWidth: el.scrollWidth };
            }
          }
        });
        culprit = worst;
      }
      return { sw, iw, overflow: sw > iw, culprit };
    });
    if (result.overflow) {
      issues++;
      console.log(`TAŞMA  ${width}px  ${path}  scrollWidth=${result.sw} > innerWidth=${result.iw}`);
      if (result.culprit) console.log(`        şüpheli: <${result.culprit.tag} class="${result.culprit.cls}"> sw=${result.culprit.scrollWidth}`);
    } else {
      console.log(`ok     ${width}px  ${path}`);
    }
  }
}

console.log(`\nTOPLAM TAŞMA: ${issues}`);
await browser.close();
process.exit(issues > 0 ? 1 : 0);
