// Eski panelden (admin.mixle.net) dışa aktarılan siparişleri Mixle mağazasına
// yükler. Eski sipariş numarası (ORD-2026-…) korunur.
//
// Kullanım:
//   npx tsx scripts/import-legacy-orders.ts --file=<mixle-siparisler.json> [--dry-run]
//
// - Sipariş, e-postası eşleşen müşteriye bağlanır; yoksa misafir siparişi olur.
// - Kalem SKU'su yerel varyantla eşleşirse ürün/varyant bağlantısı kurulur.
// - Stok hareketi YAZILMAZ (geçmiş siparişler stoktan düşmez).
// - Aynı sipariş numarası varsa atlanır; betik tekrar çalıştırılabilir.

import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, type Prisma } from '../src/generated/prisma/client';

const STORE = 'mixle';
const TAX_RATE_BPS = 2000;

interface LegacyParty { name: string; email: string; line: string; cityLine: string; phone: string }
interface LegacyOrder {
  id: string;
  no: string;
  status: string;
  date: string;
  items: { name: string; qty: number; sku: string; unit: number; total: number; img: string }[];
  sub: number;
  cargo: number;
  cod: number;
  grand: number;
  ship: LegacyParty;
  bill: LegacyParty;
  pay: string;
  carrier: string;
  tracking: string;
  note: string;
  events: { msg: string; at?: string }[];
}

const MONTHS = ['ocak', 'şubat', 'mart', 'nisan', 'mayıs', 'haziran', 'temmuz', 'ağustos', 'eylül', 'ekim', 'kasım', 'aralık'];

/** "14 Ekim 2026 00:20" (İstanbul saati) → Date */
function parseTrDate(s: string | undefined): Date | null {
  const m = /^(\d{1,2}) (\S+) (\d{4}) (\d{2}):(\d{2})$/.exec((s ?? '').trim());
  if (!m) return null;
  const month = MONTHS.indexOf(m[2].toLocaleLowerCase('tr'));
  if (month < 0) return null;
  return new Date(Date.UTC(+m[3], month, +m[1], +m[4] - 3, +m[5]));
}

const STATUS: Record<string, { status: string; payment: string; fulfillment: string }> = {
  PENDING: { status: 'ödeme-bekliyor', payment: 'bekliyor', fulfillment: 'hazırlanmadı' },
  CONFIRMED: { status: 'ödendi', payment: 'ödendi', fulfillment: 'hazırlanmadı' },
  PROCESSING: { status: 'hazırlanıyor', payment: 'ödendi', fulfillment: 'hazırlanmadı' },
  SHIPPED: { status: 'kargolandı', payment: 'ödendi', fulfillment: 'gönderildi' },
  DELIVERED: { status: 'teslim-edildi', payment: 'ödendi', fulfillment: 'teslim-edildi' },
  CANCELLED: { status: 'iptal', payment: 'bekliyor', fulfillment: 'hazırlanmadı' },
  REFUNDED: { status: 'iade-edildi', payment: 'iade-edildi', fulfillment: 'hazırlanmadı' },
};

const PAYMENT_METHOD: Record<string, string> = { 'Havale/EFT': 'havale', 'Kapıda Ödeme': 'kapida', 'Kredi Kartı': 'kart' };
// DHL e-Commerce, MNG Kargo'nun yeni adı.
const CARRIER: Record<string, string> = { 'Yurtiçi Kargo': 'yurtici', 'DHL e-Commerce': 'mng' };

function splitName(full: string): { firstName: string; lastName: string } {
  const parts = full.trim().split(/\s+/).filter((p) => p && p !== '-');
  if (parts.length <= 1) return { firstName: parts[0] ?? '', lastName: '' };
  return { firstName: parts.slice(0, -1).join(' '), lastName: parts[parts.length - 1] };
}

/** "Atakum / Samsun / Türkiye / 41100" → ilçe, il, posta kodu */
function addressSnapshot(p: LegacyParty) {
  const [district = '', city = '', , postal = ''] = p.cityLine.split(' / ').map((s) => s.trim());
  return {
    title: '',
    ...splitName(p.name),
    phone: p.phone,
    country: 'TR',
    city,
    district,
    neighborhood: '',
    addressLine: p.line,
    postalCode: /^\d{5}$/.test(postal) ? postal : '',
    isCorporate: false,
    companyName: '',
    taxOffice: '',
    taxNumber: '',
    identityNumberMasked: '',
  };
}

/** KDV dahil tutardan KDV payı. */
const taxOf = (grossMinor: number) => grossMinor - Math.round((grossMinor * 10000) / (10000 + TAX_RATE_BPS));

function arg(name: string): string | undefined {
  const hit = process.argv.slice(2).find((a) => a.startsWith(`--${name}=`));
  return hit?.slice(name.length + 3);
}

