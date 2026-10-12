import type { CartLine, CartLineDetailed, Product } from '@/types';
import { toMinor } from '@/lib/money';
import type { CartCampaigns, CartQuoteState, CartQuoteStatus } from '@/lib/cart-quote';

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
  /** Ücretsiz kargo eşiği, TL (sunucudan). Eşik yoksa veya teklif yoksa null. */
  freeShippingThreshold: number | null;
  /** Kupon reddedildiyse nedeni; ücretsiz kargo kuponuysa bilgi metni. */
  promoLabel: string | null;
  /** Sunucu kuponu kabul etti mi; kod yoksa veya teklif bekleniyorsa null. */
  promoValid: boolean | null;
  /** Kargo, TL. null → bilinmiyor (teklif bekleniyor/alınamadı ya da uygun yöntem yok). */
  shipping: number | null;
  /** Kargo adrese göre değişebilir; arayüz "tahmini" diye gösterir. */
  shippingVaries: boolean;
  /** Teklif durumu: kargo bilinmiyorsa nedenini ayırt etmek için. */
  quoteStatus: CartQuoteStatus;
  freeShippingRemaining: number;
  /** Genel toplam; `shipping` null ise kargo HARİÇ. */
  total: number;
}

const tl = (minor: number) => minor / 100;

export function summarize(
  lines: CartLineDetailed[],
  promo: string | null,
  state: CartQuoteState = { quote: null, status: 'loading' },
): CartSummary {
  const itemCount = lines.reduce((s, l) => s + l.qty, 0);
  const localSubtotal = toMinor(lines.reduce((s, l) => s + l.lineTotal, 0));
  const productSavings = lines.reduce((s, l) => s + (l.lineOldTotal - l.lineTotal), 0);
  const quote = itemCount > 0 ? state.quote : null;
  const fresh = state.status === 'ready' && quote != null;

  // Güncel teklif varsa ara toplam sunucunun fiyatladığı tutardır (stokta
  // olmayan satırlar hariç, güncel fiyat) — ödeme ekranıyla aynı rakam.
  const subtotal = fresh ? toMinor(quote.subtotal) : localSubtotal;

  // Kupon sunucuda (gerçek kupon tablosu) değerlendirilir. Teklif henüz yeni
  // koda yetişmediyse eski kodun sonucu kullanılmaz.
  const coupon = promo && quote?.coupon?.code === promo ? quote.coupon : null;
  const promoDiscount = coupon?.ok ? Math.min(toMinor(coupon.discount), subtotal) : 0;

  // Ücretsiz kargo eşiği TÜM indirimler (kampanya + kupon) düştükten sonraki
  // tutara uygulanır: 1600 ₺ sepet − 150 ₺ kupon = 1450 ₺ → eşik (1500 ₺)
  // altında, kargo ücreti yansır. Tam eşik tutarı ücretsiz kargo kazanır.
  const campaignDiscount = Math.min(toMinor(quote?.discount ?? 0), subtotal);
  const afterPromo = Math.max(0, subtotal - campaignDiscount - promoDiscount);

  const threshold = quote?.freeShippingThreshold != null ? toMinor(quote.freeShippingThreshold) : null;
  const couponFreeShipping = Boolean(coupon?.ok && coupon.freeShipping);
  let shipping: number | null = null;
  if (itemCount === 0) shipping = 0;
  else if (quote && fresh) shipping = quote.shipping != null ? toMinor(quote.shipping) : null;
  else if (quote?.shippingFee != null) {
    // Sepet değişti, yeni teklif yolda: aynı yöntemin ücret/eşiğiyle anlık tahmin.
    const reached = threshold != null && afterPromo >= threshold;
    shipping = reached || couponFreeShipping ? 0 : toMinor(quote.shippingFee);
  }
  const freeShippingRemaining =
    threshold == null || shipping == null || shipping === 0 ? 0 : Math.max(0, threshold - afterPromo);

  return {
    itemCount,
    subtotal: tl(subtotal),
    productSavings,
    promoDiscount: tl(promoDiscount),
    campaignDiscount: tl(campaignDiscount),
    campaigns: campaignDiscount > 0 ? quote?.applied.filter((c) => c.discount > 0) ?? [] : [],
    freeShippingThreshold: threshold != null ? tl(threshold) : null,
    promoLabel: coupon ? (coupon.ok ? (coupon.freeShipping ? 'Ücretsiz kargo' : null) : coupon.reason) : null,
    promoValid: coupon ? coupon.ok : null,
    shipping: shipping != null ? tl(shipping) : null,
    shippingVaries: quote?.shippingVaries ?? false,
    quoteStatus: itemCount === 0 ? 'ready' : state.status,
    freeShippingRemaining: tl(freeShippingRemaining),
    total: tl(afterPromo + (shipping ?? 0)),
  };
}

/** Kargo satırı metni — sepet ve çekmece aynı dili konuşsun. */
export function shippingLabel(summary: CartSummary, currency: (n: number) => string): string {
  if (summary.shipping == null) {
    return summary.quoteStatus === 'loading' ? 'Hesaplanıyor…' : 'Ödeme adımında hesaplanır';
  }
  return summary.shipping === 0 ? 'Ücretsiz' : currency(summary.shipping);
}
