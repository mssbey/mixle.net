// Checkout duman testi — API katmanı, gerçek HTTP + gerçek veritabanı.
//
// Senaryo (F1 kabul kriteri):
//   teklif → sipariş oluştur (idempotency ile iki kez) → stok düştü mü →
//   mock ödeme onayla → durum "ödendi" mi → e-posta kaydı düştü mü →
//   kapıda ödeme siparişi → "hazırlanıyor" → misafir sorgulama →
//   müşteri kaydı (misafir → hesap) → siparişlerim → müşteri iptali → stok geri
//
// Kullanım: npm run build && npx tsx scripts/checkout-smoke.ts [port]
// Test verisi sonunda temizlenir.

import 'dotenv/config';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const port = Number(process.argv[2] ?? 3994);
const base = `http://127.0.0.1:${port}`;
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

let passed = 0;
const failures: string[] = [];
function check(name: string, ok: boolean, detail = '') {
  if (ok) {
    passed += 1;
    console.log(`  ✓ ${name}`);
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

async function post<T = Record<string, unknown>>(
  path: string,
  body: unknown,
  extra: Record<string, string> = {},
  cookie?: string,
) {
  const res = await fetch(base + path, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: base,
      ...(cookie ? { cookie } : {}),
      ...extra,
    },
    body: JSON.stringify(body),
  });
  return {
    status: res.status,
    body: (await res.json().catch(() => ({}))) as T,
    cookie: res.headers.getSetCookie?.() ?? [],
  };
}

async function waitForServer(timeoutMs = 90_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      await fetch(`${base}/`, { redirect: 'manual' });
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error('Sunucu açılmadı');
}

const address = {
  firstName: 'Deniz',
  lastName: 'Test',
  phone: '0532 123 45 67',
  country: 'TR',
  city: 'İstanbul',
  district: 'Kadıköy',
  neighborhood: 'Caferağa',
  addressLine: 'Moda Cad. No: 1 Daire: 2, Kadıköy',
  postalCode: '34710',
  isCorporate: false,
  identityNumber: '10000000146',
};
const consents = { distanceSales: true, preInfo: true, kvkk: true, marketing: false };

