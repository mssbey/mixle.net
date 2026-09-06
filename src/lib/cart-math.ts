import type { CartLine, CartLineDetailed, Product } from '@/types';
import { promoInfo } from '@/store/cart';
import { site } from '@/lib/site';

/**
 * Sepet satırlarını ürün verisiyle eşler. Ürün listesi parametreyle gelir:
 * veri katmanı sunucu-only olduğu için client bileşenleri onu
 * `useSlimProducts()` ile alır.
 */
export function detailLines(lines: CartLine[], products: Product[]): CartLineDetailed[] {
  return lines
    .map((line) => {
      const product = products.find((p) => p.id === line.productId);
      const variant = product?.variants.find((v) => v.id === line.variantId);
      if (!product || !variant) return null;
      return {
        ...line,
        product,
        variant,
        lineTotal: variant.price * line.qty,
        lineOldTotal: (variant.oldPrice ?? variant.price) * line.qty,
      } satisfies CartLineDetailed;
    })
    .filter((x): x is CartLineDetailed => x !== null);
}

export interface CartSummary {
  itemCount: number;
  subtotal: number;
  productSavings: number;
  promoDiscount: number;
  promoLabel: string | null;
  shipping: number;
  freeShippingRemaining: number;
  total: number;
}

export function summarize(lines: CartLineDetailed[], promo: string | null): CartSummary {
  const itemCount = lines.reduce((s, l) => s + l.qty, 0);
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const productSavings = lines.reduce((s, l) => s + (l.lineOldTotal - l.lineTotal), 0);

  const info = promoInfo(promo);
  let promoDiscount = 0;
  if (info && subtotal > 0) {
    promoDiscount =
      info.type === 'percent' ? Math.round(subtotal * info.value * 100) / 100 : Math.min(info.value, subtotal);
  }

  const afterPromo = Math.max(0, subtotal - promoDiscount);
  const { freeShippingThreshold, shippingFee } = site.commerce;
  const shipping = afterPromo === 0 || afterPromo >= freeShippingThreshold ? 0 : shippingFee;
  const freeShippingRemaining = Math.max(0, freeShippingThreshold - afterPromo);

  return {
    itemCount,
    subtotal,
    productSavings,
    promoDiscount,
    promoLabel: info?.label ?? null,
    shipping,
    freeShippingRemaining,
    total: afterPromo + shipping,
  };
}
