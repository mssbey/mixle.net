'use client';

// Sepet / çekmece için sunucu teklifi: otomatik kampanyalar (10 al 9 öde vb.),
// kupon, kargo ücreti ve ücretsiz kargo eşiği yalnız sunucuda bilinir. Sepet
// veya kupon değiştikçe `/api/checkout/quote` adressiz çağrılır; sonuç
// `summarize`'a girer.

import { useEffect, useState } from 'react';
import type { CartLine } from '@/types';
import { useCart } from '@/store/cart';
import { checkoutApi, type QuoteResponse } from './checkout-client';
import { useDebounced } from './hooks';

export interface CartCampaigns {
  /** Teklifin hesaplandığı sepet (satırlar + kupon) — bkz. `cartQuoteKey`. */
  key: string;
  /** Sunucunun fiyatladığı ürün ara toplamı (satışta/stokta olanlar), TL. */
  subtotal: number;
  /** Uygulanan kampanyalar, TL. */
  applied: { id: string; name: string; discount: number }[];
  /** Toplam kampanya indirimi, TL. */
  discount: number;
  /** Ücretsiz kargo eşiği (indirim sonrası tutara), TL; eşik yoksa null. */
  freeShippingThreshold: number | null;
  /** Eşik öncesi kargo ücreti, TL; uygun kargo yöntemi yoksa null. */
  shippingFee: number | null;
  /** Eşik/kupon uygulanmış tahmini kargo, TL; uygun kargo yöntemi yoksa null. */
  shipping: number | null;
  /** Ücret/eşik adrese göre değişebilir (bölgesel tarife var). */
  shippingVaries: boolean;
  /** Sunucunun kupon değerlendirmesi; kod girilmediyse null. `code` istenen koddur (sepetteki `promo`). */
  coupon:
    | { ok: true; code: string; discount: number; freeShipping: boolean }
    | { ok: false; code: string; reason: string }
    | null;
}

/**
 * - `loading`: teklif henüz gelmedi ya da eldeki teklif güncel sepete ait değil.
 * - `ready`: teklif güncel sepete ait.
 * - `error`: teklif alınamadı — yerel tahmin kesin tutar gibi gösterilmez.
 */
export type CartQuoteStatus = 'loading' | 'ready' | 'error';

export interface CartQuoteState {
  quote: CartCampaigns | null;
  status: CartQuoteStatus;
}

/** Teklif isteğinin kimliği; aynı sepet + kupon aynı anahtarı üretir. */
export function cartQuoteKey(lines: CartLine[], couponCode: string | null): string {
  return JSON.stringify({
    lines: lines.map((l) => ({ variantId: l.variantId, quantity: l.qty })),
    couponCode: couponCode ?? undefined,
  });
}

/** Sunucu yanıtını sepetin TL tabanlı görünümüne çevirir (saf). */
export function toCartCampaigns(key: string, couponCode: string, q: QuoteResponse): CartCampaigns {
  const applied = q.appliedDiscounts.map((d) => ({ id: d.id, name: d.name, discount: d.discountMinor / 100 }));
  return {
    key,
    subtotal: q.totals.itemsSubtotalMinor / 100,
    applied,
    discount: applied.reduce((s, d) => s + d.discount, 0),
    freeShippingThreshold: q.freeShippingThresholdMinor != null ? q.freeShippingThresholdMinor / 100 : null,
    shippingFee: q.shippingFeeMinor != null ? q.shippingFeeMinor / 100 : null,
    shipping: q.shippingEstimate ? q.shippingEstimate.priceMinor / 100 : null,
    shippingVaries: q.shippingEstimate?.varies ?? false,
    coupon: !q.coupon
      ? null
      : q.coupon.ok
        ? { ok: true, code: couponCode, discount: q.coupon.discountMinor / 100, freeShipping: q.coupon.freeShipping }
        : { ok: false, code: couponCode, reason: q.coupon.reason },
  };
}

/**
 * Gösterilecek teklif durumu (saf). Teklif yalnız kendi anahtarı güncel sepete
 * eşitse `ready`; geç gelen/eski yanıt güncel sepeti "hazır" gibi gösteremez.
 */
export function quoteStateFor(
  currentKey: string,
  result: CartCampaigns | null,
  failedKey: string | null,
): CartQuoteState {
  if (failedKey === currentKey) return { quote: null, status: 'error' };
  return { quote: result, status: result?.key === currentKey ? 'ready' : 'loading' };
}

export function useCartCampaigns(lines: CartLine[], enabled = true): CartQuoteState {
  const couponCode = useCart((s) => s.promo);
  const currentKey = cartQuoteKey(lines, couponCode);
  const key = useDebounced(currentKey, 300);
  const [result, setResult] = useState<CartCampaigns | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const body = JSON.parse(key) as { lines: { variantId: string; quantity: number }[]; couponCode?: string };
    if (body.lines.length === 0) return;
    // Önceki isteğin yanıtı geç gelirse `cancelled` onu yok sayar: eski sepet
    // yeni sonucu ezemez.
    let cancelled = false;
    checkoutApi
      .quote(body)
      .then((q) => {
        if (cancelled) return;
        // Sepet sayfası bu satırları zaten gizliyor; ödemede hataya dönüşmesinler.
        if (q.removedVariantIds?.length) useCart.getState().removeVariants(q.removedVariantIds);
        setFailedKey(null);
        setResult(toCartCampaigns(key, body.couponCode ?? '', q));
      })
      .catch(() => {
        if (!cancelled) setFailedKey(key);
      });
    return () => {
      cancelled = true;
    };
  }, [key, enabled]);

  // Yeni teklif gelene kadar son sonuç gösterilir (satırlar titremesin) ama
  // durum `loading` kalır; teklif alınamadıysa sonuç gösterilmez.
  return quoteStateFor(currentKey, result, failedKey);
}
