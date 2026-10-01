// Toplu fiyat güncelleme duman testi (/api/admin/products/fiyat).
//
// Çalışan bir sunucuya karşı: seçili ürünler / kategoriler (alt kategoriler
// dahil) / tüm ürünler için fiyat düşür / artır (yüzde ve tutar) ve indirimi
// kaldır; doğrulama hataları; görüntüleyici 403; vitrinde yeni fiyat. Başta tüm varyant
// fiyatları yedeklenir, sonda geri yüklenir; geçici kullanıcılar silinir.
//
// YALNIZ YEREL DB: DATABASE_URL localhost değilse çalışmaz.
// Kullanım: npx tsx scripts/price-adjust-smoke.mts [port]

import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { hashPassword } from '../src/server/auth/password';
import { adjustPrice, withDescendants } from '../src/lib/admin/pricing';
import { formatMinor } from '../src/lib/money';

const url = process.env.DATABASE_URL ?? '';
if (!/@(localhost|127\.0\.0\.1)[:/]/.test(url)) throw new Error('Yalnız yerel veritabanında çalışır.');

const port = Number(process.argv[2] ?? 3000);
const base = `http://127.0.0.1:${port}`;
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

let passed = 0;
const failures: string[] = [];
const check = (name: string, ok: boolean, detail = '') => {
  if (ok) { passed += 1; console.log(`  ✓ ${name}`); }
  else { failures.push(`${name}${detail ? ` — ${detail}` : ''}`); console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); }
};

