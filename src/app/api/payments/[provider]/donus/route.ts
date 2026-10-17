// 3DS / hosted sayfa dönüşü — müşterinin tarayıcısı gelir (POST veya GET).
//
// Gövde webhook ile aynı doğrulamadan geçer (idempotent), sonra müşteri
// teşekkür sayfasına yönlendirilir. Webhook daha önce işlediyse burada
// "duplicate" döner ve yine yönlendirilir — iki yol da aynı sonuca çıkar.

import { handlePaymentWebhook } from '@/server/payments/webhooks';
import { acceptsWebhooks } from '@/server/payments/registry';
import { db } from '@/server/db';
import { thankYouUrl } from '@/server/orders/access';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ provider: string }> };

async function finish(request: Request, providerId: string) {
  const url = new URL(request.url);
  const siparis = url.searchParams.get('siparis');

  let orderId: string | null = siparis;
  if (acceptsWebhooks(providerId) && request.method === 'POST') {
    const out = await handlePaymentWebhook(providerId, request);
    orderId = out.orderId ?? orderId;
  }

  const order = orderId ? await db.order.findUnique({ where: { id: orderId }, select: { id: true, orderNumber: true, status: true } }) : null;
  const target = order
    ? `${thankYouUrl(order.orderNumber, order.id)}${order.status === 'başarısız' ? '&odeme=basarisiz' : ''}`
    : '/siparis-takibi';

  // 303: POST'tan GET'e güvenli yönlendirme. Göreli Location: Plesk/PM2 proxy
  // arkasında request.url'in origin'i http://localhost:3000 olur; mutlak URL
  // kurmak müşteriyi localhost'a gönderiyordu. Tarayıcı göreli adresi geldiği
  // alan adına göre çözer.
  return new Response(null, { status: 303, headers: { Location: target } });
}

export async function POST(request: Request, { params }: Ctx) {
  const { provider } = await params;
  return finish(request, provider);
}

export async function GET(request: Request, { params }: Ctx) {
  const { provider } = await params;
  return finish(request, provider);
}
