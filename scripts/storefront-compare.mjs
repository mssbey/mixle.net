// İki vitrin anlık görüntüsünü GÖRÜNÜR İÇERİK düzeyinde karşılaştırır.
//
// Ham HTML karşılaştırması işe yaramaz: Next.js chunk adları, RSC akış verisi ve
// script sırası derlemeden derlemeye değişir. Burada script/style blokları ve
// etiketler atılır, geriye kullanıcının gördüğü metin + bağlantı hedefleri kalır.
//
// Kullanım: node scripts/storefront-compare.mjs <onceki> <sonraki>

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const [beforeDir, afterDir] = process.argv.slice(2);
if (!beforeDir || !afterDir) {
  console.error('Kullanım: node scripts/storefront-compare.mjs <onceki> <sonraki>');
  process.exit(1);
}

/**
 * Derlemeden derlemeye değişen varlık adlarını temizler (chunk / CSS / font
 * karmaları). Bunlar içerik değil, derleme artefaktıdır.
 */
function stripAssets(text) {
  return text
    .replace(/\/_next\/[^\s"')]*/g, '<ASSET>')
    .replace(/\/[A-Za-z0-9_-]+\.(?:css|js|mjs|woff2?|map)\b/g, '<ASSET>');
}

/** HTML'den kullanıcıya görünen metni çıkarır. */
function visibleText(html) {
  return stripAssets(html)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#x27;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Sayfadaki iç bağlantı hedefleri — sıralama/liste değişikliklerini yakalar. */
function links(html) {
  const out = [];
  const re = /href="(\/[^"]*)"/g;
  let m;
  while ((m = re.exec(html))) {
    // Varlık bağlantıları (chunk / CSS / font) içerik değildir.
    if (m[1].startsWith('/_next/') || /\.(css|js|mjs|woff2?|map)$/.test(m[1])) continue;
    out.push(m[1]);
  }
  return out;
}

/** Görsel kaynakları — ürün kartlarının doğru görselleri gösterdiğini doğrular. */
function images(html) {
  const out = [];
  const re = /(?:src|srcSet)="([^"]*(?:webp|png|jpg|svg)[^"]*)"/gi;
  let m;
  while ((m = re.exec(html))) out.push(m[1].split('?')[0]);
  return out;
}

function firstDifference(a, b) {
  const len = Math.min(a.length, b.length);
  let i = 0;
  while (i < len && a[i] === b[i]) i += 1;
  const start = Math.max(0, i - 90);
  return {
    index: i,
    before: a.slice(start, i + 160),
    after: b.slice(start, i + 160),
  };
}

const files = (await readdir(beforeDir)).filter((f) => f.endsWith('.html')).sort();

let identical = 0;
const differing = [];

for (const file of files) {
  let a, b;
  try {
    a = await readFile(path.join(beforeDir, file), 'utf8');
    b = await readFile(path.join(afterDir, file), 'utf8');
  } catch {
    differing.push({ file, kind: 'eksik dosya' });
    continue;
  }

  const ta = visibleText(a);
  const tb = visibleText(b);
  const la = links(a).join('\n');
  const lb = links(b).join('\n');
  const ia = images(a).join('\n');
  const ib = images(b).join('\n');

  const problems = [];
  if (ta !== tb) problems.push('metin');
  if (la !== lb) problems.push('bağlantılar');
  if (ia !== ib) problems.push('görseller');

  if (problems.length === 0) {
    identical += 1;
  } else {
    differing.push({ file, kind: problems.join(' + '), diff: firstDifference(ta, tb) });
  }
}

console.log(`Karşılaştırılan sayfa : ${files.length}`);
console.log(`Birebir aynı          : ${identical}`);
console.log(`Farklı                : ${differing.length}`);

for (const d of differing) {
  console.log(`\n--- ${d.file}  (${d.kind})`);
  if (d.diff && d.diff.before !== d.diff.after) {
    console.log(`  ÖNCE : ...${d.diff.before}...`);
    console.log(`  SONRA: ...${d.diff.after}...`);
  }
}

process.exit(differing.length === 0 ? 0 : 1);