async function api(path: string, body: unknown, cookie?: string) {
  const res = await fetch(base + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: base, ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let parsed: Record<string, unknown> = {};
  try { parsed = JSON.parse(text); } catch { parsed = { raw: text.slice(0, 200) }; }
  return { status: res.status, body: parsed, cookie: res.headers.getSetCookie?.() ?? [] };
}

type P = { priceMinor: number; compareAtPriceMinor: number | null };
const snap = async () =>
  new Map(
    (await db.variant.findMany({ select: { id: true, productId: true, priceMinor: true, compareAtPriceMinor: true } })).map(
      (v) => [v.id, v],
    ),
  );
const same = (a: P, b: P) => a.priceMinor === b.priceMinor && a.compareAtPriceMinor === b.compareAtPriceMinor;

/** `before` → `after` arasında: hedef varyantlar beklenen değeri aldı mı, diğerleri dokunulmadan mı kaldı. */
function verify(
  name: string,
  before: Awaited<ReturnType<typeof snap>>,
  after: Awaited<ReturnType<typeof snap>>,
  inScope: (productId: string) => boolean,
  expect: (v: P) => P,
) {
  let wrong = 0, leaked = 0, touched = 0;
  let sample = '';
  for (const [id, b] of before) {
    const a = after.get(id)!;
    if (inScope(b.productId)) {
      const e = expect(b);
      if (!same(a, e)) { wrong++; sample ||= `${id}: ${b.priceMinor}/${b.compareAtPriceMinor} → ${a.priceMinor}/${a.compareAtPriceMinor}, beklenen ${e.priceMinor}/${e.compareAtPriceMinor}`; }
      if (!same(a, b)) touched++;
    } else if (!same(a, b)) leaked++;
  }
  check(`${name}: kapsamdaki fiyatlar doğru (${touched} varyant değişti)`, wrong === 0 && touched > 0, sample || `wrong=${wrong} touched=${touched}`);
  check(`${name}: kapsam dışı fiyatlar değişmedi`, leaked === 0, `${leaked} varyant sızdı`);
}

const runId = randomUUID().slice(0, 8);
const ownerEmail = `fiyat-sahip-${runId}@mixle.test`;
const viewerEmail = `fiyat-gor-${runId}@mixle.test`;
const pw = `Test-${randomUUID()}`;

const original = await snap();
try {
  await db.user.create({ data: { email: ownerEmail, passwordHash: await hashPassword(pw), name: 'Fiyat Test', role: 'sahip' } });
  await db.user.create({ data: { email: viewerEmail, passwordHash: await hashPassword(pw), name: 'Fiyat Test', role: 'görüntüleyici' } });
  const login = async (email: string) =>
    (await api('/api/admin/auth', { email, password: pw })).cookie.find((c) => c.startsWith('na_oturum='))?.split(';')[0] ?? '';
  const cookie = await login(ownerEmail);
  const vcookie = await login(viewerEmail);
  check('giriş', Boolean(cookie && vcookie));
  const F = '/api/admin/products/fiyat';

  // --- doğrulama ---
  console.log('\nDoğrulama');
  { const x = await api(F, { scope: 'tumu', mode: 'dusur', value: 100 }, cookie); check('düşür %100 reddedilir (4xx, yazmaz)', x.status >= 400 && x.status < 500, `status=${x.status} ${JSON.stringify(x.body)}`); }
  { const x = await api(F, { scope: 'tumu', mode: 'artir', value: 0 }, cookie); check('oran 0 reddedilir (4xx, yazmaz)', x.status >= 400 && x.status < 500, `status=${x.status} ${JSON.stringify(x.body)}`); }
  { const x = await api(F, { scope: 'secili', mode: 'artir', value: 5 }, cookie); check('seçili ama ürün yok reddedilir (4xx, yazmaz)', x.status >= 400 && x.status < 500, `status=${x.status} ${JSON.stringify(x.body)}`); }
  { const x = await api(F, { scope: 'kategori', mode: 'artir', value: 5 }, cookie); check('kategori ama kategori yok reddedilir (4xx, yazmaz)', x.status >= 400 && x.status < 500, `status=${x.status} ${JSON.stringify(x.body)}`); }
  check('görüntüleyici → 403', (await api(F, { scope: 'tumu', mode: 'artir', value: 5 }, vcookie)).status === 403);
  check('oturumsuz → 401', (await api(F, { scope: 'tumu', mode: 'artir', value: 5 })).status === 401);

  // --- belirli ürünler ---
  console.log('\nBelirli ürünler');
  const products = await db.product.findMany({ where: { variants: { some: { priceMinor: { gt: 1000 } } } }, select: { id: true, slug: true }, take: 3, orderBy: { id: 'asc' } });
  const ids = products.map((p) => p.id);
  const inIds = (pid: string) => ids.includes(pid);
  let before = await snap();
  const dry = await api(F, { scope: 'secili', ids, mode: 'dusur', value: 10, dryRun: true }, cookie);
  check('önizleme (dryRun) yazmaz', dry.status === 200 && [...(await snap())].every(([id, v]) => same(v, before.get(id)!)), JSON.stringify(dry.body));
  check(`önizleme ürün sayısı = ${ids.length}`, dry.body.products === ids.length, JSON.stringify(dry.body));
  let r = await api(F, { scope: 'secili', ids, mode: 'dusur', value: 10 }, cookie);
  let after = await snap();
  verify('%10 düşür', before, after, inIds, (v) => (adjustPrice(v, { mode: 'dusur', value: 10 }) ?? v));

  before = after;
  r = await api(F, { scope: 'secili', ids, mode: 'dusur', value: 20 }, cookie);
  after = await snap();
  verify('üstüne %20 düşür (yeni fiyattan)', before, after, inIds, (v) => (adjustPrice(v, { mode: 'dusur', value: 20 }) ?? v));
  const orig0 = [...original.values()].find((v) => v.productId === ids[0])!;
  const now0 = [...after.values()].find((v) => v.id === [...original].find(([, o]) => o.productId === ids[0])![0])!;
  check('%10 + %20 üst üste: üstü çizili fiyat yok', now0.priceMinor === Math.round(Math.round(orig0.priceMinor * 0.9) * 0.8) && now0.compareAtPriceMinor === orig0.compareAtPriceMinor, `${orig0.priceMinor} → ${now0.priceMinor}/${now0.compareAtPriceMinor}`);

  // vitrin
  const slug = products[0].slug;
  const want = formatMinor(now0.priceMinor);
  let html = '', status = 0;
  for (let i = 0; i < 8 && !html.includes(want); i++) {
    const res = await fetch(`${base}/urun/${slug}`);
    status = res.status;
    html = await res.text();
    if (!html.includes(want)) await new Promise((ok) => setTimeout(ok, 750));
  }
  check(`vitrin /urun/${slug} yeni fiyatı gösterir (${want})`, html.includes(want), `status=${status}, html ${html.length} bayt`);

  before = after;
  r = await api(F, { scope: 'secili', ids, mode: 'indirim-kaldir' }, cookie);
  after = await snap();
  // "Düşür" üstü çizili fiyat oluşturmaz; yalnız önceden indirimli varyantlar değişir.
  const hadSale = (pid: string) => [...before.values()].some((v) => v.productId === pid && v.compareAtPriceMinor != null && v.compareAtPriceMinor > v.priceMinor);
  if (ids.some(hadSale)) verify('indirimi kaldır', before, after, (pid) => inIds(pid) && hadSale(pid), (v) => adjustPrice(v, { mode: 'indirim-kaldir' })!);
  else check('indirimi kaldır: üstü çizili fiyat yoksa hiçbir şey değişmez', [...after].every(([id, v]) => same(v, before.get(id)!)));
  check('indirim kaldırınca üstü çizili fiyat kalmaz', [...after.values()].filter((v) => inIds(v.productId)).every((v) => v.compareAtPriceMinor == null));

  before = after;
  r = await api(F, { scope: 'secili', ids, mode: 'artir', value: 10, roundUp: true }, cookie);
  after = await snap();
  verify('%10 artır + üst liraya yuvarla', before, after, inIds, (v) => (adjustPrice(v, { mode: 'artir', value: 10, roundUp: true }) ?? v));
  check('yuvarlanan fiyatlar tam lira', [...after.values()].filter((v) => inIds(v.productId)).every((v) => v.priceMinor % 100 === 0));

  // --- kategoriler ---
  console.log('\nBelirli kategoriler');
  const cats = await db.category.findMany({ select: { id: true, parentId: true, name: true } });
  const priced = new Set((await db.productCategory.findMany({ where: { product: { variants: { some: { priceMinor: { gt: 0 } } } } }, select: { categoryId: true } })).map((x) => x.categoryId));
  const parent = cats.find((c) => priced.has(c.id) && cats.some((x) => x.parentId === c.id && priced.has(x.id))) ?? cats.find((c) => priced.has(c.id))!;
  const scopeCats = withDescendants(cats, [parent.id]);
  const inCatProducts = new Set((await db.productCategory.findMany({ where: { categoryId: { in: scopeCats } }, select: { productId: true } })).map((x) => x.productId));
  const childOnly = new Set((await db.productCategory.findMany({ where: { categoryId: { in: scopeCats.filter((c) => c !== parent.id) } }, select: { productId: true } })).map((x) => x.productId));
  console.log(`  (kategori "${parent.name}", ${scopeCats.length - 1} alt kategori, ${inCatProducts.size} ürün; ${childOnly.size} ürün alt kategoriden)`);
  before = await snap();
  r = await api(F, { scope: 'kategori', categoryIds: [parent.id], mode: 'dusur', value: 15, dryRun: true }, cookie);
  const catChanging = new Set([...before.values()].filter((v) => inCatProducts.has(v.productId) && v.priceMinor > 0).map((v) => v.productId));
  check(`önizleme ürün sayısı = ${catChanging.size} (fiyatı 0 olmayan)`, r.body.products === catChanging.size, JSON.stringify(r.body));
  r = await api(F, { scope: 'kategori', categoryIds: [parent.id], mode: 'dusur', value: 15 }, cookie);
  after = await snap();
  verify('kategori %15 düşür', before, after, (pid) => inCatProducts.has(pid), (v) => (adjustPrice(v, { mode: 'dusur', value: 15 }) ?? v));
  before = after;
  r = await api(F, { scope: 'kategori', categoryIds: [parent.id], mode: 'artir', value: 7.5 }, cookie);
  after = await snap();
  verify('kategori %7,5 artır (ondalık oran)', before, after, (pid) => inCatProducts.has(pid), (v) => (adjustPrice(v, { mode: 'artir', value: 7.5 }) ?? v));

  // --- tüm ürünler ---
  console.log('\nTüm ürünler');
  before = await snap();
  r = await api(F, { scope: 'tumu', mode: 'dusur', value: 25, dryRun: true }, cookie);
  const allProducts = new Set([...before.values()].filter((v) => v.priceMinor > 0).map((v) => v.productId)).size;
  check(`önizleme: ${allProducts} ürün (fiyatı 0 olmayan)`, r.body.products === allProducts, JSON.stringify(r.body));
  const t0 = Date.now();
  r = await api(F, { scope: 'tumu', mode: 'dusur', value: 25 }, cookie);
  console.log(`  (uygulama ${Date.now() - t0} ms, yanıt ${JSON.stringify(r.body)})`);
  after = await snap();
  verify('tümüne %25 düşür', before, after, () => true, (v) => (adjustPrice(v, { mode: 'dusur', value: 25 }) ?? v));
  before = after;
  r = await api(F, { scope: 'tumu', mode: 'artir', value: 12 }, cookie);
  after = await snap();
  verify('tümüne %12 artır', before, after, () => true, (v) => (adjustPrice(v, { mode: 'artir', value: 12 }) ?? v));
  before = after;
  r = await api(F, { scope: 'tumu', mode: 'indirim-kaldir' }, cookie);
  after = await snap();
  verify('tümünden indirimi kaldır', before, after, (pid) => [...before.values()].some((v) => v.productId === pid && v.compareAtPriceMinor != null && v.compareAtPriceMinor > v.priceMinor), (v) => adjustPrice(v, { mode: 'indirim-kaldir' })!);

  const audits = await db.auditLog.count({ where: { userEmail: ownerEmail } });
  check('denetim kaydı yazıldı', audits >= 8, `${audits} kayıt`);
} finally {
  // Fiyatları geri yükle
  const rows = [...original.values()];
  for (let i = 0; i < rows.length; i += 200) {
    await db.$transaction(rows.slice(i, i + 200).map((v) => db.variant.update({ where: { id: v.id }, data: { priceMinor: v.priceMinor, compareAtPriceMinor: v.compareAtPriceMinor } })));
  }
  const restored = await snap();
  check('fiyatlar ilk hâline geri yüklendi', [...original].every(([id, v]) => same(v, restored.get(id)!)));
  await db.user.deleteMany({ where: { email: { in: [ownerEmail, viewerEmail] } } });
  await db.$disconnect();
  console.log(`\n${passed} geçti, ${failures.length} başarısız`);
  for (const f of failures) console.log(`  ✗ ${f}`);
  process.exitCode = failures.length ? 1 : 0;
}