const server = spawn(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['next', 'start', '-p', String(port)],
  { stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32' },
);
let log = '';
server.stdout.on('data', (d) => (log += d));
server.stderr.on('data', (d) => (log += d));

const runId = Date.now().toString(36);
const guestEmail = `duman-${runId}@nefisaroma.test`;

type OrderResult = { orderId: string; orderNumber: string; status: string; reused: boolean; nextUrl: string | null };

try {
  await waitForServer();

  const variant = await db.variant.findFirst({
    where: { isActive: true, stock: { gte: 5 }, product: { status: 'yayında' } },
    include: { product: { select: { name: true } } },
  });
  if (!variant) throw new Error('Test için stoklu varyant bulunamadı');
  const stockBefore = variant.stock;
  console.log(`\nTest ürünü: ${variant.product.name} (${variant.id}) stok=${stockBefore}`);

  console.log('\n1) Teklif');
  const quote = await post<{
    shippingOptions: { methodId: string; type: string }[];
    totals: { grandTotalMinor: number };
    paymentOptions: { id: string; available: boolean }[];
  }>('/api/checkout/quote', {
    lines: [{ variantId: variant.id, quantity: 2 }],
    city: 'İstanbul',
    email: guestEmail,
  });
  check('teklif 200', quote.status === 200, `status=${quote.status} ${JSON.stringify(quote.body).slice(0, 200)}`);
  const std = quote.body.shippingOptions?.find((s) => s.type !== 'kapıda');
  const cod = quote.body.shippingOptions?.find((s) => s.type === 'kapıda');
  check('standart ve kapıda kargo seçenekleri var', Boolean(std && cod));
  check('tutar kuruş tam sayı', Number.isInteger(quote.body.totals?.grandTotalMinor));

  console.log('\n2) Sipariş oluştur (kart, mock) + idempotency');
  const key = randomUUID();
  const orderBody = {
    lines: [{ variantId: variant.id, quantity: 2 }],
    email: guestEmail,
    shippingAddress: address,
    billingSameAsShipping: true,
    shippingMethodId: std!.methodId,
    paymentMethod: 'kart',
    consents,
  };
  const o1 = await post<OrderResult>('/api/checkout/siparis', orderBody, { 'idempotency-key': key });
  check('sipariş 201', o1.status === 201, `status=${o1.status} ${JSON.stringify(o1.body).slice(0, 300)}`);
  check('sipariş no NA-YYYY-000000', /^NA-\d{4}-\d{6}$/.test(o1.body.orderNumber ?? ''), o1.body.orderNumber);
  check('durum ödeme-bekliyor', o1.body.status === 'ödeme-bekliyor', o1.body.status);
  check('mock ödeme sayfasına yönlendirme', (o1.body.nextUrl ?? '').startsWith('/odeme/dogrulama'), o1.body.nextUrl ?? '');

  const o1b = await post<OrderResult>('/api/checkout/siparis', orderBody, { 'idempotency-key': key });
  check(
    'aynı Idempotency-Key aynı siparişi döndürür',
    o1b.status === 200 && o1b.body.reused === true && o1b.body.orderId === o1.body.orderId,
  );

  const afterReserve = await db.variant.findUnique({ where: { id: variant.id } });
  check('stok rezervasyonla düştü (−2)', afterReserve?.stock === stockBefore - 2, `stok=${afterReserve?.stock}`);
  const reservations = await db.stockReservation.count({ where: { orderId: o1.body.orderId, releasedAt: null } });
  check('açık rezervasyon kaydı var', reservations === 1);

  const snapshot = await db.order.findUnique({ where: { id: o1.body.orderId } });
  const ship = snapshot?.shippingAddress as { identityNumberMasked?: string; identityNumber?: string };
  check(
    'TCKN siparişte düz metin yok, maskeli var',
    ship?.identityNumber === undefined && ship?.identityNumberMasked === '100*****46',
    JSON.stringify(ship).slice(0, 120),
  );
  const consentsSaved = snapshot?.consents as { distanceSales?: { version?: number } };
  check('yasal metin sürümü siparişe yazıldı', typeof consentsSaved?.distanceSales?.version === 'number');

  const addrRow = await db.address.findFirst({ where: { customer: { email: guestEmail } } });
  check('adres defterine TCKN şifreli yazıldı', Boolean(addrRow?.identityNumberEnc?.startsWith('v1.')));

  console.log('\n3) Mock ödeme');
  const ctxRes = await fetch(`${base}/odeme/dogrulama?siparis=${o1.body.orderId}`);
  check('mock 3DS sayfası açılıyor', ctxRes.status === 200, `status=${ctxRes.status}`);
  const html = await ctxRes.text();
  const tokenMatch = html.match(/data-token="([^"]+)"/);
  check('sayfada ödeme jetonu var', Boolean(tokenMatch));

  const badToken = await post('/api/checkout/mock-odeme', { orderId: o1.body.orderId, token: 'sahte', outcome: 'basarili' });
  check('sahte jeton reddedilir (403)', badToken.status === 403, `status=${badToken.status}`);

  const pay = await post<{ status: string }>('/api/checkout/mock-odeme', {
    orderId: o1.body.orderId,
    token: tokenMatch?.[1],
    outcome: 'basarili',
  });
  check('ödeme onayı 200 + durum ödendi', pay.status === 200 && pay.body.status === 'ödendi', `${pay.status} ${JSON.stringify(pay.body)}`);

  const pay2 = await post<{ status: string; duplicate?: boolean }>('/api/checkout/mock-odeme', {
    orderId: o1.body.orderId,
    token: tokenMatch?.[1],
    outcome: 'basarisiz',
  });
  check('ikinci sonuç idempotent (durum değişmez)', pay2.body.status === 'ödendi', pay2.body.status);

  // Webhook idempotency: aynı olay doğrudan webhook ucuna iki kez gelsin.
  const whBody = JSON.stringify({ orderId: o1.body.orderId, token: tokenMatch?.[1], outcome: 'basarili', attempt: '1' });
  const wh1 = await fetch(`${base}/api/webhooks/payments/mock`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: whBody });
  const whEvents = await db.webhookEvent.count({ where: { provider: 'mock', externalId: `mock:${o1.body.orderId}:basarili:1` } });
  check('webhook ucu 200 ve WebhookEvent tek kayıt (ikinci kez işlenmedi)', wh1.status === 200 && whEvents === 1, `status=${wh1.status} events=${whEvents}`);
  const whBad = await fetch(`${base}/api/webhooks/payments/mock`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ orderId: o1.body.orderId, token: 'sahte', outcome: 'basarili' }) });
  check('webhook sahte imza 400', whBad.status === 400, `status=${whBad.status}`);
  const whUnknown = await fetch(`${base}/api/webhooks/payments/bilinmeyen`, { method: 'POST', body: '{}' });
  check('bilinmeyen sağlayıcı 404', whUnknown.status === 404);
  const paymentRow = await db.payment.findFirst({ where: { orderId: o1.body.orderId } });
  check('Payment satırı mock/başarılı, kart bilgisi maskeli', paymentRow?.provider === 'mock' && paymentRow?.status === 'başarılı' && paymentRow?.cardLast4 === '0000');

  const afterPay = await db.variant.findUnique({ where: { id: variant.id } });
  const openRes = await db.stockReservation.count({ where: { orderId: o1.body.orderId, releasedAt: null } });
  const moves = await db.stockMovement.findMany({ where: { orderId: o1.body.orderId } });
  check('ödeme sonrası stok kesin (−2), rezervasyon kapandı', afterPay?.stock === stockBefore - 2 && openRes === 0);
  check('stok hareketi "sipariş" yazıldı', moves.some((m) => m.reason === 'sipariş' && m.delta === -2));

  const events = await db.orderEvent.findMany({ where: { orderId: o1.body.orderId }, orderBy: { createdAt: 'asc' } });
  const trail = events.map((e) => e.toStatus).join('>');
  check('zaman çizelgesi: taslak→ödeme-bekliyor→ödendi', trail === 'ödeme-bekliyor>ödendi', trail);

  const mails = await db.emailLog.findMany({ where: { orderId: o1.body.orderId } });
  check(
    'e-posta kayıtları: sipariş-alındı + ödeme-başarılı (demo-yakalandı)',
    mails.some((m) => m.template === 'siparis-alindi' && m.status === 'demo-yakalandı') &&
      mails.some((m) => m.template === 'odeme-basarili'),
    mails.map((m) => `${m.template}:${m.status}`).join(','),
  );

  console.log('\n4) Kapıda ödeme');
  const o2 = await post<OrderResult>(
    '/api/checkout/siparis',
    { ...orderBody, shippingMethodId: cod!.methodId, paymentMethod: 'kapida', lines: [{ variantId: variant.id, quantity: 1 }] },
    { 'idempotency-key': randomUUID() },
  );
  check('kapıda ödeme siparişi 201 + hazırlanıyor', o2.status === 201 && o2.body.status === 'hazırlanıyor', `${o2.status} ${o2.body.status} ${JSON.stringify(o2.body).slice(0, 200)}`);
  const afterCod = await db.variant.findUnique({ where: { id: variant.id } });
  check('kapıda: stok kesinleşti (−3 toplam)', afterCod?.stock === stockBefore - 3, `stok=${afterCod?.stock}`);
  const codMoves = await db.stockMovement.count({ where: { orderId: o2.body.orderId, reason: 'sipariş' } });
  check('kapıda: "sipariş" stok hareketi yazıldı', codMoves === 1);

  console.log('\n5) Misafir sipariş sorgulama');
  const lookupBad = await post('/api/siparis-takibi', { no: o1.body.orderNumber, email: 'baskasi@x.test' });
  check('yanlış e-posta 404', lookupBad.status === 404);
  const lookup = await post<{ order: { orderNumber: string; status: string; events: unknown[] } }>(
    '/api/siparis-takibi',
    { no: o1.body.orderNumber, email: guestEmail },
  );
  check('doğru bilgilerle sipariş döner (ödendi)', lookup.status === 200 && lookup.body.order?.status === 'ödendi', `${lookup.status} ${lookup.body.order?.status}`);
  check('müşteriye görünür olaylar listelenir', (lookup.body.order?.events?.length ?? 0) >= 2);

  console.log('\n6) Müşteri hesabı');
  const reg = await post<{ customer: { email: string } }>('/api/hesap/kayit', {
    email: guestEmail,
    password: 'test-parola-2026',
    firstName: 'Deniz',
    lastName: 'Test',
    kvkkAccepted: true,
  });
  const cookie = reg.cookie.find((c) => c.startsWith('na_musteri='))?.split(';')[0];
  check('misafir → hesap dönüşümü 201 + çerez', reg.status === 201 && Boolean(cookie), `status=${reg.status} ${JSON.stringify(reg.body).slice(0, 160)}`);
  const meRes = await fetch(`${base}/api/hesap/siparisler`, { headers: { cookie: cookie ?? '' } });
  const me = (await meRes.json()) as { orders: { orderNumber: string }[] };
  check(
    'misafirken verilen siparişler hesapta görünür',
    me.orders?.some((o) => o.orderNumber === o1.body.orderNumber) && me.orders?.some((o) => o.orderNumber === o2.body.orderNumber),
    JSON.stringify(me).slice(0, 160),
  );
  const addrs = await fetch(`${base}/api/hesap/adresler`, { headers: { cookie: cookie ?? '' } });
  const addrBody = (await addrs.json()) as { addresses: { identityNumberMasked: string }[] };
  check('adres defteri maskeli TCKN ile döner', addrBody.addresses?.[0]?.identityNumberMasked === '100*****46');

  console.log('\n7) Müşteri iptali');
  const cancelRes = await post<{ order: { status: string } }>(`/api/hesap/siparisler/${o2.body.orderNumber}/iptal`, {}, {}, cookie);
  check('kapıda siparişi müşteri iptal edebilir', cancelRes.status === 200 && cancelRes.body.order?.status === 'iptal', `${cancelRes.status} ${JSON.stringify(cancelRes.body).slice(0, 160)}`);
  const afterCancel = await db.variant.findUnique({ where: { id: variant.id } });
  check('iptal: kesinleşmiş stok geri geldi (−2)', afterCancel?.stock === stockBefore - 2, `stok=${afterCancel?.stock}`);
  const cancelMoves = await db.stockMovement.findMany({ where: { orderId: o2.body.orderId } });
  check('iptal stok hareketi yazıldı', cancelMoves.some((m) => m.reason === 'iptal' && m.delta === 1));
  const cancelMail = await db.emailLog.count({ where: { orderId: o2.body.orderId, template: 'iptal' } });
  check('iptal e-postası kuyruğa düştü', cancelMail === 1);
  const cancelAgain = await post(`/api/hesap/siparisler/${o2.body.orderNumber}/iptal`, {}, {}, cookie);
  check('iptal edilmiş sipariş yeniden iptal edilemez (409)', cancelAgain.status === 409, `status=${cancelAgain.status}`);

  const dup = await post('/api/hesap/kayit', { email: guestEmail, password: 'test-parola-2026', firstName: 'Ayşe', lastName: 'Bulut', kvkkAccepted: true });
  check('aynı e-posta ile ikinci kayıt 409', dup.status === 409);
  const login = await post('/api/hesap/giris', { email: guestEmail, password: 'yanlis' });
  check('yanlış parola 401', login.status === 401);
} catch (err) {
  failures.push(String(err));
  console.error(err);
  console.error('--- sunucu günlüğü ---');
  console.error(log.slice(-2000));
} finally {
  server.kill();
  try {
    const orders = await db.order.findMany({
      where: { OR: [{ guestEmail }, { customer: { email: guestEmail } }] },
      include: { items: true },
    });
    for (const o of orders) {
      if (o.status !== 'iptal') {
        for (const i of o.items) {
          if (i.variantId) await db.variant.update({ where: { id: i.variantId }, data: { stock: { increment: i.quantity } } });
        }
      }
      await db.webhookEvent.deleteMany({ where: { externalId: { contains: o.id } } });
      await db.order.delete({ where: { id: o.id } });
    }
    await db.customer.deleteMany({ where: { email: guestEmail } });
    await db.loginAttempt.deleteMany({ where: { email: { contains: guestEmail } } });
    console.log(`\nTemizlik: ${orders.length} test siparişi ve müşteri silindi, stok geri kondu.`);
  } catch (e) {
    console.error('Temizlik hatası:', e);
  }
  await db.$disconnect();
}

console.log(`\n${passed} kontrol geçti, ${failures.length} başarısız.`);
for (const f of failures) console.log(`  ! ${f}`);
process.exit(failures.length === 0 ? 0 : 1);
