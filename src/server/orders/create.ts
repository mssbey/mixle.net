// Sipariş oluşturma — checkout'un son adımı.
//
// GARANTİLER
//  - Fiyatlar istemciden alınmaz; teklif burada YENİDEN hesaplanır (quote.ts).
//  - Stok rezerve edilir; yetersizse hiçbir şey yazılmaz (transaction).
//  - Aynı Idempotency-Key ile ikinci istek aynı siparişi döndürür, yenisini açmaz.
//  - Kabul edilen yasal metinlerin SÜRÜMÜ siparişe yazılır.
//  - TCKN sipariş anlık görüntüsüne düz metin yazılmaz; şifreli hali adres
//    defterinde kalır, siparişte maskeli gösterim vardır.

import 'server-only';
import { z } from 'zod';
import type { Prisma } from '@/generated/prisma/client';
import { db } from '../db';
import { DEMO_MODE } from '../config';
import { maskTckn } from '@/lib/validators/tckn';
import { seal, isEncryptionConfigured } from '../crypto/secret-box';
import { reserveStock, releaseExpiredReservations } from '../inventory/reserve';
import { getCurrentLegal } from '../legal/documents';
import { orderEmailVars, queueEmail } from '../notifications/email';
import { getStoreInfo, getStoreSettings } from '../settings';
import { addressInputSchema, type AddressInput, type AddressSnapshot } from '../customers/address-schema';
import { nextOrderNumber } from './numbering';
import { PAYMENT_METHODS, buildQuote, quoteInputSchema, type CheckoutQuote } from './quote';
import { transitionOrder } from './transitions';

export const consentsSchema = z.object({
  distanceSales: z.literal(true, { errorMap: () => ({ message: 'Mesafeli satış sözleşmesini onaylamalısınız' }) }),
  preInfo: z.literal(true, { errorMap: () => ({ message: 'Ön bilgilendirme formunu onaylamalısınız' }) }),
  kvkk: z.literal(true, { errorMap: () => ({ message: 'KVKK aydınlatma metnini okuduğunuzu onaylamalısınız' }) }),
  /** Pazarlama izni AYRI ve isteğe bağlıdır; satın alma şartı olamaz. */
  marketing: z.boolean().default(false),
});

export const createOrderSchema = quoteInputSchema
  .omit({ city: true, country: true, email: true })
  .extend({
    email: z.string().trim().email('Geçerli bir e-posta girin').max(200),
    shippingAddress: addressInputSchema,
    billingSameAsShipping: z.boolean().default(true),
    billingAddress: addressInputSchema.optional(),
    shippingMethodId: z.string().min(1, 'Kargo yöntemi seçin'),
    paymentMethod: z.enum(PAYMENT_METHODS, { errorMap: () => ({ message: 'Ödeme yöntemi seçin' }) }),
    customerNote: z.string().trim().max(500).default(''),
    consents: consentsSchema,
    /** Misafir, sipariş sonunda hesap açmak isterse. */
    createAccountPassword: z.string().min(10).max(200).optional(),
  })
  .superRefine((v, ctx) => {
    if (!v.billingSameAsShipping && !v.billingAddress) {
      ctx.addIssue({ code: 'custom', path: ['billingAddress'], message: 'Fatura adresi girin' });
    }
  });

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export interface CreateOrderContext {
  customerId: string | null;
  ip: string | null;
  userAgent: string | null;
  idempotencyKey: string | null;
}

export class CheckoutError extends Error {
  constructor(
    message: string,
    public readonly status: 400 | 409 | 422 = 422,
    public readonly issues: Record<string, string> = {},
  ) {
    super(message);
    this.name = 'CheckoutError';
  }
}

function toSnapshot(a: AddressInput): AddressSnapshot {
  const { identityNumber, ...rest } = a;
  return { ...rest, identityNumberMasked: identityNumber ? maskTckn(identityNumber) : '' };
}

