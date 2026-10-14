// Uçtan uca teklif: sepet → kampanya → kupon → kargo → ödeme → toplam.
// Veritabanı yok: fiyatlanmış sepet, kupon, kurallar ve kargo bölgeleri izole
// test verisidir (canlı veri okunmaz/yazılmaz).

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PricedCart } from './pricing';
import type { CouponOutcome } from '@/server/pricing/coupons';
import type { DiscountRule } from '@/server/pricing/discount-rules';
import type { ShippingZoneRule } from '@/server/pricing/shipping-rates';

vi.mock('server-only', () => ({}));
vi.mock('../db', () => ({ db: {} }));

const state = vi.hoisted(() => ({
  cart: null as unknown as PricedCart,
  coupon: null as CouponOutcome | null,
  rules: [] as DiscountRule[],
  zonesByStore: {} as Record<string, ShippingZoneRule[]>,
}));

vi.mock('./pricing', async (orig) => ({
  ...(await orig<typeof import('./pricing')>()),
  priceCart: vi.fn(async () => state.cart),
  resolveCoupon: vi.fn(async (code: string | undefined) => (code ? state.coupon : null)),
}));
vi.mock('../discounts/rules', () => ({ loadActiveDiscountRules: vi.fn(async () => state.rules) }));
vi.mock('../shipping/zones', async () => {
  const { currentStore } = await import('../store-context');
  return { getShippingZones: vi.fn(async () => state.zonesByStore[currentStore()] ?? []) };
});
vi.mock('../settings', () => ({
  getStoreSettings: vi.fn(async () => ({
    pricesIncludeTax: true,
    shippingTaxRateBps: 2000,
    defaultTaxRateBps: 2000,
    codSurchargeMinor: 2_000,
    codMaxTotalMinor: null,
  })),
}));
vi.mock('../config', () => ({ DEMO_MODE: false }));
vi.mock('../payments/settings', () => ({
  getPaymentSettings: vi.fn(async () => ({
    methods: [{ id: 'kart', enabled: true }, { id: 'havale', enabled: true }, { id: 'kapida', enabled: true }],
    limits: {
      kart: { minMinor: null, maxMinor: null },
      havale: { minMinor: null, maxMinor: null },
      kapida: { minMinor: null, maxMinor: null },
    },
  })),
  installmentTables: () => [],
  isMethodEnabled: (s: { methods: { id: string; enabled: boolean }[] }, id: string) =>
    s.methods.find((m) => m.id === id)?.enabled ?? false,
}));

const { buildQuote } = await import('./quote');
const { assertExpectedTotal, CheckoutError } = await import('./create');
const { runWithStore } = await import('../store-context');

function cartOf(lines: { id: string; unit: number; qty: number; weight?: number | null }[]): PricedCart {
  return {
    lines: lines.map((l) => ({
      productId: `p-${l.id}`, variantId: l.id, name: l.id, variantLabel: '', sku: l.id, imageUrl: '',
      unitPriceMinor: l.unit, quantity: l.qty, taxRateBps: 2000,
    })),
    availability: [],
    couponLines: lines.map((l) => ({ productId: `p-${l.id}`, categoryIds: [], lineTotalMinor: l.unit * l.qty })),
    problems: [],
    removedVariantIds: [],
    weightKg: lines.every((l) => l.weight != null) ? lines.reduce((s, l) => s + (l.weight ?? 0) * l.qty, 0) / 1000 : null,
  };
}

const zone = (methods: ShippingZoneRule['methods'], over: Partial<ShippingZoneRule> = {}): ShippingZoneRule => ({
  id: 'tr', name: 'Türkiye', countries: ['TR'], cities: [], sortOrder: 0, methods, ...over,
});
const std = { id: 'std', zoneId: 'tr', name: 'Standart', type: 'sabit' as const, priceMinor: 15_000, freeOverMinor: 150_000, tiers: null, estimatedDays: '', carrier: null, isActive: true, sortOrder: 0 };
const cod = { ...std, id: 'cod', name: 'Kapıda', type: 'kapıda' as const, freeOverMinor: null, sortOrder: 1 };

const fixedCoupon = (discountMinor: number, lineTotals: number[]): CouponOutcome => {
  const total = lineTotals.reduce((a, b) => a + b, 0);
  return {
    ok: true, code: 'IND', type: 'tutar', discountMinor, freeShipping: false,
    perLineMinor: lineTotals.map((t, i, a) =>
      i === a.length - 1 ? discountMinor - a.slice(0, -1).reduce((s, x) => s + Math.round((discountMinor * x) / total), 0) : Math.round((discountMinor * t) / total),
    ),
  };
};

beforeEach(() => {
  state.coupon = null;
  state.rules = [];
  state.zonesByStore = { mixle: [zone([std, cod])] };
});

const who = { customerId: 'c1' };

