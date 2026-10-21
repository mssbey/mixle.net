// "Stoğa gelince haber ver" — tükenen varyant için e-posta bırakılır.
//
// `POST { variantId, email }`. Origin doğrulaması + IP başına dakikada 5 deneme.
// Aynı e-posta/varyant tekrar gönderilirse hata değil, talep yenilenir.

import { assertSameOrigin, clientIpOf, readJsonBody, storefrontError } from '@/lib/storefront-http';
import { createStockAlert } from '@/server/catalog/stock-alerts';

export const dynamic = 'force-dynamic';

const WINDOW_MS = 60_000;
const LIMIT = 5;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  list.push(now);
  hits.set(ip, list);
  return list.length > LIMIT;
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const ip = clientIpOf(request);
    if (rateLimited(ip)) {
      return Response.json(
        { error: 'rate', message: 'Çok fazla deneme. Bir dakika sonra tekrar deneyin.' },
        { status: 429 },
      );
    }
    await createStockAlert(await readJsonBody(request), ip);
    return Response.json({ ok: true, message: 'Ürün stoğa girdiğinde size e-posta göndereceğiz.' });
  } catch (err) {
    return storefrontError(err);
  }
}