/** Adres defterine yazar (TCKN şifreli). Şifreleme yapılandırılmamışsa TCKN atlanır. */
async function saveAddress(
  tx: Prisma.TransactionClient,
  customerId: string,
  a: AddressInput,
  type: 'teslimat' | 'fatura',
) {
  const enc = a.identityNumber && isEncryptionConfigured() ? seal(a.identityNumber) : null;
  const existingDefault = await tx.address.count({ where: { customerId, type } });
  return tx.address.create({
    data: {
      customerId,
      type,
      title: a.title || (type === 'fatura' ? 'Fatura adresi' : 'Teslimat adresi'),
      firstName: a.firstName,
      lastName: a.lastName,
      phone: a.phone,
      country: a.country,
      city: a.city,
      district: a.district,
      neighborhood: a.neighborhood,
      addressLine: a.addressLine,
      postalCode: a.postalCode || null,
      isDefault: existingDefault === 0,
      isCorporate: a.isCorporate,
      companyName: a.isCorporate ? a.companyName : null,
      taxOffice: a.isCorporate ? a.taxOffice : null,
      taxNumber: a.isCorporate ? a.taxNumber : null,
      identityNumberEnc: enc,
    },
  });
}

export interface CreateOrderResult {
  orderId: string;
  orderNumber: string;
  status: string;
  paymentMethod: string;
  grandTotalMinor: number;
  /** Aynı Idempotency-Key ile daha önce oluşturulmuştu. */
  reused: boolean;
  /** Kart ödemesinde yönlendirilecek sayfa (test modunda mock 3DS). */
  nextUrl: string | null;
}

