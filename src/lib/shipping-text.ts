// Vitrin kargo metinleri — saf. Rakamlar panelden (mağazanın kargo yöntemleri,
// bkz. `server/shipping/policy.ts`) gelir; burada sabit tutar YOKTUR.

import { formatMinor } from '@/lib/money';

export interface PublicShippingPolicy {
  /** Adres bilinmeden geçerli ücretsiz kargo eşiği, kuruş; yoksa null. */
  thresholdMinor: number | null;
  /** Adres bilinmeden geçerli kargo ücreti, kuruş; kademeli/bilinmiyorsa null. */
  feeMinor: number | null;
  /** Bölgeye göre farklı ücret/eşik var. */
  varies: boolean;
}

export const NO_SHIPPING_POLICY: PublicShippingPolicy = { thresholdMinor: null, feeMinor: null, varies: false };

/** "1.500 ₺ üzeri siparişlerde kargo bizden" — eşik yoksa null (vaat edilmez). */
export function freeShippingClaim(p: PublicShippingPolicy): string | null {
  if (p.thresholdMinor == null) return null;
  const base = `${formatMinor(p.thresholdMinor)} üzeri siparişlerde kargo bizden`;
  return p.varies ? `${base} (bölgeye göre değişebilir)` : base;
}

/** Ürün sayfası kısa satırı. */
export function freeShippingShort(p: PublicShippingPolicy): string | null {
  if (p.thresholdMinor == null) return null;
  return `${formatMinor(p.thresholdMinor)} üzeri ücretsiz kargo${p.varies ? ' (bölgeye göre)' : ''}`;
}