describe('ücretsiz kargo eşiği — indirim sonrası tutar', () => {
  it('örnek: 160.000 − 15.000 kupon = 145.000 → kargo 15.000, toplam 160.000', async () => {
    state.cart = cartOf([{ id: 'a', unit: 160_000, qty: 1 }]);
    state.coupon = fixedCoupon(15_000, [160_000]);
    const q = await buildQuote({ lines: [{ variantId: 'a', quantity: 1 }], country: 'TR', city: 'Ankara', shippingMethodId: 'std', couponCode: 'IND' }, who);
    expect(q.totals.itemsSubtotalMinor).toBe(160_000);
    expect(q.totals.discountTotalMinor).toBe(15_000);
    expect(q.totals.shippingTotalMinor).toBe(15_000);
    expect(q.totals.grandTotalMinor).toBe(160_000);
    expect(q.freeShippingRemainingMinor).toBe(5_000);
  });

  it('sepet (adressiz) aynı yöntemden ücret + eşik + kalan döner', async () => {
    state.cart = cartOf([{ id: 'a', unit: 149_999, qty: 1 }]);
    const q = await buildQuote({ lines: [{ variantId: 'a', quantity: 1 }], country: 'TR' }, who);
    expect(q.shippingEstimate).toMatchObject({ methodId: 'std', priceMinor: 15_000, varies: false });
    expect(q.freeShippingThresholdMinor).toBe(150_000);
    expect(q.shippingFeeMinor).toBe(15_000);
    expect(q.freeShippingRemainingMinor).toBe(1);
  });

  it('tam eşik ücretsiz; kampanya eşik altına düşürürse ücret yansır', async () => {
    state.cart = cartOf([{ id: 'a', unit: 50_000, qty: 3 }]);
    let q = await buildQuote({ lines: [{ variantId: 'a', quantity: 3 }], country: 'TR' }, who);
    expect(q.shippingEstimate?.priceMinor).toBe(0);

    state.rules = [{
      id: 'r', name: '%10', type: 'sepet-yuzde', isActive: true, priority: 0, stackable: true,
      includeCategoryIds: [], includeProductIds: [], percentBps: 1000, minCartTotalMinor: null,
      buyQuantity: null, payQuantity: null, minQuantity: null, startsAt: null, endsAt: null,
    }];
    q = await buildQuote({ lines: [{ variantId: 'a', quantity: 3 }], country: 'TR' }, who);
    expect(q.appliedDiscounts[0].discountMinor).toBe(15_000);
    expect(q.shippingEstimate?.priceMinor).toBe(15_000);
    expect(q.freeShippingRemainingMinor).toBe(15_000);
  });
});

describe('kampanya + kupon birlikte', () => {
  it('kupon, kampanyadan sonra satırda kalanla sınırlanır; tutar negatife düşmez', async () => {
    // 2 al 1 öde → 10.000 bedava; 15.000'lik kupon kalan 10.000'i aşamaz.
    state.cart = cartOf([{ id: 'a', unit: 10_000, qty: 2 }]);
    state.rules = [{
      id: 'x', name: '2 al 1 öde', type: 'x-al-y-ode', isActive: true, priority: 0, stackable: true,
      includeCategoryIds: [], includeProductIds: [], percentBps: 0, minCartTotalMinor: null,
      buyQuantity: 2, payQuantity: 1, minQuantity: null, startsAt: null, endsAt: null,
    }];
    state.coupon = fixedCoupon(15_000, [20_000]);
    const q = await buildQuote({ lines: [{ variantId: 'a', quantity: 2 }], country: 'TR', city: 'Ankara', shippingMethodId: 'std', couponCode: 'IND' }, who);
    expect(q.totals.discountTotalMinor).toBe(20_000);
    expect(q.totals.couponDiscountMinor).toBe(10_000);
    expect(q.coupon).toMatchObject({ ok: true, discountMinor: 10_000 });
    // Ürün tutarı 0'a indi: kargo yine yansır (eşik 0'a ulaşmaz), toplam = kargo.
    expect(q.totals.shippingTotalMinor).toBe(15_000);
    expect(q.totals.grandTotalMinor).toBe(15_000);
    expect(q.totals.lines.every((l) => l.netLineMinor >= 0)).toBe(true);
  });
});

