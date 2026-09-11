import { describe, expect, it } from 'vitest';
import {
  evaluateDiscountRules,
  type DiscountRule,
  type DiscountRuleLine,
} from './discount-rules';
import { computeTotals, type PricedLine } from '../orders/totals';
import { evaluateCoupon, type CouponRule } from './coupons';

function rule(partial: Partial<DiscountRule>): DiscountRule {
  return {
    id: 'r1',
    name: 'Kural',
    type: 'sepet-yuzde',
    isActive: true,
    priority: 0,
    stackable: true,
    includeCategoryIds: [],
    includeProductIds: [],
    percentBps: 0,
    minCartTotalMinor: null,
    buyQuantity: null,
    payQuantity: null,
    minQuantity: null,
    startsAt: null,
    endsAt: null,
    ...partial,
  };
}

function line(partial: Partial<DiscountRuleLine>): DiscountRuleLine {
  return { productId: 'p1', categoryIds: ['c1'], unitPriceMinor: 10_000, quantity: 1, ...partial };
}

describe('sepet-yuzde', () => {
  it('eşik altında indirim uygulamaz', () => {
    const out = evaluateDiscountRules(
      [rule({ type: 'sepet-yuzde', percentBps: 3000, minCartTotalMinor: 50_000 })],
      { lines: [line({ unitPriceMinor: 10_000, quantity: 2 })] }, // 20.000 < 50.000
    );
    expect(out.perLineMinor).toEqual([0]);
    expect(out.applied).toHaveLength(0);
  });

  it('eşik üstünde uygun satırlara yüzde indirim uygular', () => {
    const out = evaluateDiscountRules(
      [rule({ type: 'sepet-yuzde', percentBps: 3000, minCartTotalMinor: 0 })],
      { lines: [line({ unitPriceMinor: 10_000, quantity: 2 })] }, // 20.000 → %30 = 6.000
    );
    expect(out.perLineMinor).toEqual([6_000]);
    expect(out.applied[0]).toMatchObject({ id: 'r1', discountMinor: 6_000 });
  });

  it('yalnız eşleşen kategorideki satırlara uygulanır', () => {
    const out = evaluateDiscountRules(
      [rule({ type: 'sepet-yuzde', percentBps: 5000, includeCategoryIds: ['indirimli'] })],
      {
        lines: [
          line({ categoryIds: ['indirimli'], unitPriceMinor: 10_000, quantity: 1 }),
          line({ categoryIds: ['diger'], unitPriceMinor: 20_000, quantity: 1 }),
        ],
      },
    );
    expect(out.perLineMinor).toEqual([5_000, 0]);
  });
});

describe('x-al-y-ode', () => {
  it('10 al 9 öde: en ucuz 1 birim bedava', () => {
    const out = evaluateDiscountRules(
      [rule({ type: 'x-al-y-ode', buyQuantity: 10, payQuantity: 9, minQuantity: 10 })],
      {
        lines: [
          line({ productId: 'ucuz', unitPriceMinor: 5_000, quantity: 4 }),
          line({ productId: 'pahali', unitPriceMinor: 9_000, quantity: 6 }),
        ],
      },
    );
    // 10 birim → 1 set → 1 bedava → en ucuz birim (5.000) ucuz satırdan.
    expect(out.perLineMinor).toEqual([5_000, 0]);
    expect(out.applied[0].discountMinor).toBe(5_000);
  });

  it('23 birim → 2 set → 2 birim bedava', () => {
    const out = evaluateDiscountRules(
      [rule({ type: 'x-al-y-ode', buyQuantity: 10, payQuantity: 9 })],
      { lines: [line({ unitPriceMinor: 3_000, quantity: 23 })] },
    );
    expect(out.perLineMinor).toEqual([6_000]);
  });

  it('minimum adet altında uygulanmaz', () => {
    const out = evaluateDiscountRules(
      [rule({ type: 'x-al-y-ode', buyQuantity: 10, payQuantity: 9, minQuantity: 10 })],
      { lines: [line({ unitPriceMinor: 3_000, quantity: 9 })] },
    );
    expect(out.perLineMinor).toEqual([0]);
  });
});

describe('öncelik ve stacking', () => {
  it('stackable:false kural sonrası kalan kurallar atlanır', () => {
    const out = evaluateDiscountRules(
      [
        rule({ id: 'ilk', priority: 1, type: 'sepet-yuzde', percentBps: 1000, stackable: false }),
        rule({ id: 'ikinci', priority: 2, type: 'sepet-yuzde', percentBps: 5000 }),
      ],
      { lines: [line({ unitPriceMinor: 10_000, quantity: 1 })] },
    );
    expect(out.applied.map((a) => a.id)).toEqual(['ilk']);
    expect(out.perLineMinor).toEqual([1_000]);
  });
});

describe('kupon ile birleşik sınır (computeTotals)', () => {
  it('kupon + kural indirimi satır tutarını geçemez', () => {
    const pricedLines: PricedLine[] = [
      {
        productId: 'p1',
        variantId: 'v1',
        name: 'Ürün',
        variantLabel: '',
        sku: '',
        imageUrl: '',
        unitPriceMinor: 10_000,
        quantity: 1,
        taxRateBps: 2000,
      },
    ];

    const coupon = evaluateCoupon(
      {
        code: 'YARIM',
        type: 'yüzde',
        value: 8000, // %80
        minCartTotalMinor: null,
        maxDiscountMinor: null,
        startsAt: null,
        endsAt: null,
        usageLimit: null,
        usageLimitPerCustomer: null,
        usedCount: 0,
        includeProductIds: [],
        excludeProductIds: [],
        includeCategoryIds: [],
        firstOrderOnly: false,
        isActive: true,
        stackable: true,
      } satisfies CouponRule,
      { lines: [{ productId: 'p1', categoryIds: ['c1'], lineTotalMinor: 10_000 }], customerUsageCount: 0, hasPreviousOrders: false },
    );

    const totals = computeTotals({
      lines: pricedLines,
      coupon,
      shipping: null,
      pricesIncludeTax: true,
      autoDiscountPerLineMinor: [5_000], // kural %50 → kupon %80 + %50 = %130
    });

    // Satır tutarı 10.000; toplam indirim bununla sınırlı.
    expect(totals.discountTotalMinor).toBe(10_000);
    expect(totals.lines[0].netLineMinor).toBe(0);
  });
});
