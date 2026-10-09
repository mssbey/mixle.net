import type { CartLine, CartLineDetailed, Product } from '@/types';
import { promoInfo } from '@/store/cart';
import { site } from '@/lib/site';
import type { CartCampaigns } from '@/lib/cart-quote';

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
  /** Otomatik kampanya indirimi (sunucu teklifinden), TL. */
  campaignDiscount: number;
  campaigns: CartCampaigns['applied'];
  /** Ücretsiz kargo eşiği, TL (sunucudan; teklif yoksa site varsayılanı). Eşik tanımlı değilse null. */
  freeShippingThreshold: number | null;
  promoLabel: string | null;
  shipping: number;
  freeShippingRemaining: number;
  total: number;
}

export function summarize(
  lines: CartLineDetailed[],
  promo: string | null,
  campaigns: CartCampaigns | null = null,
): CartSummary {
  const itemCount = lines.reduce((s, l) => s + l.qty, 0);
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const productSavings = lines.reduce((s, l) => s + (l.lineOldTotal - l.lineTotal), 0);

  const info = promoInfo(promo);
  let promoDiscount = 0;
  if (info && subtotal > 0) {
    promoDiscount =
      info.type === 'percent' ? Math.round(subtotal * info.value * 100) / 100 : Math.min(info.value, subtotal);
  }

  // Kampanyalar boş sepette sıfır; eşik indirimler düştükten sonraki tutara uygulanır.
  const campaignDiscount = subtotal > 0 ? Math.min(campaigns?.discount ?? 0, subtotal) : 0;
  const afterPromo = Math.max(0, subtotal - campaignDiscount - promoDiscount);
  const freeShippingThreshold = campaigns ? campaigns.freeShippingThreshold : site.commerce.freeShippingThreshold;
  const { shippingFee } = site.commerce;
  const reached = freeShippingThreshold != null && afterPromo >= freeShippingThreshold;
  const shipping = afterPromo === 0 || reached ? 0 : shippingFee;
  const freeShippingRemaining = freeShippingThreshold == null ? 0 : Math.max(0, freeShippingThreshold - afterPromo);

  return {
    itemCount,
    subtotal,
    productSavings,
    promoDiscount,
    campaignDiscount,
    campaigns: campaignDiscount > 0 ? campaigns?.applied.filter((c) => c.discount > 0) ?? [] : [],
    freeShippingThreshold,
    promoLabel: info?.label ?? null,
    shipping,
    freeShippingRemaining,
    total: afterPromo + shipping,
  };
}
