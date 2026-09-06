import { describe, expect, it } from 'vitest';
import { computeTotals, type PricedLine } from './totals';
import { evaluateCoupon, type CouponRule } from '@/server/pricing/coupons';
import type { ShippingQuote } from '@/server/pricing/shipping-rates';

const lines: PricedLine[] = [
  {
    productId: 'a', variantId: 'a-30', name: 'A', variantLabel: '30ml', sku: 'A30', imageUrl: '',
    unitPriceMinor: 12990, quantity: 2, taxRateBps: 2000,
  },
  {
    productId: 'b', variantId: 'b-10', name: 'B', variantLabel: '10ml', sku: 'B10', imageUrl: '',
    unitPriceMinor: 4550, quantity: 1, taxRateBps: 100,
  },
];

const shipping: ShippingQuote = {
  methodId: 'std', zoneId: 'tr', name: 'Standart', type: 'sabit', carrier: 'yurtici',
  estimatedDays: '2-4', priceMinor: 5490, freeReason: null,
};

const coupon10: CouponRule = {
  code: 'NEFIS10', type: 'yüzde', value: 1000,
  minCartTotalMinor: null, maxDiscountMinor: null, startsAt: null, endsAt: null,
  usageLimit: null, usageLimitPerCustomer: null, usedCount: 0,
  includeProductIds: [], excludeProductIds: [], includeCategoryIds: [],
  firstOrderOnly: false, isActive: true, stackable: false,
};

describe('sipariş toplamları', () => {
  it('kuponsuz, KDV dahil: değişmez tutar', () => {
    const t = computeTotals({ lines, coupon: null, shipping, pricesIncludeTax: true });
    expect(t.itemsSubtotalMinor).toBe(25980 + 4550);
    expect(t.discountTotalMinor).toBe(0);
    expect(t.shippingTotalMinor).toBe(5490);
    expect(t.grandTotalMinor).toBe(t.itemsSubtotalMinor - t.discountTotalMinor + t.shippingTotalMinor);
    // KDV fiyatın içinde: 25980 → 4330, 4550 (%1) → 45, kargo 5490 → 915
    expect(t.taxTotalMinor).toBe(4330 + 45 + 915);
    expect(t.taxBreakdown.map((r) => r.rateBps)).toEqual([2000, 100]);
  });

  it('kupon indirimi satırlara dağıtılır ve KDV indirim sonrası hesaplanır', () => {
    const coupon = evaluateCoupon(coupon10, {
      lines: lines.map((l) => ({
        productId: l.productId, categoryIds: [], lineTotalMinor: l.unitPriceMinor * l.quantity,
      })),
      customerUsageCount: 0, hasPreviousOrders: false,
    });
    const t = computeTotals({ lines, coupon, shipping, pricesIncludeTax: true });
    expect(t.discountTotalMinor).toBe(3053); // %10 of 30530
    expect(t.lines.map((l) => l.discountMinor).reduce((a, b) => a + b, 0)).toBe(3053);
    expect(t.grandTotalMinor).toBe(30530 - 3053 + 5490);
    expect(t.couponCode).toBe('NEFIS10');
    // İndirim sonrası satır A: 25980 - 2598 = 23382 → KDV 3897
    expect(t.lines[0].taxMinor).toBe(3897);
  });

  it('KDV hariç modda vergi genel toplama eklenir', () => {
    const t = computeTotals({ lines, coupon: null, shipping, pricesIncludeTax: false });
    // 25980 × %20 = 5196; 4550 × %1 = 46 (45.5 yukarı); kargo 5490 × %20 = 1098
    expect(t.taxTotalMinor).toBe(5196 + 46 + 1098);
    expect(t.grandTotalMinor).toBe(30530 + 5490 + t.taxTotalMinor);
  });

  it('ücretsiz kargo kuponu kargoyu sıfırlar', () => {
    const coupon = evaluateCoupon({ ...coupon10, type: 'ücretsiz-kargo', value: 0 }, {
      lines: [], customerUsageCount: 0, hasPreviousOrders: false,
    });
    const t = computeTotals({
      lines, coupon, shipping: { ...shipping, priceMinor: 0, freeReason: 'kupon' }, pricesIncludeTax: true,
    });
    expect(t.shippingTotalMinor).toBe(0);
    expect(t.freeShipping).toBe(true);
    expect(t.grandTotalMinor).toBe(30530);
  });

  it('kapıda ödeme ek bedeli eklenir ve KDV\'ye girer', () => {
    const t = computeTotals({ lines, coupon: null, shipping, pricesIncludeTax: true, surchargeMinor: 1500 });
    expect(t.surchargeMinor).toBe(1500);
    expect(t.grandTotalMinor).toBe(30530 + 5490 + 1500);
    expect(t.taxTotalMinor).toBe(4330 + 45 + 915 + 250);
  });

  it('adet ve fiyat negatif olamaz', () => {
    const t = computeTotals({
      lines: [{ ...lines[0], quantity: -3, unitPriceMinor: -100 }],
      coupon: null, shipping: null, pricesIncludeTax: true,
    });
    expect(t.itemsSubtotalMinor).toBe(0);
    expect(t.grandTotalMinor).toBe(0);
  });

  it('başarısız kupon indirim uygulamaz', () => {
    const t = computeTotals({
      lines, coupon: { ok: false, reason: 'x' }, shipping, pricesIncludeTax: true,
    });
    expect(t.discountTotalMinor).toBe(0);
    expect(t.couponCode).toBeNull();
  });
});