describe('ücretsiz kargo kuponu ve kapıda ödeme', () => {
  const freeShip: CouponOutcome = { ok: true, code: 'KARGO', type: 'ücretsiz-kargo', discountMinor: 0, perLineMinor: [0], freeShipping: true };

  it('normal kargoyu sıfırlar', async () => {
    state.cart = cartOf([{ id: 'a', unit: 10_000, qty: 1 }]);
    state.coupon = freeShip;
    const q = await buildQuote({ lines: [{ variantId: 'a', quantity: 1 }], country: 'TR', city: 'Ankara', shippingMethodId: 'std', couponCode: 'KARGO' }, who);
    expect(q.totals.shippingTotalMinor).toBe(0);
    expect(q.totals.freeShipping).toBe(true);
    expect(q.freeShippingRemainingMinor).toBeNull();
  });

  it('vitrinde kapıda ödeme ve kapıda kargo sunulmaz', async () => {
    state.cart = cartOf([{ id: 'a', unit: 10_000, qty: 1 }]);
    const q = await buildQuote({ lines: [{ variantId: 'a', quantity: 1 }], country: 'TR', city: 'Ankara', shippingMethodId: 'cod', paymentMethod: 'kapida' }, who);
    expect(q.paymentOptions.some((p) => p.id === 'kapida')).toBe(false);
    expect(q.shippingOptions.some((s) => s.type === 'kapıda')).toBe(false);
    expect(q.selectedShipping).toBeNull();
    expect(q.selectedPayment).toBeNull();
    expect(q.paymentOptions.find((p) => p.id === 'kart')?.installments).toBeUndefined();
  });

  it('panelde kapıda kargoya uygulanmaz, uyarı verilir; hizmet bedeli bir kez eklenir', async () => {
    state.cart = cartOf([{ id: 'a', unit: 10_000, qty: 1 }]);
    state.coupon = freeShip;
    const q = await buildQuote({ lines: [{ variantId: 'a', quantity: 1 }], country: 'TR', city: 'Ankara', shippingMethodId: 'cod', paymentMethod: 'kapida', couponCode: 'KARGO' }, { ...who, panel: true });
    expect(q.selectedPayment).toBe('kapida');
    expect(q.totals.shippingTotalMinor).toBe(15_000);
    expect(q.totals.freeShipping).toBe(false);
    expect(q.totals.surchargeMinor).toBe(2_000);
    expect(q.totals.grandTotalMinor).toBe(10_000 + 15_000 + 2_000);
    expect(q.problems.some((p) => p.includes('kapıda'))).toBe(true);
    // Kapıda seçiliyken eşik vaadi yok.
    expect(q.freeShippingThresholdMinor).toBeNull();
  });

  it('kapıda ödeme, normal kargo seçiliyken kullanılamaz (bedel eklenmez)', async () => {
    state.cart = cartOf([{ id: 'a', unit: 10_000, qty: 1 }]);
    const q = await buildQuote({ lines: [{ variantId: 'a', quantity: 1 }], country: 'TR', city: 'Ankara', shippingMethodId: 'std', paymentMethod: 'kapida' }, { ...who, panel: true });
    expect(q.selectedPayment).toBeNull();
    expect(q.totals.surchargeMinor).toBe(0);
  });
});

describe('yöntem / bölge durumları', () => {
  it('eşiksiz yöntem: eşik null, kalan null', async () => {
    state.zonesByStore.mixle = [zone([{ ...std, freeOverMinor: null }])];
    state.cart = cartOf([{ id: 'a', unit: 999_999, qty: 1 }]);
    const q = await buildQuote({ lines: [{ variantId: 'a', quantity: 1 }], country: 'TR' }, who);
    expect(q.freeShippingThresholdMinor).toBeNull();
    expect(q.freeShippingRemainingMinor).toBeNull();
    expect(q.shippingEstimate?.priceMinor).toBe(15_000);
  });

  it('uygun yöntem yoksa (yalnız pasif/kapıda) sepet tahmini null', async () => {
    state.zonesByStore.mixle = [zone([{ ...std, isActive: false }, cod])];
    state.cart = cartOf([{ id: 'a', unit: 10_000, qty: 1 }]);
    const q = await buildQuote({ lines: [{ variantId: 'a', quantity: 1 }], country: 'TR' }, who);
    expect(q.shippingEstimate).toBeNull();
    expect(q.shippingFeeMinor).toBeNull();
  });

  it('bölgesel: il bölgesi öncelikli, seçili yöntem geçersizse seçilmez', async () => {
    state.zonesByStore.mixle = [
      zone([{ ...std, id: 'ist', zoneId: 'ist', priceMinor: 5_000, freeOverMinor: null }], { id: 'ist', name: 'İstanbul', cities: ['İstanbul'], sortOrder: 0 }),
      zone([std], { sortOrder: 1 }),
    ];
    state.cart = cartOf([{ id: 'a', unit: 10_000, qty: 1 }]);
    const q = await buildQuote({ lines: [{ variantId: 'a', quantity: 1 }], country: 'TR', city: 'istanbul', shippingMethodId: 'std' }, who);
    expect(q.shippingOptions.map((s) => s.methodId)).toEqual(['ist']);
    expect(q.selectedShipping).toBeNull();
    const adressiz = await buildQuote({ lines: [{ variantId: 'a', quantity: 1 }], country: 'TR' }, who);
    expect(adressiz.shippingEstimate).toMatchObject({ methodId: 'std', varies: true });
  });
});

