// Mock 3DS ödeme sonucu — YALNIZ DEMO_MODE.
// Gerçek sağlayıcılar F3'te /api/webhooks/payments/[provider] üzerinden gelir.

import { completeMockPayment } from '@/server/payments/mock';
import { assertSameOrigin, readJsonBody, storefrontError } from '@/lib/storefront-http';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const { orderId, token, outcome } = await readJsonBody<{
      orderId?: string;
      token?: string;
      outcome?: string;
    }>(request);
    if (!orderId || !token || (outcome !== 'basarili' && outcome !== 'basarisiz')) {
      return Response.json({ error: 'invalid', message: 'Eksik parametre.' }, { status: 400 });
    }
    const result = await completeMockPayment(orderId, token, outcome);
    return Response.json({ ok: true, ...result });
  } catch (err) {
    return storefrontError(err);
  }
}
