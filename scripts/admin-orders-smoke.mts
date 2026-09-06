// Panel sipariş yönetimi duman testi (F2 kabul kriteri).
//
// Sipariş vitrinden oluşturulur (havale), sonra panel API'siyle:
//   ödeme al → kısmi sevkiyat → kalan sevkiyat (kargolandı) → teslim → tamamlandı
//   → kısmi iade → toplamlar kuruş bazında tutarlı → denetim kaydı düştü.
// Ayrıca: kalem düzenleme + yeniden hesap, geçersiz geçiş 409, görüntüleyici 403,
// liste/filtre/CSV, manuel sipariş.
//
// Kullanım: npm run build && SMOKE_OWNER_EMAIL=… SMOKE_OWNER_PASSWORD=… npx tsx scripts/admin-orders-smoke.mts [port]

import 'dotenv/config';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '../src/generated/prisma/client';

const port = Number(process.argv[2] ?? 3993);
const base = `http://127.0.0.1:${port}`;
const db = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! }) });

let passed = 0;
const failures: string[] = [];
const check = (name: string, ok: boolean, detail = '') => {
  if (ok) { passed += 1; console.log(`  ✓ ${name}`); }
  else { failures.push(`${name}${detail ? ` — ${detail}` : ''}`); console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); }
};

async function api<T = Record<string, unknown>>(method: string, path: string, body?: unknown, cookie?: string, extra: Record<string, string> = {}) {
  const res = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json', origin: base, ...(cookie ? { cookie } : {}), ...extra },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let parsed: unknown = {};
  try { parsed = JSON.parse(text); } catch { parsed = { raw: text.slice(0, 200) }; }
  return { status: res.status, body: parsed as T, cookie: res.headers.getSetCookie?.() ?? [] };
}

async function waitForServer() {
  for (let i = 0; i < 180; i += 1) {
    try { await fetch(`${base}/`, { redirect: 'manual' }); return; } catch { await new Promise((r) => setTimeout(r, 500)); }
  }
  throw new Error('Sunucu açılmadı');
}

const OWNER = { email: process.env.SMOKE_OWNER_EMAIL!, password: process.env.SMOKE_OWNER_PASSWORD! };
if (!OWNER.email || !OWNER.password) { console.error('SMOKE_OWNER_EMAIL / SMOKE_OWNER_PASSWORD gerekli'); process.exit(1); }

const runId = Date.now().toString(36);
const guestEmail = `panel-duman-${runId}@nefisaroma.test`;
const viewerEmail = `panel-goruntuleyici-${runId}@nefisaroma.test`;

