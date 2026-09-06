// Mock ödeme sağlayıcısı — TEST MODU.
//
// DEMO_MODE=true iken kart ödemesi gerçek sağlayıcıya gitmez; müşteri bir
// "3D Secure benzeri" sayfada sonucu seçer. Amaç: checkout, durum makinesi ve
// stok akışını uçtan uca gerçek para olmadan sınamak. F3'te `PaymentProvider`
// arayüzü ve gerçek adaptörler bu dosyanın yanına gelir; bu mock, CI'daki tam
// akış testinin sağlayıcısı olarak kalır.
//
// Sayfa jetonu: orderId'nin SESSION_SECRET ile HMAC'i. Test modunda bile
// rastgele bir sipariş kimliğiyle ödeme "onaylanamasın" diye.

import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Prisma } from '@/generated/prisma/client';
import { db } from '../db';
import { DEMO_MODE } from '../config';
import { transitionOrder } from '../orders/transitions';

export type MockOutcome = 'basarili' | 'basarisiz';

export function mockToken(orderId: string): string {
  const secret = process.env.SESSION_SECRET ?? 'demo';
  return createHmac('sha256', secret).update(`mock-odeme:${orderId}`).digest('base64url');
}

export function verifyMockToken(orderId: string, token: string): boolean {
  const expected = Buffer.from(mockToken(orderId));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export class MockPaymentError extends Error {
  constructor(
    message: string,
    public readonly status: 400 | 403 | 404 | 409 = 400,
  ) {
    super(message);
    this.name = 'MockPaymentError';
  }
}

/** Mock 3DS sayfasının göstereceği sipariş özeti. */
export async function mockPaymentContext(orderId: string) {
  if (!DEMO_MODE) throw new MockPaymentError('Test ödemesi yalnız demo modunda kullanılabilir.', 403);
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      grandTotalMinor: true,
      paymentMethod: true,
      guestEmail: true,
      customer: { select: { email: true } },
    },
  });
  if (!order) throw new MockPaymentError('Sipariş bulunamadı.', 404);
  if (order.paymentMethod !== 'kart') {
    throw new MockPaymentError('Bu sipariş kart ile ödenmiyor.', 409);
  }
  return { ...order, token: mockToken(order.id) };
}

/**
 * Mock ödeme sonucunu işler: Payment satırını günceller ve siparişi
 * `ödendi` ya da `başarısız` durumuna geçirir. Idempotent: zaten sonuçlanmış
 * siparişte ikinci çağrı hiçbir şey değiştirmez.
 */
export async function completeMockPayment(
  orderId: string,
  token: string,
  outcome: MockOutcome,
): Promise<{ status: string; orderNumber: string }> {
  if (!DEMO_MODE) throw new MockPaymentError('Test ödemesi yalnız demo modunda kullanılabilir.', 403);
  if (!verifyMockToken(orderId, token)) throw new MockPaymentError('Geçersiz ödeme jetonu.', 403);

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { payments: { orderBy: { createdAt: 'desc' }, take: 1 } },
  });
  if (!order) throw new MockPaymentError('Sipariş bulunamadı.', 404);

  // Zaten sonuçlanmış: tekrar işlem yapma (webhook idempotency ile aynı ilke).
  if (order.status !== 'ödeme-bekliyor' && order.status !== 'başarısız') {
    return { status: order.status, orderNumber: order.orderNumber };
  }
  // Başarısızdan yeniden deneme: önce ödeme-bekliyor'a al.
  if (order.status === 'başarısız') {
    await transitionOrder(order.id, 'ödeme-bekliyor', { system: 'mock' }, {
      note: 'Yeniden ödeme denemesi',
      skipEmail: true,
    });
  }

  const payment = order.payments[0];
  const ok = outcome === 'basarili';
  const providerPaymentId = `mock_${Date.now().toString(36)}`;
  const raw: Prisma.InputJsonValue = {
    provider: 'mock',
    outcome,
    // Gerçek sağlayıcıda burası maskelenmiş ham yanıttır; PAN/CVV asla yazılmaz.
    card: { brand: 'TEST', last4: '0000' },
  };

  if (payment) {
    await db.payment.update({
      where: { id: payment.id },
      data: {
        provider: 'mock',
        providerPaymentId,
        status: ok ? 'başarılı' : 'başarısız',
        cardBrand: 'TEST',
        cardLast4: '0000',
        threeDS: true,
        rawResponse: raw,
        capturedAt: ok ? new Date() : null,
        failedAt: ok ? null : new Date(),
        errorCode: ok ? null : 'MOCK_DECLINED',
        errorMessage: ok ? null : 'Test ödemesi reddedildi (kullanıcı seçimi).',
      },
    });
  }

  const updated = await transitionOrder(
    order.id,
    ok ? 'ödendi' : 'başarısız',
    { system: 'mock' },
    { note: ok ? 'Test ödemesi onaylandı (mock 3DS)' : 'Test ödemesi reddedildi (mock 3DS)', visibleToCustomer: true },
  );

  return { status: updated.status, orderNumber: updated.orderNumber };
}
