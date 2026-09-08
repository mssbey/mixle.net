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
  const manyHtml = await printMany.text();
  const sheets = (manyHtml.match(/class="sheet"/g) ?? []).length;
  // Not: RSC yükü (__next_f) HTML metnini tekrar taşıdığı için başlık sayısı 2'den fazla olabilir; sheet sayısı esas.
  check('toplu irsaliye (2 sayfa)', printMany.status === 200 && sheets === 2 && manyHtml.split('SEVK İRSALİYESİ').length >= 3,
    `status=${printMany.status} sheet=${sheets} sevk=${manyHtml.split('SEVK İRSALİYESİ').length - 1} bulunamadı=${manyHtml.includes('Sipariş bulunamadı')} sidebar=${manyHtml.includes('admin-sidebar')} len=${manyHtml.length}`);

  console.log('\n9) Ödemeler (F3)');
  const payList = await api<{ items: { orderNumber: string; provider: string; status: string; cardLast4: string | null }[]; summary: unknown[] }>('GET', '/api/admin/payments?view=tumu&pageSize=50', undefined, cookie);
  check('ödeme listesi 200 + bu siparişin ödemesi listede', payList.status === 200 && payList.body.items.some((p) => p.orderNumber === created.body.orderNumber), `status=${payList.status}`);
  const recon = await api<{ items: { orderNumber: string }[] }>('GET', '/api/admin/payments?view=mutabakat', undefined, cookie);
  check('mutabakat: bu sipariş uyuşmazlık listesinde değil', recon.status === 200 && !recon.body.items.some((m) => m.orderNumber === created.body.orderNumber));
  const refundsView = await api<{ items: { orderNumber: string; status: string }[] }>('GET', '/api/admin/payments?view=iadeler', undefined, cookie);
  check('iade kuyruğu: manuel iade tamamlandı olarak görünür', refundsView.status === 200 && refundsView.body.items.some((r) => r.orderNumber === created.body.orderNumber && r.status === 'tamamlandı'));
  const payViewer = await api('GET', '/api/admin/payments', undefined, vcookie);
  check('görüntüleyici ödeme listesini okuyabilir (siparis:oku)', payViewer.status === 200, `status=${payViewer.status}`);

  const settingsGet = await api<{ settings: { paytr: { merchantKey: string; merchantKeySet: boolean }; havale: { iban: string } }; demoMode: boolean }>('GET', '/api/admin/settings/odeme', undefined, cookie);
  check('ödeme ayarları GET 200 (sahip)', settingsGet.status === 200 && typeof settingsGet.body.settings?.paytr === 'object', `status=${settingsGet.status}`);
  const settingsViewer = await api('GET', '/api/admin/settings/odeme', undefined, vcookie);
  check('ödeme ayarları görüntüleyiciye 403', settingsViewer.status === 403, `status=${settingsViewer.status}`);
  const prevRow = await db.setting.findUnique({ where: { key: 'odeme' } });
  const secretVal = `duman-anahtar-${runId}`;
  const put = await api<{ settings: { paytr: { merchantKey: string; merchantKeySet: boolean; merchantId: string }; havale: { iban: string } } }>('PUT', '/api/admin/settings/odeme',
    { ...settingsGet.body.settings, paytr: { ...settingsGet.body.settings.paytr, merchantId: '999', merchantKey: secretVal }, havale: { ...settingsGet.body.settings.havale, iban: 'TR00 TEST' } }, cookie);
  const row = await db.setting.findUnique({ where: { key: 'odeme' } });
  const storedKey = (row?.value as { paytr?: { merchantKey?: string } })?.paytr?.merchantKey ?? '';
  check('PUT 200, gizli alan maskeli döner, veritabanında şifreli (v1.)', put.status === 200 && put.body.settings.paytr.merchantKey.startsWith('••••') && put.body.settings.paytr.merchantKeySet && storedKey.startsWith('v1.') && !storedKey.includes(secretVal) && row?.isSecret === true,
    `status=${put.status} masked=${put.body.settings?.paytr?.merchantKey} stored=${storedKey.slice(0, 6)}`);
  const put2 = await api<{ settings: { paytr: { merchantId: string } } }>('PUT', '/api/admin/settings/odeme', { ...put.body.settings, paytr: { ...put.body.settings.paytr, merchantId: '1000' } }, cookie);
  const row2 = await db.setting.findUnique({ where: { key: 'odeme' } });
  check('maskeli değerle tekrar PUT gizli alanı değiştirmez', put2.status === 200 && put2.body.settings.paytr.merchantId === '1000' && (row2?.value as { paytr?: { merchantKey?: string } })?.paytr?.merchantKey === storedKey);
  const auditRow = await db.auditLog.findFirst({ where: { entityType: 'Setting', entityId: 'odeme' }, orderBy: { createdAt: 'desc' } });
  check('ayar değişikliği denetim kaydına düştü (gizli değer yok)', Boolean(auditRow) && !JSON.stringify(auditRow).includes(secretVal));
  // Ayarları eski haline getir.
  if (prevRow) await db.setting.update({ where: { key: 'odeme' }, data: { value: prevRow.value as never } });
  else await db.setting.delete({ where: { key: 'odeme' } });
  console.log('\n10) Kargo (F4)');
  const kargoOrder = await api<{ orderId: string; orderNumber: string; status: string }>('POST', '/api/checkout/siparis', {
    lines: [{ variantId: vA.id, quantity: 1 }],
    email: guestEmail,
    shippingAddress: { firstName: 'Kargo', lastName: 'Test', phone: '0532 000 00 02', country: 'TR', city: 'Ankara', district: 'Çankaya', neighborhood: '', addressLine: 'Test Sok. No: 2 Daire: 2 Çankaya', postalCode: '', isCorporate: false, identityNumber: '' },
    billingSameAsShipping: true, shippingMethodId: std.methodId, paymentMethod: 'havale',
    consents: { distanceSales: true, preInfo: true, kvkk: true, marketing: false },
  }, undefined, { 'idempotency-key': randomUUID() });
  const kId = kargoOrder.body.orderId;
  const kTotals = (await api<{ order: AdminOrder }>('GET', `/api/admin/orders/${kId}`, undefined, cookie)).body.order.totals;
  await api('POST', `/api/admin/orders/${kId}/odeme`, { amountMinor: kTotals.grandTotalMinor, method: 'havale', reference: 'DEKONT-KARGO' }, cookie);
  const kShip = await api<{ order: AdminOrder; shipmentId: string }>('POST', `/api/admin/orders/${kId}/kargo`, { carrier: 'aras', trackingNumber: 'ARTEST1', markShipped: true }, cookie);
  check('F4 test siparişi kargolandı', kShip.status === 201 && kShip.body.order.status === 'kargolandı', `${kShip.status} ${kShip.body.order?.status}`);
  const shipmentId = kShip.body.shipmentId;

  const shipList = await api<{ items: { id: string; orderNumber: string }[]; counts: Record<string, number> }>('GET', `/api/admin/shipments?tab=yolda&q=${encodeURIComponent(kargoOrder.body.orderNumber)}`, undefined, cookie);
  check('kargolar listesi: yolda sekmesinde bulunur', shipList.status === 200 && shipList.body.items.some((s) => s.id === shipmentId), `status=${shipList.status}`);
  const shipListViewer = await api('GET', '/api/admin/shipments', undefined, vcookie);
  check('görüntüleyici kargo listesini okuyabilir (siparis:oku)', shipListViewer.status === 200);

  const quickPatch = await api('PATCH', `/api/admin/shipments/${shipmentId}`, { status: 'dağıtımda', note: 'panel testi' }, cookie);
  check('kargolar listesinden hızlı güncelleme 200', quickPatch.status === 200, `status=${quickPatch.status}`);
  const quickPatchViewer = await api('PATCH', `/api/admin/shipments/${shipmentId}`, { status: 'teslim-edildi' }, vcookie);
  check('görüntüleyici sevkiyat güncelleyemez (403)', quickPatchViewer.status === 403, `status=${quickPatchViewer.status}`);

  const sync1 = await api<{ updated: boolean; reason: string }>('POST', `/api/admin/shipments/${shipmentId}/takip`, undefined, cookie);
  check('tek sevkiyat takip yenileme: bağlı sağlayıcı yok, dürüstçe "updated:false"', sync1.status === 200 && sync1.body.updated === false && sync1.body.reason.length > 0, JSON.stringify(sync1.body));
  const syncBulk = await api<{ updated: number; total: number }>('POST', '/api/admin/shipments/toplu', { ids: [shipmentId] }, cookie);
  check('toplu takip yenileme çalışır, hiçbiri güncellenmez', syncBulk.status === 200 && syncBulk.body.total === 1 && syncBulk.body.updated === 0, JSON.stringify(syncBulk.body));

  const cronNoSecret = await fetch(`${base}/api/cron/kargo-takip`, { method: 'POST' });
  check('cron ucu gizli anahtarsız 401', cronNoSecret.status === 401, `status=${cronNoSecret.status}`);
  const cronBadSecret = await fetch(`${base}/api/cron/kargo-takip`, { method: 'POST', headers: { authorization: 'Bearer yanlis' } });
  check('cron ucu yanlış anahtarla 401', cronBadSecret.status === 401, `status=${cronBadSecret.status}`);
  const cronOk = await fetch(`${base}/api/cron/kargo-takip`, { method: 'POST', headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } });
  check('cron ucu doğru anahtarla 200 (oturumsuz)', cronOk.status === 200, `status=${cronOk.status}`);

  const labelHtml = await (await fetch(`${base}/admin/kargolar/yazdir?ids=${shipmentId}`, { headers: { cookie } })).text();
  check('kargo etiketi sayfası: sipariş no ve takip no var, panel kabuğu yok', labelHtml.includes(kargoOrder.body.orderNumber) && labelHtml.includes('ARTEST1') && !labelHtml.includes('admin-sidebar'));

  console.log('\n11) Kargo bölge/tarife yönetimi (F4)');
  const zone = await api<{ zone: { id: string } }>('POST', '/api/admin/shipping/zones', { name: `Test Bölge ${runId}`, countries: ['TR'], cities: ['Bursa'] }, cookie);
  check('bölge oluşturuldu', zone.status === 201, `status=${zone.status}`);
  const zoneId = zone.body.zone.id;
  // Yeni bölge varsayılan "Türkiye" (cities: [] → her ili kapsar) bölgesinden ÖNCE gelmeli, yoksa hiç eşleşmez.
  const allZones = await api<{ zones: { id: string }[] }>('GET', '/api/admin/shipping/zones', undefined, cookie);
  await api('POST', '/api/admin/shipping/zones/reorder', { orderedIds: [zoneId, ...allZones.body.zones.map((z) => z.id).filter((id) => id !== zoneId)] }, cookie);
  const method = await api<{ method: { id: string } }>('POST', `/api/admin/shipping/zones/${zoneId}/methods`, { name: 'Bursa kargo', type: 'sabit', priceMinor: 9900, freeOverMinor: null, tiers: null, estimatedDays: '1-2', carrier: 'mng', isActive: true }, cookie);
  check('yöntem oluşturuldu', method.status === 201, `status=${method.status}`);
  const methodId = method.body.method.id;

  const quoteBursa = await api<{ shippingOptions: { name: string; priceMinor: number }[] }>('POST', '/api/checkout/quote', { lines: [{ variantId: vA.id, quantity: 1 }], city: 'Bursa', email: guestEmail });
  check('yeni bölgenin tarifesi checkout teklifinde görünür (99,00 TL)', quoteBursa.body.shippingOptions.some((o) => o.name === 'Bursa kargo' && o.priceMinor === 9900), JSON.stringify(quoteBursa.body.shippingOptions));

  const methodFree = await api<{ method: { priceMinor: number } }>('PATCH', `/api/admin/shipping/methods/${methodId}`, { type: 'ücretsiz' }, cookie);
  check('yöntem ücretsize çevrildi', methodFree.status === 200, `status=${methodFree.status}`);
  const quoteBursaFree = await api<{ shippingOptions: { name: string; priceMinor: number }[] }>('POST', '/api/checkout/quote', { lines: [{ variantId: vA.id, quantity: 1 }], city: 'Bursa', email: guestEmail });
  check('ücretsize çevrilince teklif 0 gösterir', quoteBursaFree.body.shippingOptions.find((o) => o.name === 'Bursa kargo')?.priceMinor === 0, JSON.stringify(quoteBursaFree.body.shippingOptions));

  const methodDelViewer = await api('DELETE', `/api/admin/shipping/methods/${methodId}`, undefined, vcookie);
  check('görüntüleyici yöntem silemez (403)', methodDelViewer.status === 403, `status=${methodDelViewer.status}`);
  await api('DELETE', `/api/admin/shipping/methods/${methodId}`, undefined, cookie);
  await api('DELETE', `/api/admin/shipping/zones/${zoneId}`, undefined, cookie);
  const quoteBursaAfter = await api<{ shippingOptions: { name: string }[] }>('POST', '/api/checkout/quote', { lines: [{ variantId: vA.id, quantity: 1 }], city: 'Bursa', email: guestEmail });
  check('bölge silinince Bursa varsayılan (Türkiye) bölgesine döner', !quoteBursaAfter.body.shippingOptions.some((o) => o.name === 'Bursa kargo') && quoteBursaAfter.body.shippingOptions.some((o) => o.name === 'Standart kargo'), JSON.stringify(quoteBursaAfter.body.shippingOptions));

  console.log('\n12) Kargo ayarları — taşıyıcı anahtarları ve kapıda ödeme (F4)');
  const kargoSettingsGet = await api<{ providers: Record<string, { apiKey: string }>; cod: { codSurchargeMinor: number; codMaxTotalMinor: number | null } }>('GET', '/api/admin/settings/kargo', undefined, cookie);
  check('kargo ayarları GET 200', kargoSettingsGet.status === 200 && typeof kargoSettingsGet.body.providers?.aras === 'object', `status=${kargoSettingsGet.status}`);
  const prevKargoRow = await db.setting.findUnique({ where: { key: 'kargo-saglayici' } });
  const kargoSecretVal = `kargo-anahtar-${runId}`;
  const kargoPut = await api<{ providers: Record<string, { apiKey: string; apiKeySet: boolean }> }>('PUT', '/api/admin/settings/kargo', {
    providers: { ...kargoSettingsGet.body.providers, aras: { ...kargoSettingsGet.body.providers.aras, enabled: true, apiKey: kargoSecretVal } },
    cod: kargoSettingsGet.body.cod,
  }, cookie);
  const kargoRow = await db.setting.findUnique({ where: { key: 'kargo-saglayici' } });
  const storedAras = (kargoRow?.value as { providers?: { aras?: { apiKey?: string } } })?.providers?.aras?.apiKey ?? '';
  check('PUT 200, gizli alan maskeli döner, veritabanında şifreli (v1.)', kargoPut.status === 200 && kargoPut.body.providers.aras.apiKey.startsWith('••••') && kargoPut.body.providers.aras.apiKeySet && storedAras.startsWith('v1.') && !storedAras.includes(kargoSecretVal), `status=${kargoPut.status} masked=${kargoPut.body.providers?.aras?.apiKey} stored=${storedAras.slice(0, 6)}`);
  const kargoPutViewer = await api('PUT', '/api/admin/settings/kargo', { providers: kargoSettingsGet.body.providers, cod: kargoSettingsGet.body.cod }, vcookie);
  check('görüntüleyici kargo ayarlarını kaydedemez (403)', kargoPutViewer.status === 403, `status=${kargoPutViewer.status}`);

  const codPut = await api<{ cod: { codSurchargeMinor: number } }>('PUT', '/api/admin/settings/kargo', { providers: kargoSettingsGet.body.providers, cod: { codSurchargeMinor: 2500, codMaxTotalMinor: kargoSettingsGet.body.cod.codMaxTotalMinor } }, cookie);
  check('kapıda ödeme hizmet bedeli güncellendi', codPut.status === 200 && codPut.body.cod.codSurchargeMinor === 2500, `status=${codPut.status}`);
  const codQuoteRaw = await api<{ shippingOptions: { methodId: string; type: string }[] }>('POST', '/api/checkout/quote', { lines: [{ variantId: vA.id, quantity: 1 }], city: 'Ankara', email: guestEmail });
  const codMethodId = codQuoteRaw.body.shippingOptions.find((s) => s.type === 'kapıda')!.methodId;
  const quoteCod = await api<{ paymentOptions: { id: string; surchargeMinor: number }[] }>('POST', '/api/checkout/quote', {
    lines: [{ variantId: vA.id, quantity: 1 }], city: 'Ankara', email: guestEmail, shippingMethodId: codMethodId,
  });
  check('yeni kapıda ödeme bedeli checkout teklifine yansır', quoteCod.body.paymentOptions.find((p) => p.id === 'kapida')?.surchargeMinor === 2500, JSON.stringify(quoteCod.body.paymentOptions));

  // Ayarları eski haline getir.
  if (prevKargoRow) await db.setting.update({ where: { key: 'kargo-saglayici' }, data: { value: prevKargoRow.value as never } });
  else await db.setting.deleteMany({ where: { key: 'kargo-saglayici' } });
  const storeRow = await db.setting.findUnique({ where: { key: 'magaza' } });
  await db.setting.update({ where: { key: 'magaza' }, data: { value: { ...(storeRow?.value as object), codSurchargeMinor: kargoSettingsGet.body.cod.codSurchargeMinor } as never } });

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