export async function createOrder(
  raw: unknown,
  ctx: CreateOrderContext,
): Promise<CreateOrderResult> {
  // 1) Idempotency — aynı anahtarla gelen ikinci istek yeni sipariş açmaz.
  if (ctx.idempotencyKey) {
    const existing = await db.order.findUnique({ where: { idempotencyKey: ctx.idempotencyKey } });
    if (existing) {
      return {
        orderId: existing.id,
        orderNumber: existing.orderNumber,
        status: existing.status,
        paymentMethod: existing.paymentMethod,
        grandTotalMinor: existing.grandTotalMinor,
        reused: true,
        nextUrl: existing.paymentMethod === 'kart' ? mockPaymentUrl(existing.id) : null,
      };
    }
  }

  const parsed = createOrderSchema.safeParse(raw);
  if (!parsed.success) {
    const issues: Record<string, string> = {};
    for (const i of parsed.error.issues) issues[i.path.join('.')] ||= i.message;
    throw new CheckoutError('Formda eksik veya hatalı alanlar var.', 422, issues);
  }
  const input = parsed.data;
  const email = input.email.toLocaleLowerCase('tr');

  // 2) Süresi dolmuş rezervasyonları temizle ki stok gerçek değeri yansıtsın.
  await db.$transaction((tx) => releaseExpiredReservations(tx));

  // 3) Teklifi sunucuda yeniden hesapla.
  const quote: CheckoutQuote = await buildQuote(
    {
      lines: input.lines,
      city: input.shippingAddress.city,
      country: input.shippingAddress.country,
      shippingMethodId: input.shippingMethodId,
      paymentMethod: input.paymentMethod,
      couponCode: input.couponCode,
      email,
    },
    { customerId: ctx.customerId },
  );

  if (quote.cart.lines.length === 0) {
    throw new CheckoutError('Sepetinizdeki ürünler artık satışta değil.', 422);
  }
  if (quote.cart.problems.length) {
    // Stok düşürüldü / ürün çıkarıldı: kullanıcı yeni tutarı görmeli, sessizce yazma.
    throw new CheckoutError(quote.cart.problems[0], 409, { lines: quote.cart.problems.join(' ') });
  }
  if (!quote.selectedShipping) {
    throw new CheckoutError('Seçtiğiniz kargo yöntemi bu adres için geçerli değil.', 422, {
      shippingMethodId: 'Kargo yöntemini yeniden seçin',
    });
  }
  if (!quote.selectedPayment) {
    const opt = quote.paymentOptions.find((p) => p.id === input.paymentMethod);
    throw new CheckoutError(opt?.reason ?? 'Ödeme yöntemi kullanılamıyor.', 422, {
      paymentMethod: opt?.reason ?? 'Ödeme yöntemini yeniden seçin',
    });
  }
  if (quote.coupon && !quote.coupon.ok) {
    throw new CheckoutError(quote.coupon.reason, 422, { couponCode: quote.coupon.reason });
  }
  if (input.paymentMethod === 'kart' && !DEMO_MODE) {
    throw new CheckoutError(
      'Kart ödemesi henüz canlı sağlayıcıya bağlı değil. Havale veya kapıda ödeme seçin.',
      422,
      { paymentMethod: 'Canlı kart ödemesi F3 ile açılacak' },
    );
  }

  const [settings, legalDs, legalPi, legalKvkk] = await Promise.all([
    getStoreSettings(),
    getCurrentLegal('mesafeli-satis'),
    getCurrentLegal('on-bilgilendirme'),
    getCurrentLegal('kvkk-aydinlatma'),
  ]);

  const now = new Date();
  const billing = input.billingSameAsShipping ? input.shippingAddress : input.billingAddress!;
  const shippingSnapshot = toSnapshot(input.shippingAddress);
  const billingSnapshot = toSnapshot(billing);
  const t = quote.totals;

  // 4) Her şey tek transaction'da: numara, müşteri, sipariş, kalemler, stok, ödeme, kupon.
  const created = await db.$transaction(async (tx) => {
    // Müşteri: oturum varsa o; yoksa e-postaya göre misafir kaydı (upsert).
    let customerId = ctx.customerId;
    if (!customerId) {
      const guest = await tx.customer.upsert({
        where: { email },
        create: {
          email,
          isGuest: true,
          firstName: input.shippingAddress.firstName,
          lastName: input.shippingAddress.lastName,
          phone: input.shippingAddress.phone,
          tags: [],
          marketingOptIn: input.consents.marketing,
          marketingOptInAt: input.consents.marketing ? now : null,
        },
        update: {
          // Misafir verisi tazelenir; kayıtlı hesabın adı ezilmez.
          ...(await tx.customer.findUnique({ where: { email }, select: { isGuest: true } }))?.isGuest
            ? {
                firstName: input.shippingAddress.firstName,
                lastName: input.shippingAddress.lastName,
                phone: input.shippingAddress.phone,
              }
            : {},
          ...(input.consents.marketing ? { marketingOptIn: true, marketingOptInAt: now } : {}),
        },
      });
      customerId = guest.id;
    } else if (input.consents.marketing) {
      await tx.customer.update({
        where: { id: customerId },
        data: { marketingOptIn: true, marketingOptInAt: now },
      });
    }

    await saveAddress(tx, customerId, input.shippingAddress, 'teslimat');
    if (!input.billingSameAsShipping) await saveAddress(tx, customerId, billing, 'fatura');

    const orderNumber = await nextOrderNumber(tx);

    const order = await tx.order.create({
      data: {
        orderNumber,
        customerId,
        guestEmail: ctx.customerId ? null : email,
        status: 'ödeme-bekliyor',
        paymentStatus: 'bekliyor',
        fulfillmentStatus: 'hazırlanmadı',
        currency: 'TRY',
        itemsSubtotalMinor: t.itemsSubtotalMinor,
        discountTotalMinor: t.discountTotalMinor,
        shippingTotalMinor: t.shippingTotalMinor,
        taxTotalMinor: t.taxTotalMinor,
        surchargeMinor: t.surchargeMinor,
        grandTotalMinor: t.grandTotalMinor,
        taxBreakdown: t.taxBreakdown as unknown as Prisma.InputJsonValue,
        billingAddress: billingSnapshot as unknown as Prisma.InputJsonValue,
        shippingAddress: shippingSnapshot as unknown as Prisma.InputJsonValue,
        couponCode: t.couponCode,
        couponSnapshot: quote.coupon?.ok
          ? ({ code: quote.coupon.code, type: quote.coupon.type, discountMinor: quote.coupon.discountMinor } as Prisma.InputJsonValue)
          : undefined,
        paymentMethod: input.paymentMethod,
        shippingMethod: {
          id: quote.selectedShipping!.methodId,
          name: quote.selectedShipping!.name,
          carrier: quote.selectedShipping!.carrier,
          priceMinor: quote.selectedShipping!.priceMinor,
          estimatedDays: quote.selectedShipping!.estimatedDays,
          type: quote.selectedShipping!.type,
        } as Prisma.InputJsonValue,
        customerNote: input.customerNote || null,
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent?.slice(0, 400) ?? null,
        consents: {
          distanceSales: { version: legalDs.version, acceptedAt: now.toISOString() },
          preInfo: { version: legalPi.version, acceptedAt: now.toISOString() },
          kvkk: { version: legalKvkk.version, acceptedAt: now.toISOString() },
          marketing: input.consents.marketing ? { acceptedAt: now.toISOString() } : null,
        } as Prisma.InputJsonValue,
        source: 'web',
        idempotencyKey: ctx.idempotencyKey,
        placedAt: now,
        items: {
          create: t.lines.map((l) => ({
            productId: l.productId,
            variantId: l.variantId,
            name: l.name,
            variantLabel: l.variantLabel,
            sku: l.sku,
            imageUrl: l.imageUrl,
            unitPriceMinor: l.unitPriceMinor,
            quantity: l.quantity,
            discountMinor: l.discountMinor,
            taxRateBps: l.taxRateBps,
            taxMinor: l.taxMinor,
            lineTotalMinor: l.netLineMinor,
          })),
        },
        events: {
          create: {
            kind: 'durum-degisti',
            fromStatus: 'taslak',
            toStatus: 'ödeme-bekliyor',
            message: 'Sipariş vitrinden oluşturuldu',
            visibleToCustomer: true,
          },
        },
        payments: {
          create: {
            provider: input.paymentMethod === 'kart' ? (DEMO_MODE ? 'mock' : 'iyzico') : input.paymentMethod,
            status: 'bekliyor',
            amountMinor: t.grandTotalMinor,
            installment: 1,
            threeDS: input.paymentMethod === 'kart',
          },
        },
      },
    });

    await reserveStock(
      tx,
      t.lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
      {
        orderId: order.id,
        expiresAt: new Date(now.getTime() + settings.reservationMinutes * 60_000),
        names: Object.fromEntries(t.lines.map((l) => [l.variantId, l.name])),
      },
    );

    if (quote.coupon?.ok) {
      const coupon = await tx.coupon.findUnique({ where: { code: quote.coupon.code } });
      if (coupon) {
        await tx.couponRedemption.create({
          data: {
            couponId: coupon.id,
            orderId: order.id,
            customerId,
            email,
            amountMinor: quote.coupon.discountMinor,
          },
        });
        await tx.coupon.update({ where: { id: coupon.id }, data: { usedCount: { increment: 1 } } });
      }
    }

    await tx.customer.update({ where: { id: customerId }, data: { lastOrderAt: now } });

    return order;
  });

  // 5) Kapıda ödeme: ödeme teslimatta; sipariş hemen hazırlığa geçer, stok kesinleşir.
  if (input.paymentMethod === 'kapida') {
    await transitionOrder(created.id, 'hazırlanıyor', { system: 'kapida' }, {
      note: 'Kapıda ödeme — hazırlığa alındı, ödeme teslimatta alınacak',
      visibleToCustomer: true,
      skipEmail: true,
    });
  }

  // 6) Bildirimler (transaction dışında; başarısız olsa da sipariş kaydı kalır).
  const info = await getStoreInfo();
  const vars = {
    ...orderEmailVars({ ...created, customer: null }),
    sozlesmeSurumu: legalDs.version,
    odemeTalimati: paymentInstruction(input.paymentMethod, info),
  };
  await queueEmail({ to: email, template: 'siparis-alindi', vars, orderId: created.id });
  if (info.notifyEmail) {
    await queueEmail({ to: info.notifyEmail, template: 'yeni-siparis-yonetici', vars, orderId: created.id });
  }

  return {
    orderId: created.id,
    orderNumber: created.orderNumber,
    status: input.paymentMethod === 'kapida' ? 'hazırlanıyor' : created.status,
    paymentMethod: created.paymentMethod,
    grandTotalMinor: created.grandTotalMinor,
    reused: false,
    nextUrl: input.paymentMethod === 'kart' ? mockPaymentUrl(created.id) : null,
  };
}

function paymentInstruction(method: string, info: { legalName: string }): string {
  switch (method) {
    case 'havale':
      return `Havale/EFT ile ödeme için IBAN bilgisi sipariş sayfanızda gösterilir. Açıklama alanına sipariş numaranızı yazın. Ödeme ${info.legalName} tarafından onaylanınca siparişiniz hazırlanır.`;
    case 'kapida':
      return 'Ödemeyi teslimat sırasında kuryeye nakit veya kartla yapabilirsiniz.';
    default:
      return '';
  }
}

/** Test modunda kart ödemesi mock 3DS sayfasına yönlendirilir (F3'te gerçek sağlayıcı). */
export function mockPaymentUrl(orderId: string): string {
  return `/odeme/dogrulama?siparis=${encodeURIComponent(orderId)}`;
}