const server = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['next', 'start', '-p', String(port)], { stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32' });
let log = ''; server.stdout.on('data', (d) => (log += d)); server.stderr.on('data', (d) => (log += d));

type AdminOrder = {
  id: string; orderNumber: string; status: string; paymentStatus: string; fulfillmentStatus: string;
  totals: { grandTotalMinor: number; refundedTotalMinor: number; itemsSubtotalMinor: number; discountTotalMinor: number; shippingTotalMinor: number; surchargeMinor: number };
  items: { id: string; variantId: string | null; quantity: number; refundedQuantity: number; shippedQuantity: number; lineTotalMinor: number }[];
  shipments: { id: string; status: string }[]; refunds: { amountMinor: number }[]; timeline: { kind: string }[]; refundableMinor: number; allowedTransitions: string[];
};

try {
  await waitForServer();

  // Görüntüleyici test kullanıcısı (403 kontrolü için) — doğrudan DB'ye.
  const { hashPassword } = await import('../src/server/auth/password');
  await db.user.create({ data: { email: viewerEmail, passwordHash: await hashPassword('goruntuleyici-1234'), name: 'Test', role: 'görüntüleyici' } });

  console.log('\n0) Giriş');
  const login = await api('POST', '/api/admin/auth', { email: OWNER.email, password: OWNER.password });
  const cookie = login.cookie.find((c) => c.startsWith('na_oturum='))?.split(';')[0] ?? '';
  check('sahip girişi', login.status === 200 && Boolean(cookie), `status=${login.status}`);
  const vlogin = await api('POST', '/api/admin/auth', { email: viewerEmail, password: 'goruntuleyici-1234' });
  const vcookie = vlogin.cookie.find((c) => c.startsWith('na_oturum='))?.split(';')[0] ?? '';
  check('görüntüleyici girişi', vlogin.status === 200 && Boolean(vcookie));

  console.log('\n1) Vitrinden havale siparişi (2 farklı ürün)');
  const variants = await db.variant.findMany({ where: { isActive: true, stock: { gte: 5 }, product: { status: 'yayında' } }, take: 2, include: { product: { select: { name: true } } } });
  if (variants.length < 2) throw new Error('İki stoklu varyant bulunamadı');
  const [vA, vB] = variants;
  const stockA0 = vA.stock; const stockB0 = vB.stock;
  const quote = await api<{ shippingOptions: { methodId: string; type: string }[] }>('POST', '/api/checkout/quote', { lines: [{ variantId: vA.id, quantity: 3 }, { variantId: vB.id, quantity: 1 }], city: 'Ankara', email: guestEmail });
  const std = quote.body.shippingOptions.find((s) => s.type !== 'kapıda')!;
  const created = await api<{ orderId: string; orderNumber: string; status: string }>('POST', '/api/checkout/siparis', {
    lines: [{ variantId: vA.id, quantity: 3 }, { variantId: vB.id, quantity: 1 }],
    email: guestEmail,
    shippingAddress: { firstName: 'Panel', lastName: 'Test', phone: '0532 000 00 01', country: 'TR', city: 'Ankara', district: 'Çankaya', neighborhood: '', addressLine: 'Test Sok. No: 1 Daire: 1 Çankaya', postalCode: '', isCorporate: false, identityNumber: '' },
    billingSameAsShipping: true, shippingMethodId: std.methodId, paymentMethod: 'havale',
    consents: { distanceSales: true, preInfo: true, kvkk: true, marketing: false },
  }, undefined, { 'idempotency-key': randomUUID() });
  check('sipariş oluştu (ödeme-bekliyor)', created.status === 201 && created.body.status === 'ödeme-bekliyor', `${created.status} ${JSON.stringify(created.body).slice(0, 200)}`);
  const id = created.body.orderId;

  console.log('\n2) Liste ve yetki');
  const list = await api<{ items: { id: string }[]; tabCounts: Record<string, number> }>('GET', `/api/admin/orders?tab=odeme-bekleyen&q=${encodeURIComponent(created.body.orderNumber)}`, undefined, cookie);
  check('liste: ödeme bekleyen sekmesinde ve arama ile bulunur', list.status === 200 && list.body.items.some((o) => o.id === id), `status=${list.status}`);
  const csv = await fetch(`${base}/api/admin/orders?format=csv&q=${encodeURIComponent(created.body.orderNumber)}`, { headers: { cookie } });
  check('CSV dışa aktarım', csv.status === 200 && (csv.headers.get('content-type') ?? '').includes('text/csv') && (await csv.text()).includes(created.body.orderNumber));
  const vRead = await api('GET', `/api/admin/orders/${id}`, undefined, vcookie);
  check('görüntüleyici siparişi okuyabilir', vRead.status === 200);
  const vWrite = await api('POST', `/api/admin/orders/${id}/odeme`, { amountMinor: 100, method: 'havale' }, vcookie);
  check('görüntüleyici ödeme alamaz (403)', vWrite.status === 403, `status=${vWrite.status}`);

  console.log('\n3) Geçersiz geçiş ve kalem düzenleme');
  const bad = await api('POST', `/api/admin/orders/${id}/durum`, { to: 'kargolandı' }, cookie);
  check('ödeme-bekliyor → kargolandı reddedilir (409)', bad.status === 409, `status=${bad.status}`);
  const detail0 = (await api<{ order: AdminOrder }>('GET', `/api/admin/orders/${id}`, undefined, cookie)).body.order;
  const itemA = detail0.items.find((i) => i.variantId === vA.id)!;
  const itemB = detail0.items.find((i) => i.variantId === vB.id)!;
  const edited = await api<{ order: AdminOrder }>('POST', `/api/admin/orders/${id}/kalemler`, {
    items: [{ id: itemA.id, variantId: vA.id, quantity: 4, discountMinor: 500 }, { id: itemB.id, variantId: vB.id, quantity: 1 }],
    note: 'Telefonda +1 adet',
  }, cookie);
  check('kalem düzenleme 200', edited.status === 200, `${edited.status} ${JSON.stringify(edited.body).slice(0, 200)}`);
  const t = edited.body.order?.totals;
  check('yeniden hesap: değişmez (subtotal − indirim + kargo = toplam)', t && t.itemsSubtotalMinor - t.discountTotalMinor + t.shippingTotalMinor + t.surchargeMinor === t.grandTotalMinor, JSON.stringify(t));
  check('düzenleme sonrası stok A −4 (rezerve)', (await db.variant.findUnique({ where: { id: vA.id } }))?.stock === stockA0 - 4);

  console.log('\n4) Ödeme al (havale eşleştir)');
  const pay = await api<{ order: AdminOrder }>('POST', `/api/admin/orders/${id}/odeme`, { amountMinor: t.grandTotalMinor, method: 'havale', reference: 'DEKONT-1' }, cookie);
  check('ödeme alındı → ödendi', pay.status === 200 && pay.body.order.status === 'ödendi' && pay.body.order.paymentStatus === 'ödendi', `${pay.status} ${pay.body.order?.status}`);
  const openRes = await db.stockReservation.count({ where: { orderId: id, releasedAt: null } });
  check('rezervasyon kesinleşti', openRes === 0);
  const payAgain = await api('POST', `/api/admin/orders/${id}/odeme`, { amountMinor: 100, method: 'havale' }, cookie);
  check('ikinci ödeme reddedilir (409)', payAgain.status === 409, `status=${payAgain.status}`);

  console.log('\n5) Kısmi sevkiyat');
  const ship1 = await api<{ order: AdminOrder }>('POST', `/api/admin/orders/${id}/kargo`, { carrier: 'yurtici', trackingNumber: 'YK123456', items: [{ orderItemId: itemA.id, quantity: 2 }] }, cookie);
  check('1. sevkiyat (2/4 A) → kısmi', ship1.status === 201 && ship1.body.order.fulfillmentStatus === 'kısmi' && ship1.body.order.status === 'ödendi', `${ship1.status} ${ship1.body.order?.fulfillmentStatus} ${ship1.body.order?.status}`);
  const over = await api('POST', `/api/admin/orders/${id}/kargo`, { carrier: 'aras', items: [{ orderItemId: itemA.id, quantity: 5 }] }, cookie);
  check('fazla adet sevk reddedilir (422)', over.status === 422, `status=${over.status}`);
  const ship2 = await api<{ order: AdminOrder; shipmentId: string }>('POST', `/api/admin/orders/${id}/kargo`, { carrier: 'aras', trackingNumber: 'AR999' }, cookie);
  check('2. sevkiyat (kalan hepsi) → kargolandı', ship2.status === 201 && ship2.body.order.status === 'kargolandı' && ship2.body.order.fulfillmentStatus === 'gönderildi', `${ship2.status} ${ship2.body.order?.status}`);
  const shipMails = await db.emailLog.count({ where: { orderId: id, template: 'kargoya-verildi' } });
  check('kargo e-postaları kuyruğa düştü (2)', shipMails === 2, String(shipMails));

  console.log('\n6) Teslimat → otomatik tamamlandı');
  const ships = ship2.body.order.shipments;
  for (const s of ships) await api('PATCH', `/api/admin/orders/${id}/kargo/${s.id}`, { status: 'teslim-edildi' }, cookie);
  const afterDeliver = (await api<{ order: AdminOrder }>('GET', `/api/admin/orders/${id}`, undefined, cookie)).body.order;
  check('tüm sevkiyatlar teslim → sipariş tamamlandı', afterDeliver.status === 'tamamlandı', afterDeliver.status);

  console.log('\n7) Kısmi iade');
  const stockBeforeRefund = (await db.variant.findUnique({ where: { id: vA.id } }))!.stock;
  const refund = await api<{ order: AdminOrder }>('POST', `/api/admin/orders/${id}/iade`, { items: [{ orderItemId: itemA.id, quantity: 1 }], reason: 'Hasarlı geldi', restock: true, includeShipping: false }, cookie);
  check('kısmi iade 201', refund.status === 201, `${refund.status} ${JSON.stringify(refund.body).slice(0, 200)}`);
  const ro = refund.body.order;
  const itemAAfter = ro.items.find((i) => i.id === itemA.id)!;
  const expectedUnit = Math.round(itemA.lineTotalMinor / itemA.quantity); // düzenleme öncesi değil, güncel satır
  check('kalem refundedQuantity = 1', itemAAfter.refundedQuantity === 1);
  check('refundedTotal = iade tutarı, paymentStatus kısmi-iade', ro.totals.refundedTotalMinor === ro.refunds[0].amountMinor && ro.paymentStatus === 'kısmi-iade', `${ro.totals.refundedTotalMinor} ${ro.paymentStatus}`);
  check('iade tutarı satır/adet oranında (kuruş)', ro.refunds[0].amountMinor === Math.round(itemAAfter.lineTotalMinor / itemAAfter.quantity), `${ro.refunds[0].amountMinor} vs ${Math.round(itemAAfter.lineTotalMinor / itemAAfter.quantity)} (eski birim ${expectedUnit})`);
  check('iade stoka döndü (+1)', (await db.variant.findUnique({ where: { id: vA.id } }))?.stock === stockBeforeRefund + 1);
  check('sipariş tamamlandı kalır (kısmi)', ro.status === 'tamamlandı', ro.status);
  const tooMuch = await api('POST', `/api/admin/orders/${id}/iade`, { items: [{ orderItemId: itemA.id, quantity: 10 }], reason: 'x', restock: false, includeShipping: false }, cookie);
  check('fazla iade reddedilir (422)', tooMuch.status === 422, `status=${tooMuch.status}`);

  console.log('\n8) Denetim ve zaman çizelgesi');
  const audits = await db.auditLog.findMany({ where: { entityType: { in: ['Order', 'Shipment'] }, entityId: { contains: id } } });
  const shipAudits = await db.auditLog.count({ where: { entityType: 'Shipment' } });
  const actions = new Set(audits.map((a) => a.action));
  check('AuditLog: ödeme, iade, güncelleme, durum kayıtları var', actions.has('odeme') && actions.has('iade') && actions.has('guncelle') && shipAudits >= 2, [...actions].join(','));
  check('zaman çizelgesi ödeme/kargo/iade/e-posta içeriyor', ['odeme', 'kargo', 'iade', 'eposta', 'durum'].every((k) => ro.timeline.some((x) => x.kind === k)), [...new Set(ro.timeline.map((x) => x.kind))].join(','));

  console.log('\n9) Manuel sipariş (panel, ödeme alındı)');
  const manual = await api<{ orderId: string; orderNumber: string; status: string }>('POST', '/api/admin/orders', {
    source: 'telefon', markPaid: true,
    order: { lines: [{ variantId: vB.id, quantity: 1 }], email: guestEmail, shippingAddress: { firstName: 'Panel', lastName: 'Test', phone: '0532 000 00 01', country: 'TR', city: 'Ankara', district: 'Çankaya', neighborhood: '', addressLine: 'Test Sok. No: 1 Daire: 1 Çankaya', postalCode: '', isCorporate: false, identityNumber: '' }, billingSameAsShipping: true, shippingMethodId: std.methodId, paymentMethod: 'havale' },
  }, cookie, { 'idempotency-key': randomUUID() });
  check('manuel sipariş 201 + ödendi (onay olmadan)', manual.status === 201 && manual.body.status === 'ödendi', `${manual.status} ${JSON.stringify(manual.body).slice(0, 200)}`);
  const manualRow = await db.order.findUnique({ where: { id: manual.body.orderId } });
  check('kaynak telefon, consents manuel', manualRow?.source === 'telefon' && (manualRow?.consents as { manual?: boolean })?.manual === true);

  console.log('\n10) Toplu işlem + yazdırma');
  const bulk = await api<{ ok: number; failed: number }>('POST', '/api/admin/orders/toplu', { action: 'durum', ids: [manual.body.orderId, id], to: 'hazırlanıyor' }, cookie);
  check('toplu durum: 1 başarılı (ödendi→hazırlanıyor), 1 başarısız (tamamlandı)', bulk.body.ok === 1 && bulk.body.failed === 1, JSON.stringify(bulk.body).slice(0, 200));
  const print = await fetch(`${base}/admin/siparisler/${id}/yazdir?tip=fatura`, { headers: { cookie } });
  const printHtml = await print.text();
  check('fatura yazdırma sayfası', print.status === 200 && printHtml.includes('SİPARİŞ BİLGİ FİŞİ') && printHtml.includes(created.body.orderNumber) && !printHtml.includes('admin-sidebar'));
  const printMany = await fetch(`${base}/admin/siparisler/yazdir?ids=${id},${manual.body.orderId}&tip=irsaliye`, { headers: { cookie } });
  check('toplu irsaliye', printMany.status === 200 && (await printMany.text()).split('SEVK İRSALİYESİ').length === 3);
} catch (err) {
  failures.push(String(err));
  console.error(err);
  console.error('--- sunucu günlüğü ---');
  console.error(log.slice(-2000));
} finally {
  server.kill();
  try {
    const orders = await db.order.findMany({ where: { OR: [{ guestEmail }, { customer: { email: guestEmail } }] }, include: { items: true } });
    for (const o of orders) {
      if (o.status !== 'iptal') for (const i of o.items) if (i.variantId) await db.variant.update({ where: { id: i.variantId }, data: { stock: { increment: i.quantity - i.refundedQuantity } } });
      await db.order.delete({ where: { id: o.id } });
    }
    await db.customer.deleteMany({ where: { email: guestEmail } });
    await db.user.deleteMany({ where: { email: viewerEmail } });
    console.log(`\nTemizlik: ${orders.length} sipariş, müşteri ve test kullanıcısı silindi, stok geri kondu.`);
  } catch (e) { console.error('Temizlik hatası:', e); }
  await db.$disconnect();
}

console.log(`\n${passed} kontrol geçti, ${failures.length} başarısız.`);
for (const f of failures) console.log(`  ! ${f}`);
process.exit(failures.length === 0 ? 0 : 1);