describe('mağaza izolasyonu', () => {
  it('her mağaza yalnız kendi kargo ayarını kullanır', async () => {
    state.zonesByStore = {
      mixle: [zone([std])],
      nuclear: [zone([{ ...std, id: 'n-std', priceMinor: 7_500, freeOverMinor: 100_000 }])],
    };
    state.cart = cartOf([{ id: 'a', unit: 120_000, qty: 1 }]);
    const input = { lines: [{ variantId: 'a', quantity: 1 }], country: 'TR' };
    const mixle = await runWithStore('mixle', () => buildQuote(input, who));
    const nuclear = await runWithStore('nuclear', () => buildQuote(input, who));
    expect(mixle.shippingEstimate).toMatchObject({ methodId: 'std', priceMinor: 15_000 });
    expect(nuclear.shippingEstimate).toMatchObject({ methodId: 'n-std', priceMinor: 0 });
    expect(mixle.freeShippingThresholdMinor).toBe(150_000);
    expect(nuclear.freeShippingThresholdMinor).toBe(100_000);
  });
});

describe('KDV ve kuruş', () => {
  it('KDV dahil fiyatta vergi toplama eklenmez; döküm toplamı tutar', async () => {
    state.cart = cartOf([{ id: 'a', unit: 3_333, qty: 3 }, { id: 'b', unit: 1_001, qty: 1 }]);
    state.coupon = fixedCoupon(1_000, [9_999, 1_001]);
    const q = await buildQuote({ lines: [{ variantId: 'a', quantity: 3 }, { variantId: 'b', quantity: 1 }], country: 'TR', city: 'Ankara', shippingMethodId: 'std', couponCode: 'IND' }, who);
    const t = q.totals;
    expect(t.discountTotalMinor).toBe(1_000);
    expect(t.grandTotalMinor).toBe(t.itemsSubtotalMinor - t.discountTotalMinor + t.shippingTotalMinor + t.surchargeMinor);
    expect(t.taxTotalMinor).toBe(t.taxBreakdown.reduce((s, r) => s + r.taxMinor, 0));
    expect(t.lines.reduce((s, l) => s + l.netLineMinor, 0)).toBe(t.itemsSubtotalMinor - t.discountTotalMinor);
    for (const v of [t.grandTotalMinor, t.taxTotalMinor, ...t.lines.map((l) => l.taxMinor)]) expect(Number.isInteger(v)).toBe(true);
  });
});

describe('ağırlık (desi) tarifesi', () => {
  const desi = { ...std, id: 'desi', type: 'desi' as const, freeOverMinor: null, tiers: [{ upTo: 1, priceMinor: 4_000 }, { upTo: null, priceMinor: 9_000 }] };
  it('ağırlıklar biliniyorsa toplam kg ile kademe seçilir', async () => {
    state.zonesByStore.mixle = [zone([desi])];
    state.cart = cartOf([{ id: 'a', unit: 1_000, qty: 2, weight: 400 }, { id: 'b', unit: 1_000, qty: 1, weight: 300 }]);
    const q = await buildQuote({ lines: [{ variantId: 'a', quantity: 2 }, { variantId: 'b', quantity: 1 }], country: 'TR', city: 'Ankara', shippingMethodId: 'desi' }, who);
    expect(q.totals.shippingTotalMinor).toBe(9_000); // 1,1 kg
  });
  it('ağırlığı eksik ürün varsa desi yöntemi sunulmaz', async () => {
    state.zonesByStore.mixle = [zone([desi, { ...std, sortOrder: 1 }])];
    state.cart = cartOf([{ id: 'a', unit: 1_000, qty: 1, weight: 400 }, { id: 'b', unit: 1_000, qty: 1, weight: null }]);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const q = await buildQuote({ lines: [{ variantId: 'a', quantity: 1 }, { variantId: 'b', quantity: 1 }], country: 'TR', city: 'Ankara', shippingMethodId: 'desi' }, who);
    expect(q.shippingOptions.map((s) => s.methodId)).toEqual(['std']);
    expect(q.selectedShipping).toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('siparişte son doğrulama', () => {
  it('gösterilen toplam sunucununkinden farklıysa sipariş yazılmaz', () => {
    expect(() => assertExpectedTotal(160_000, 160_000)).not.toThrow();
    expect(() => assertExpectedTotal(undefined, 160_000)).not.toThrow();
    let err: unknown;
    try {
      assertExpectedTotal(145_000, 160_000);
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(CheckoutError);
    expect((err as InstanceType<typeof CheckoutError>).status).toBe(409);
    expect((err as InstanceType<typeof CheckoutError>).issues.total).toBeTruthy();
  });
});
