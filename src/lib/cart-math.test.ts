import { describe, expect, it } from 'vitest';
import type { CartLineDetailed } from '@/types';
import { shippingLabel, summarize } from './cart-math';
import { cartQuoteKey, quoteStateFor, toCartCampaigns, type CartCampaigns } from './cart-quote';
import type { QuoteResponse } from './checkout-client';

const line = (price: number, qty = 1, id = 'v1'): CartLineDetailed =>
  ({
    key: id, productId: `p-${id}`, variantId: id, qty,
    product: {} as CartLineDetailed['product'],
    variant: {} as CartLineDetailed['variant'],
    lineTotal: price * qty,
    lineOldTotal: price * qty,
  }) as CartLineDetailed;

const quote = (over: Partial<CartCampaigns> = {}): CartCampaigns => ({
  key: 'k', subtotal: 1600, applied: [], discount: 0,
  freeShippingThreshold: 1500, shippingFee: 150, shipping: 0, shippingVaries: false, coupon: null, ...over,
});
const fmt = (n: number) => `${n} ₺`;

describe('sepet özeti', () => {
  it('teklif yokken sabit yedek kullanılmaz: kargo bilinmiyor, toplam kargo hariç', () => {
    const s = summarize([line(1000)], null, { quote: null, status: 'loading' });
    expect(s.shipping).toBeNull();
    expect(s.freeShippingThreshold).toBeNull();
    expect(s.freeShippingRemaining).toBe(0);
    expect(s.total).toBe(1000);
    expect(shippingLabel(s, fmt)).toBe('Hesaplanıyor…');
  });

  it('teklif hatası: tahmin kesin tutar gibi sunulmaz', () => {
    const s = summarize([line(1000)], null, { quote: null, status: 'error' });
    expect(s.shipping).toBeNull();
    expect(shippingLabel(s, fmt)).toBe('Ödeme adımında hesaplanır');
  });

  it('sunucu "eşik yok" dediyse yedek eşik devreye girmez', () => {
    const q = quote({ subtotal: 5000, freeShippingThreshold: null, shipping: 150 });
    const s = summarize([line(5000)], null, { quote: q, status: 'ready' });
    expect(s.freeShippingThreshold).toBeNull();
    expect(s.freeShippingRemaining).toBe(0);
    expect(s.shipping).toBe(150);
    expect(s.total).toBe(5150);
  });

  it('uygun kargo yöntemi yoksa kargo bilinmiyor', () => {
    const q = quote({ subtotal: 1000, shippingFee: null, shipping: null, freeShippingThreshold: null });
    const s = summarize([line(1000)], null, { quote: q, status: 'ready' });
    expect(s.shipping).toBeNull();
    expect(shippingLabel(s, fmt)).toBe('Ödeme adımında hesaplanır');
  });

  it('kupon eşik altına düşürür: 1600 − 150 = 1450 → 150 kargo, toplam 1600, kalan 50', () => {
    const q = quote({ coupon: { ok: true, code: 'IND', discount: 150, freeShipping: false }, shipping: 150 });
    const s = summarize([line(1600)], 'IND', { quote: q, status: 'ready' });
    expect(s.promoDiscount).toBe(150);
    expect(s.shipping).toBe(150);
    expect(s.total).toBe(1600);
    expect(s.freeShippingRemaining).toBe(50);
  });

  it('başka koda ait kupon sonucu gösterilmez', () => {
    const q = quote({ coupon: { ok: true, code: 'ESKI', discount: 500, freeShipping: false } });
    const s = summarize([line(1600)], 'YENI', { quote: q, status: 'loading' });
    expect(s.promoDiscount).toBe(0);
    expect(s.promoValid).toBeNull();
  });

  it('teklif yoldayken (sepet değişti) aynı yöntemin ücret/eşiğiyle anlık tahmin; tam eşik ücretsiz', () => {
    const q = quote({ subtotal: 1000, shipping: 150 });
    expect(summarize([line(1499.99)], null, { quote: q, status: 'loading' }).shipping).toBe(150);
    expect(summarize([line(1500)], null, { quote: q, status: 'loading' }).shipping).toBe(0);
  });

  it('güncel teklifte ara toplam sunucudan (stokta olmayan satır hariç)', () => {
    const q = quote({ subtotal: 1000, shipping: 150 });
    const s = summarize([line(1000, 1, 'a'), line(800, 1, 'b')], null, { quote: q, status: 'ready' });
    expect(s.subtotal).toBe(1000);
    expect(s.total).toBe(1150);
  });

  it('indirimle sıfırlanan sepette kargo yine yansır (ödeme ekranıyla aynı)', () => {
    const q = quote({ subtotal: 200, discount: 200, applied: [{ id: 'r', name: 'Bedava', discount: 200 }], shipping: 150 });
    const s = summarize([line(200)], null, { quote: q, status: 'ready' });
    expect(s.total).toBe(150);
  });

  it('boş sepet: kargo 0, toplam 0', () => {
    const s = summarize([], null, { quote: quote(), status: 'ready' });
    expect(s.shipping).toBe(0);
    expect(s.total).toBe(0);
  });

  it('kuruş toplamları kayan nokta hatası üretmez', () => {
    const q = quote({ subtotal: 0.3, freeShippingThreshold: null, shipping: 0.1, coupon: null });
    const s = summarize([line(0.1), line(0.2, 1, 'b')], null, { quote: q, status: 'ready' });
    expect(s.total).toBe(0.4);
  });
});

describe('teklif durumu (eski yanıt koruması)', () => {
  const k1 = cartQuoteKey([{ key: 'a', productId: 'p', variantId: 'a', qty: 1, addedAt: 0 }], null);
  const k2 = cartQuoteKey([{ key: 'a', productId: 'p', variantId: 'a', qty: 2, addedAt: 0 }], null);
  it('adet değişince eski teklif "hazır" sayılmaz', () => {
    expect(quoteStateFor(k2, quote({ key: k1 }), null).status).toBe('loading');
    expect(quoteStateFor(k1, quote({ key: k1 }), null).status).toBe('ready');
  });
  it('kupon değişince anahtar değişir', () => {
    expect(cartQuoteKey([], 'A')).not.toBe(cartQuoteKey([], 'B'));
  });
  it('güncel sepetin isteği başarısızsa teklif gösterilmez', () => {
    expect(quoteStateFor(k1, quote({ key: k1 }), k1)).toEqual({ quote: null, status: 'error' });
    // Eski sepetin hatası yeni sepeti etkilemez.
    expect(quoteStateFor(k2, quote({ key: k2 }), k1).status).toBe('ready');
  });
  it('sunucu yanıtı TL görünümüne çevrilir; null eşik null kalır', () => {
    const r = toCartCampaigns('k', '', {
      totals: { itemsSubtotalMinor: 160_000 },
      appliedDiscounts: [{ id: 'r', name: 'K', type: 'sepet-yuzde', discountMinor: 1_050 }],
      freeShippingThresholdMinor: null,
      shippingFeeMinor: 15_000,
      shippingEstimate: { methodId: 'std', name: 'S', priceMinor: 15_000, freeReason: null, varies: true },
      coupon: null,
    } as unknown as QuoteResponse);
    expect(r).toMatchObject({ subtotal: 1600, discount: 10.5, freeShippingThreshold: null, shipping: 150, shippingVaries: true });
  });
});
