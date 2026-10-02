// Stok Yönetimi duman testi (/api/admin/stock/yonetim*).
//
// Çalışan bir sunucuya karşı: listeleme, stok "yap / +ekle / -düş", çakışma,
// negatif stok, fiyat (üstü çizili temizlenir), SKU çakışması, stok takibi
// kapalı + elle durum, vitrinde yeni fiyat, CSV önizleme / uygulama /
// eşleştirme hataları, stok geçmişi (kim / neden), yetkiler. Başta varyant
// alanları yedeklenir, sonda geri yüklenir; test hareketleri ve geçici
// kullanıcılar silinir.
//
// YALNIZ YEREL DB: DATABASE_URL localhost değilse çalışmaz.
// Kullanım: npx tsx scripts/stock-manager-smoke.mts [port]

import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { hashPassword } from '../src/server/auth/password';
import { formatMinor } from '../src/lib/money';

const url = process.env.DATABASE_URL ?? '';
if (!/@(localhost|127\.0\.0\.1)[:/]/.test(url)) throw new Error('Yalnız yerel veritabanında çalışır.');

const port = Number(process.argv[2] ?? 3000);
const base = `http://127.0.0.1:${port}`;
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

let passed = 0;
const failures: string[] = [];
const check = (name: string, ok: boolean, detail = '') => {
  if (ok) {
    passed += 1;
    console.log(`  ✓ ${name}`);
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
};

async function api(path: string, body?: unknown, cookie?: string) {
  const res = await fetch(base + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'content-type': 'application/json', origin: base, ...(cookie ? { cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let parsed: any = {};
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = { raw: text.slice(0, 200) };
  }
  return { status: res.status, body: parsed, cookie: res.headers.getSetCookie?.() ?? [] };
}

const runId = randomUUID().slice(0, 8);
const emails = {
  owner: `stok-sahip-${runId}@mixle.test`,
  orders: `stok-siparis-${runId}@mixle.test`,
  viewer: `stok-gor-${runId}@mixle.test`,
};
const pw = `Test-${randomUUID()}`;
const startedAt = new Date();

const backup = await db.variant.findMany({
  select: { id: true, sku: true, priceMinor: true, compareAtPriceMinor: true, stock: true, trackStock: true, inStock: true, weightGrams: true },
});

try {
  await db.user.create({ data: { email: emails.owner, passwordHash: await hashPassword(pw), name: 'Stok Sahip', role: 'sahip' } });
  await db.user.create({ data: { email: emails.orders, passwordHash: await hashPassword(pw), name: 'Stok Sipariş', role: 'sipariş-sorumlusu' } });
  await db.user.create({ data: { email: emails.viewer, passwordHash: await hashPassword(pw), name: 'Stok Gör', role: 'görüntüleyici' } });
  const login = async (email: string) =>
    (await api('/api/admin/auth', { email, password: pw })).cookie.find((c) => c.startsWith('na_oturum='))?.split(';')[0] ?? '';
  const cookie = await login(emails.owner);
  const ocookie = await login(emails.orders);
  const vcookie = await login(emails.viewer);
  check('giriş', Boolean(cookie && ocookie && vcookie));
  const Y = '/api/admin/stock/yonetim';

  // --- listeleme
  console.log('\nListeleme');
  const list = await api(Y, undefined, cookie);
  const dbCount = await db.product.count();
  check(`tüm ürünler gelir (${dbCount})`, list.status === 200 && list.body.products?.length === dbCount, `status=${list.status}`);
  const anyVar = list.body.products?.find((p: any) => p.variants.length > 1);
  check('varyasyonlu ürünlerde varyasyon etiketi var', !!anyVar && anyVar.variants.every((v: any) => typeof v.label === 'string' && v.label.length > 0));
  check('oturumsuz → 401', (await api(Y)).status === 401);

  // Test için yayında, takipli, fiyatı olan iki basit varyant
  const targets = await db.variant.findMany({
    where: { isActive: true, priceMinor: { gt: 1000 }, product: { status: 'yayında' } },
    select: { id: true, sku: true, stock: true, priceMinor: true, product: { select: { slug: true, name: true } } },
    orderBy: { id: 'asc' },
    take: 2,
  });
  const [a, b] = targets;
  await db.variant.updateMany({ where: { id: { in: [a.id, b.id] } }, data: { stock: 50, trackStock: true, inStock: true } });

  // --- stok
  console.log('\nStok');
  let r = await api(Y, { variants: [{ variantId: a.id, stock: { op: 'set', value: 100, expected: 50 } }] }, cookie);
  let va = await db.variant.findUniqueOrThrow({ where: { id: a.id } });
  check('49→100 gibi: stok 50 → 100 yapıldı', r.status === 200 && va.stock === 100, JSON.stringify(r.body).slice(0, 300));
  r = await api(Y, { variants: [{ variantId: a.id, stock: { op: 'add', value: 20 } }] }, cookie);
  r = await api(Y, { variants: [{ variantId: a.id, stock: { op: 'sub', value: 5 } }] }, cookie);
  va = await db.variant.findUniqueOrThrow({ where: { id: a.id } });
  check('+20 sonra -5 → 115', va.stock === 115, `stock=${va.stock}`);

  r = await api(Y, { variants: [{ variantId: a.id, stock: { op: 'set', value: 10, expected: 999 } }] }, cookie);
  va = await db.variant.findUniqueOrThrow({ where: { id: a.id } });
  check('çakışma: ekranda görülen değer eskiyse yazmaz', r.body.results?.[0]?.status === 'cakisma' && va.stock === 115 && r.body.results[0].currentStock === 115, JSON.stringify(r.body.results?.[0]));
  r = await api(Y, { variants: [{ variantId: a.id, stock: { op: 'sub', value: 1000 } }] }, cookie);
  check('negatif stok reddedilir', r.body.results?.[0]?.status === 'hata' && (await db.variant.findUniqueOrThrow({ where: { id: a.id } })).stock === 115);

  // --- geçmiş
  console.log('\nGeçmiş');
  const h = await api(`${Y}/gecmis/${a.id}`, undefined, cookie);
  const items = (h.body.items ?? []).filter((m: any) => new Date(m.createdAt) >= startedAt);
  const reasons = items.map((m: any) => `${m.reason}:${m.stockBefore}→${m.stockAfter}`);
  check('geçmiş: 50→100 manuel, 100→120 giriş, 120→115 çıkış', ['manuel:50→100', 'giriş:100→120', 'çıkış:120→115'].every((x) => reasons.includes(x)), reasons.join(', '));
  check('geçmiş: işlemi yapan kayıtlı', items.length > 0 && items.every((m: any) => m.byName === 'Stok Sahip'));

  // --- fiyat / SKU
  console.log('\nFiyat ve SKU');
  await db.variant.update({ where: { id: a.id }, data: { compareAtPriceMinor: a.priceMinor + 5000 } });
  const newPrice = a.priceMinor + 1234;
  r = await api(Y, { variants: [{ variantId: a.id, priceMinor: newPrice }] }, cookie);
  va = await db.variant.findUniqueOrThrow({ where: { id: a.id } });
  check('fiyat doğrudan değişir, üstü çizili fiyat kalkar', va.priceMinor === newPrice && va.compareAtPriceMinor === null, `${va.priceMinor}/${va.compareAtPriceMinor}`);

  const want = formatMinor(newPrice);
  let html = '';
  for (let i = 0; i < 8 && !html.includes(want); i++) {
    html = await (await fetch(`${base}/urun/${a.product.slug}`)).text();
    if (!html.includes(want)) await new Promise((ok) => setTimeout(ok, 750));
  }
  check(`vitrin yeni fiyatı gösterir (${want})`, html.includes(want));

  if (b.sku) {
    r = await api(Y, { variants: [{ variantId: a.id, sku: b.sku }] }, cookie);
    check('başka varyantın SKU’su verilemez', r.body.results?.[0]?.status === 'hata' && (await db.variant.findUniqueOrThrow({ where: { id: a.id } })).sku === a.sku, JSON.stringify(r.body.results?.[0]));
  }
  const tmpSku = `TEST-${runId}`;
  r = await api(Y, { variants: [{ variantId: a.id, sku: tmpSku, weightGrams: 120 }] }, cookie);
  va = await db.variant.findUniqueOrThrow({ where: { id: a.id } });
  check('SKU ve ağırlık değişir', va.sku === tmpSku && va.weightGrams === 120);

  // --- yetki
  console.log('\nYetki');
  check('görüntüleyici → 403', (await api(Y, { variants: [{ variantId: a.id, stock: { op: 'add', value: 1 } }] }, vcookie)).status === 403);
  check('sipariş sorumlusu stok değiştirebilir', (await api(Y, { variants: [{ variantId: a.id, stock: { op: 'add', value: 1 } }] }, ocookie)).status === 200);
  check('sipariş sorumlusu fiyat değiştiremez (403)', (await api(Y, { variants: [{ variantId: a.id, priceMinor: 99999 }] }, ocookie)).status === 403);

  // --- stok takibi kapalı
  console.log('\nStok takibi');
  r = await api(Y, { variants: [{ variantId: b.id, trackStock: false, inStock: false }] }, cookie);
  let vb = await db.variant.findUniqueOrThrow({ where: { id: b.id } });
  check('takip kapalı + stokta yok kaydedilir', !vb.trackStock && !vb.inStock && vb.stock === 50);
  const quote = async () =>
    api('/api/checkout/quote', { lines: [{ variantId: b.id, quantity: 2 }] });
  let qt = await quote();
  if (qt.status !== 404) {
    check('checkout: takip kapalı + stokta yok satılamaz', JSON.stringify(qt.body).includes('stokta kalmadı') || qt.status >= 400, JSON.stringify(qt.body).slice(0, 200));
    await api(Y, { variants: [{ variantId: b.id, inStock: true }] }, cookie);
    qt = await quote();
    check('checkout: takip kapalı + stokta satılabilir', !JSON.stringify(qt.body).includes('stokta kalmadı'), JSON.stringify(qt.body).slice(0, 200));
  }
  await api(Y, { variants: [{ variantId: b.id, trackStock: true }] }, cookie);
  vb = await db.variant.findUniqueOrThrow({ where: { id: b.id } });
  check('takip yeniden açılır, adet korunur', vb.trackStock && vb.stock === 50);

  // --- CSV
  console.log('\nCSV');
  const C = `${Y}/csv`;
  const multi = await db.product.findFirst({ where: { variants: { some: {} } }, select: { id: true, _count: { select: { variants: true } } }, orderBy: { variants: { _count: 'desc' } } });
  const rows = [
    { line: 2, variantId: a.id, stock: '30', price: '' },
    { line: 3, sku: b.sku || '', variantId: b.sku ? '' : b.id, stock: '+5' },
    { line: 4, sku: `YOK-${runId}`, stock: '1' },
    { line: 5, productId: multi!.id, stock: '1' },
    { line: 6, variantId: a.id, stock: 'abc' },
  ];
  const before = (await db.variant.findMany({ where: { id: { in: [a.id, b.id] } }, select: { id: true, stock: true } })).map((v) => v.stock).join(',');
  const dry = await api(C, { dryRun: true, rows }, cookie);
  const after = (await db.variant.findMany({ where: { id: { in: [a.id, b.id] } }, select: { id: true, stock: true } })).map((v) => v.stock).join(',');
  check('önizleme yazmaz', dry.status === 200 && before === after, JSON.stringify(dry.body).slice(0, 200));
  check('özet: 2 güncellenecek, 3 hata', dry.body.summary?.updated === 2 && dry.body.summary?.errors === (multi!._count.variants > 1 ? 3 : 2), JSON.stringify(dry.body.summary));
  const msgs = (dry.body.results ?? []).filter((x: any) => x.status === 'hata').map((x: any) => x.message).join(' | ');
  check('hata mesajları: SKU bulunamadı / geçersiz stok', msgs.includes('SKU bulunamadı') && msgs.includes('Geçersiz stok'), msgs);
  const ap = await api(C, { dryRun: false, rows }, cookie);
  va = await db.variant.findUniqueOrThrow({ where: { id: a.id } });
  vb = await db.variant.findUniqueOrThrow({ where: { id: b.id } });
  check('uygulama: A=30, B=55', ap.status === 200 && va.stock === 30 && vb.stock === 55, `A=${va.stock} B=${vb.stock}`);
  const csvMove = await db.stockMovement.findFirst({ where: { variantId: a.id, reason: 'csv' }, orderBy: { createdAt: 'desc' } });
  check('CSV hareketi geçmişte "CSV aktarımı"', csvMove?.note === 'CSV aktarımı' && csvMove.stockAfter === 30);

  // --- toplu kayıt (çok satır, tek istek)
  console.log('\nToplu kayıt');
  const many = await db.variant.findMany({ where: { trackStock: true }, select: { id: true, stock: true }, take: 300, orderBy: { id: 'asc' } });
  const t0 = Date.now();
  r = await api(Y, { variants: many.map((v) => ({ variantId: v.id, stock: { op: 'add', value: 1 } })) }, cookie);
  const ms = Date.now() - t0;
  const okAll = (await db.variant.findMany({ where: { id: { in: many.map((v) => v.id) } }, select: { id: true, stock: true } })).every(
    (v) => v.stock === many.find((m) => m.id === v.id)!.stock + 1,
  );
  check(`300 varyant tek seferde (+1) — ${ms} ms`, r.status === 200 && okAll && r.body.summary?.updated === 300, JSON.stringify(r.body.summary));
} finally {
  // geri yükleme
  for (let i = 0; i < backup.length; i += 200) {
    await db.$transaction(
      backup.slice(i, i + 200).map((v) => db.variant.update({ where: { id: v.id }, data: { ...v, id: undefined } })),
    );
  }
  const users = await db.user.findMany({ where: { email: { in: Object.values(emails) } }, select: { id: true } });
  await db.stockMovement.deleteMany({ where: { createdByUserId: { in: users.map((u) => u.id) } } });
  await db.auditLog.deleteMany({ where: { userId: { in: users.map((u) => u.id) } } });
  await db.session.deleteMany({ where: { userId: { in: users.map((u) => u.id) } } }).catch(() => undefined);
  await db.user.deleteMany({ where: { email: { in: Object.values(emails) } } });
  await db.$disconnect();
}

console.log(`\n${passed} geçti, ${failures.length} başarısız`);
if (failures.length) {
  for (const f of failures) console.log(`  ✗ ${f}`);
  process.exit(1);
}
