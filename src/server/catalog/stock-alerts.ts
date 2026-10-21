// "Stoğa gelince haber ver" talepleri.
//
// Vitrin: tükenen varyant için e-posta bırakılır (`createStockAlert`).
// Gönderim: stok her yerden değişebilir (ürün düzenleyici, stok yönetimi,
// sipariş düzenleme, iade/iptal…) ve hepsi sonunda `revalidateCatalog()`
// çağırır. O da `scheduleStockAlertSweep()` ile yanıttan SONRA bekleyen
// talepleri tarar: yeniden satılabilir olan varyantlar için tek seferlik
// e-posta gider. Böylece tek tek yazma noktalarına dokunmak gerekmez.

import 'server-only';
import { z } from 'zod';
import { after } from 'next/server';
import { db } from '../db';
import { currentStore, runWithStore } from '../store-context';
import { queueEmail } from '../notifications/email';
import { getStoreBrand } from '../settings';
import { isStoreId } from '@/lib/stores';

export const stockAlertInputSchema = z.object({
  variantId: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().email('Geçerli bir e-posta adresi girin.').max(200),
});

export class StockAlertError extends Error {
  readonly status = 404;
  constructor(message: string) {
    super(message);
    this.name = 'StockAlertError';
  }
}

/** Talebi kaydeder; aynı e-posta + varyant ikinci kez gelirse yeniden beklemeye alınır. */
export async function createStockAlert(raw: unknown, ip: string | null): Promise<void> {
  const input = stockAlertInputSchema.parse(raw);
  const store = currentStore();
  const variant = await db.variant.findFirst({
    where: { id: input.variantId, isActive: true, product: { store, status: 'yayında' } },
    select: { id: true },
  });
  if (!variant) throw new StockAlertError('Ürün bulunamadı.');

  await db.stockAlert.upsert({
    where: { variantId_email: { variantId: variant.id, email: input.email } },
    create: { store, variantId: variant.id, email: input.email, ip },
    update: { notifiedAt: null },
  });
}

let pending = false;

/** İstek başına bir kez, yanıt döndükten sonra tarama planlar. */
export function scheduleStockAlertSweep(): void {
  if (pending) return;
  pending = true;
  const run = async () => {
    pending = false;
    await sweepStockAlerts().catch((err: unknown) => console.error('[stok-bildirimi] tarama başarısız:', err));
  };
  try {
    after(run);
  } catch {
    // İstek bağlamı dışında (betik vb.)
    void run();
  }
}

/** Satılabilir hâle gelen varyantların bekleyen taleplerine e-posta gönderir. */
export async function sweepStockAlerts(): Promise<number> {
  const due = await db.stockAlert.findMany({
    where: {
      notifiedAt: null,
      variant: {
        isActive: true,
        product: { status: 'yayında' },
        OR: [{ trackStock: true, stock: { gt: 0 } }, { trackStock: false, inStock: true }],
      },
    },
    include: { variant: { include: { product: { select: { name: true, slug: true, store: true } } } } },
    take: 200,
  });

  let sent = 0;
  for (const alert of due) {
    // Aynı talebi iki eşzamanlı tarama göndermesin: önce işaretle.
    const claimed = await db.stockAlert.updateMany({
      where: { id: alert.id, notifiedAt: null },
      data: { notifiedAt: new Date() },
    });
    if (claimed.count === 0) continue;

    const store = isStoreId(alert.store) ? alert.store : currentStore();
    await runWithStore(store, async () => {
      const brand = await getStoreBrand().catch(() => ({ name: '', url: '' }));
      const link = `${brand.url}/urun/${alert.variant.product.slug}`;
      await queueEmail({
        to: alert.email,
        template: 'stok-geldi',
        vars: { urunAdi: alert.variant.product.name, urunLinki: link, butonLinki: link },
      });
    });
    sent += 1;
  }
  return sent;
}