async function main() {
  const file = arg('file');
  const dryRun = process.argv.includes('--dry-run');
  if (!file) throw new Error('--file=... gerekli.');
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL tanımlı değil.');

  const orders = JSON.parse(readFileSync(file, 'utf8')) as LegacyOrder[];
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  const stats = { created: 0, exists: 0, toCustomer: 0, guest: 0, items: 0, linkedItems: 0, shipments: 0, unknown: [] as string[] };

  try {
    console.log(`Veritabanı: ${new URL(url).host}${dryRun ? '  (KURU ÇALIŞTIRMA)' : ''}`);

    const variants = await db.variant.findMany({
      where: { sku: { not: '' }, product: { store: STORE } },
      select: { id: true, sku: true, productId: true, image: true },
    });
    const bySku = new Map(variants.map((v) => [v.sku.toLowerCase(), v]));
    const customers = await db.customer.findMany({ where: { store: STORE }, select: { id: true, email: true } });
    const byEmail = new Map(customers.map((c) => [c.email, c.id]));
    const lastOrder = new Map<string, Date>();

    for (const o of orders) {
      const map = STATUS[o.status];
      const method = PAYMENT_METHOD[o.pay];
      const placedAt = parseTrDate(o.date);
      if (!map || !method || !placedAt) {
        stats.unknown.push(`${o.no}: durum=${o.status} ödeme=${o.pay} tarih=${o.date}`);
        continue;
      }
      if (await db.order.findUnique({ where: { orderNumber: o.no } })) {
        stats.exists++;
        continue;
      }

      const email = o.ship.email.trim().toLocaleLowerCase('tr');
      const customerId = byEmail.get(email) ?? null;
      if (customerId) stats.toCustomer++;
      else stats.guest++;

      const items = o.items.map((it) => {
        const v = bySku.get(it.sku.toLowerCase());
        if (v) stats.linkedItems++;
        return {
          productId: v?.productId ?? null,
          variantId: v?.id ?? null,
          name: it.name,
          sku: it.sku,
          imageUrl: v?.image || it.img || '',
          unitPriceMinor: it.unit,
          quantity: it.qty,
          taxRateBps: TAX_RATE_BPS,
          taxMinor: taxOf(it.total),
          lineTotalMinor: it.total,
        };
      });
      stats.items += items.length;

      const paid = map.payment === 'ödendi' || map.payment === 'iade-edildi';
      const carrier = CARRIER[o.carrier] ?? (o.carrier ? 'manuel' : null);
      const deliveredAt = o.status === 'DELIVERED' ? parseTrDate(o.events.find((e) => /Teslim Edildi/.test(e.msg))?.at) : null;
      const shippedAt = parseTrDate(o.events.find((e) => /Kargo atandı|Kargoda/.test(e.msg))?.at) ?? placedAt;
      const finishedAt = parseTrDate(o.events[o.events.length - 1]?.at) ?? placedAt;
      const addr = addressSnapshot(o.ship) as unknown as Prisma.InputJsonValue;

      const data: Prisma.OrderCreateInput = {
        store: STORE,
        orderNumber: o.no,
        ...(customerId ? { customer: { connect: { id: customerId } } } : {}),
        guestEmail: customerId ? null : email,
        status: map.status,
        paymentStatus: map.payment,
        fulfillmentStatus: map.fulfillment,
        currency: 'TRY',
        itemsSubtotalMinor: o.sub,
        shippingTotalMinor: o.cargo,
        surchargeMinor: o.cod,
        taxTotalMinor: items.reduce((s, i) => s + i.taxMinor, 0),
        grandTotalMinor: o.grand,
        refundedTotalMinor: o.status === 'REFUNDED' ? o.grand : 0,
        billingAddress: addressSnapshot(o.bill) as unknown as Prisma.InputJsonValue,
        shippingAddress: addr,
        paymentMethod: method,
        customerNote: o.note || null,
        adminNote: `Eski panelden aktarıldı (${o.id})`,
        consents: { legacy: true, source: 'admin.mixle.net' },
        source: 'web',
        placedAt,
        createdAt: placedAt,
        paidAt: paid ? placedAt : null,
        completedAt: o.status === 'DELIVERED' ? (deliveredAt ?? finishedAt) : null,
        items: { create: items },
        payments: {
          create: {
            provider: method,
            status: o.status === 'REFUNDED' ? 'iade-edildi' : paid ? 'başarılı' : 'bekliyor',
            amountMinor: o.grand,
            createdAt: placedAt,
            capturedAt: paid ? placedAt : null,
          },
        },
        events: {
          create: o.events.map((e) => ({
            kind: 'sistem',
            message: e.msg,
            createdAt: parseTrDate(e.at) ?? placedAt,
          })),
        },
      };

      const withShipment = Boolean(carrier && (o.tracking || o.status === 'SHIPPED' || o.status === 'DELIVERED'));
      if (!dryRun) {
        await db.$transaction(async (tx) => {
          const created = await tx.order.create({ data, include: { items: { select: { id: true, quantity: true } } } });
          if (withShipment) {
            await tx.shipment.create({
              data: {
                orderId: created.id,
                carrier: carrier!,
                trackingNumber: o.tracking || null,
                status: o.status === 'DELIVERED' ? 'teslim-edildi' : 'kargoya-verildi',
                items: created.items.map((i) => ({ orderItemId: i.id, quantity: i.quantity })),
                events: [],
                createdAt: shippedAt,
                shippedAt,
                deliveredAt: o.status === 'DELIVERED' ? (deliveredAt ?? finishedAt) : null,
              },
            });
          }
        });
      }
      if (withShipment) stats.shipments++;
      if (customerId && (!lastOrder.get(customerId) || lastOrder.get(customerId)! < placedAt)) {
        lastOrder.set(customerId, placedAt);
      }
      stats.created++;
    }

    if (!dryRun) {
      for (const [id, at] of lastOrder) {
        await db.customer.update({ where: { id }, data: { lastOrderAt: at } });
      }
    }
    console.log(stats);
  } finally {
    await db.$disconnect();
  }
}

main().catch((err: unknown) => {
  console.error(`\nHata: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
