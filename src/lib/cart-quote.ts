'use client';

// Sepet / çekmece için sunucu teklifi: otomatik kampanyalar (10 al 9 öde vb.)
// ve ücretsiz kargo eşiği yalnız sunucuda bilinir. Sepet değiştikçe
// `/api/checkout/quote` adres/kupon olmadan çağrılır; sonuç `summarize`'a girer.

import { useEffect, useMemo, useState } from 'react';
import type { CartLine } from '@/types';
import { useCart } from '@/store/cart';
import { checkoutApi } from './checkout-client';
import { useDebounced } from './hooks';

export interface CartCampaigns {
  /** Uygulanan kampanyalar, TL. */
  applied: { id: string; name: string; discount: number }[];
  /** Toplam kampanya indirimi, TL. */
  discount: number;
  /** Ücretsiz kargo eşiği (indirim sonrası tutara), TL; yoksa null. */
  freeShippingThreshold: number | null;
}

export function useCartCampaigns(lines: CartLine[], enabled = true): CartCampaigns | null {
  const payload = useMemo(
    () => lines.map((l) => ({ variantId: l.variantId, quantity: l.qty })),
    [lines],
  );
  const key = useDebounced(JSON.stringify(payload), 300);
  const [result, setResult] = useState<CartCampaigns | null>(null);

  useEffect(() => {
    if (!enabled || key === '[]') return;
    let cancelled = false;
    checkoutApi
      .quote({ lines: JSON.parse(key) as { variantId: string; quantity: number }[] })
      .then((q) => {
        if (cancelled) return;
        // Sepet sayfası bu satırları zaten gizliyor; ödemede hataya dönüşmesinler.
        if (q.removedVariantIds?.length) useCart.getState().removeVariants(q.removedVariantIds);
        const applied = q.appliedDiscounts.map((d) => ({ id: d.id, name: d.name, discount: d.discountMinor / 100 }));
        setResult({
          applied,
          discount: applied.reduce((s, d) => s + d.discount, 0),
          freeShippingThreshold: q.freeShippingThresholdMinor != null ? q.freeShippingThresholdMinor / 100 : null,
        });
      })
      // Teklif alınamazsa sepet yerel hesapla çalışmaya devam eder.
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [key, enabled]);

  // Yeni teklif gelene kadar (debounce + istek) son sonuç gösterilir; satırlar titremesin.
  return result;
}
