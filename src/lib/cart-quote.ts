'use client';

// Sepet / çekmece için sunucu teklifi: otomatik kampanyalar (10 al 9 öde vb.),
// kupon, kargo ücreti ve ücretsiz kargo eşiği yalnız sunucuda bilinir. Sepet
// veya kupon değiştikçe `/api/checkout/quote` adressiz çağrılır; sonuç
// `summarize`'a girer.

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
  /** Eşik öncesi kargo ücreti, TL; kargo yöntemi yoksa null. */
  shippingFee: number | null;
  /** Sunucunun kupon değerlendirmesi; kod girilmediyse null. `code` istenen koddur (sepetteki `promo`). */
  coupon:
    | { ok: true; code: string; discount: number; freeShipping: boolean }
    | { ok: false; code: string; reason: string }
    | null;
}

export function useCartCampaigns(lines: CartLine[], enabled = true): CartCampaigns | null {
  const couponCode = useCart((s) => s.promo);
  const payload = useMemo(
    () => ({
      lines: lines.map((l) => ({ variantId: l.variantId, quantity: l.qty })),
      couponCode: couponCode ?? undefined,
    }),
    [lines, couponCode],
  );
  const key = useDebounced(JSON.stringify(payload), 300);
  const [result, setResult] = useState<CartCampaigns | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const body = JSON.parse(key) as typeof payload;
    if (body.lines.length === 0) return;
    let cancelled = false;
    checkoutApi
      .quote(body)
      .then((q) => {
        if (cancelled) return;
        // Sepet sayfası bu satırları zaten gizliyor; ödemede hataya dönüşmesinler.
        if (q.removedVariantIds?.length) useCart.getState().removeVariants(q.removedVariantIds);
        const applied = q.appliedDiscounts.map((d) => ({ id: d.id, name: d.name, discount: d.discountMinor / 100 }));
        const code = body.couponCode ?? '';
        setResult({
          applied,
          discount: applied.reduce((s, d) => s + d.discount, 0),
          freeShippingThreshold: q.freeShippingThresholdMinor != null ? q.freeShippingThresholdMinor / 100 : null,
          shippingFee: q.shippingFeeMinor != null ? q.shippingFeeMinor / 100 : null,
          coupon: !q.coupon
            ? null
            : q.coupon.ok
              ? { ok: true, code, discount: q.coupon.discountMinor / 100, freeShipping: q.coupon.freeShipping }
              : { ok: false, code, reason: q.coupon.reason },
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
