import { describe, expect, it } from 'vitest';
import { allocateMinor, parseMajorInput, taxFromGross, taxFromNet, toMinor } from '@/lib/money';
import { taxBreakdown, taxLine } from './tax';
import { evaluateCoupon, normalizeCouponCode, type CouponRule } from './coupons';
import { matchZone, quoteShipping, type ShippingZoneRule } from './shipping-rates';

describe('para yardımcıları', () => {
  it('TL → kuruş dönüşümü ikilik hatalarını kapatır', () => {
    expect(toMinor(12.99)).toBe(1299);
    expect(toMinor(129.9)).toBe(12990);
    expect(toMinor(0.1 + 0.2)).toBe(30);
    expect(toMinor(1.005)).toBe(101);
  });

  it('kullanıcı girdisini her iki ayraçla çözer', () => {
    expect(parseMajorInput('129,90')).toBe(12990);
    expect(parseMajorInput('129.90')).toBe(12990);
    expect(parseMajorInput('1.299,90')).toBe(129990);
    expect(parseMajorInput('1,299.90')).toBe(129990);
    expect(parseMajorInput('129,90 ₺')).toBe(12990);
    expect(parseMajorInput('abc')).toBeNull();
    expect(parseMajorInput('-5')).toBeNull();
  });

  it('paylaştırma kuruş kaybetmez', () => {
    const parts = allocateMinor(1000, [1, 1, 1]);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(1000);
    expect(parts).toEqual([334, 333, 333]);
    expect(allocateMinor(0, [5, 5])).toEqual([0, 0]);
    expect(allocateMinor(100, [0, 0])).toEqual([0, 0]);
  });
});

describe('KDV', () => {
  it('dahil fiyattan KDV ayırır', () => {
    // 120,00 ₺ KDV dahil, %20 → 100,00 net + 20,00 KDV
    expect(taxFromGross(12000, 2000)).toBe(2000);
    const line = taxLine({ amountMinor: 12000, rateBps: 2000 }, true);
    expect(line).toEqual({ grossMinor: 12000, taxMinor: 2000, netMinor: 10000, rateBps: 2000 });
  });

  it('hariç fiyata KDV ekler', () => {
    expect(taxFromNet(10000, 2000)).toBe(2000);
    const line = taxLine({ amountMinor: 10000, rateBps: 100 }, false);
    expect(line.grossMinor).toBe(10100);
    expect(line.taxMinor).toBe(100);
  });

  it('sıfır oranda vergi yoktur', () => {
    expect(taxLine({ amountMinor: 5000, rateBps: 0 }, true).taxMinor).toBe(0);
  });

  it('matrah dökümü oranlara göre gruplar', () => {
    const rows = taxBreakdown([
      taxLine({ amountMinor: 12000, rateBps: 2000 }, true),
      taxLine({ amountMinor: 6000, rateBps: 2000 }, true),
      taxLine({ amountMinor: 1010, rateBps: 100 }, true),
    ]);
    expect(rows).toEqual([
      { rateBps: 2000, netMinor: 15000, taxMinor: 3000 },
      { rateBps: 100, netMinor: 1000, taxMinor: 10 },
    ]);
  });
});

const baseRule: CouponRule = {
  code: 'NEFIS10',
  type: 'yüzde',
  value: 1000,
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
  stackable: false,
};

const lines = [
  { productId: 'a', categoryIds: ['meyveli'], lineTotalMinor: 20000 },
  { productId: 'b', categoryIds: ['tutun'], lineTotalMinor: 10000 },
];
const ctx = { lines, customerUsageCount: 0, hasPreviousOrders: false };

describe('kupon kuralları', () => {
  it('yüzde indirimi satırlara dağıtır', () => {
    const r = evaluateCoupon(baseRule, ctx);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.discountMinor).toBe(3000);
    expect(r.perLineMinor).toEqual([2000, 1000]);
  });

  it('tutar indirimi sepet toplamını aşamaz', () => {
    const r = evaluateCoupon({ ...baseRule, type: 'tutar', value: 99999 }, ctx);
    expect(r.ok && r.discountMinor).toBe(30000);
  });

  it('maksimum indirim tavanı uygulanır', () => {
    const r = evaluateCoupon({ ...baseRule, maxDiscountMinor: 500 }, ctx);
    expect(r.ok && r.discountMinor).toBe(500);
  });

  it('minimum sepet tutarı kontrol edilir', () => {
    const r = evaluateCoupon({ ...baseRule, minCartTotalMinor: 50000 }, ctx);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.reason).toMatch(/en az/);
  });

  it('tarih aralığı dışında reddedilir', () => {
    const past = new Date('2020-01-01');
    expect(evaluateCoupon({ ...baseRule, endsAt: past }, ctx).ok).toBe(false);
    const future = new Date('2099-01-01');
    expect(evaluateCoupon({ ...baseRule, startsAt: future }, ctx).ok).toBe(false);
  });

  it('kullanım limitleri', () => {
    expect(evaluateCoupon({ ...baseRule, usageLimit: 5, usedCount: 5 }, ctx).ok).toBe(false);
    expect(
      evaluateCoupon({ ...baseRule, usageLimitPerCustomer: 1 }, { ...ctx, customerUsageCount: 1 }).ok,
    ).toBe(false);
  });

  it('ilk sipariş kuralı', () => {
    expect(
      evaluateCoupon({ ...baseRule, firstOrderOnly: true }, { ...ctx, hasPreviousOrders: true }).ok,
    ).toBe(false);
    expect(evaluateCoupon({ ...baseRule, firstOrderOnly: true }, ctx).ok).toBe(true);
  });

  it('kategori kısıtı yalnız uygun satırlara uygular', () => {
    const r = evaluateCoupon({ ...baseRule, includeCategoryIds: ['tutun'] }, ctx);
    expect(r.ok && r.perLineMinor).toEqual([0, 1000]);
  });

  it('hariç tutulan ürün indirim almaz', () => {
    const r = evaluateCoupon({ ...baseRule, excludeProductIds: ['a'] }, ctx);
    expect(r.ok && r.perLineMinor).toEqual([0, 1000]);
  });

  it('uygun ürün yoksa reddedilir', () => {
    const r = evaluateCoupon({ ...baseRule, includeProductIds: ['yok'] }, ctx);
    expect(r.ok).toBe(false);
  });

  it('ücretsiz kargo kuponu indirim vermez, bayrak koyar', () => {
    const r = evaluateCoupon({ ...baseRule, type: 'ücretsiz-kargo', value: 0 }, ctx);
    expect(r.ok && r.freeShipping).toBe(true);
    expect(r.ok && r.discountMinor).toBe(0);
  });

  it('pasif kupon reddedilir', () => {
    expect(evaluateCoupon({ ...baseRule, isActive: false }, ctx).ok).toBe(false);
  });

  it('kod normalizasyonu Türkçe harfleri ASCII\'ye katlar', () => {
    expect(normalizeCouponCode(' nefis 10 ')).toBe('NEFIS10');
    expect(normalizeCouponCode('ilkaroma')).toBe('ILKAROMA');
    expect(normalizeCouponCode('İLKAROMA')).toBe('ILKAROMA');
    expect(normalizeCouponCode('ışık-ğüş')).toBe('ISIK-GUS');
  });
});

const zones: ShippingZoneRule[] = [
  {
    id: 'ist',
    name: 'İstanbul',
    countries: ['TR'],
    cities: ['İstanbul'],
    sortOrder: 0,
    methods: [
      {
        id: 'ist-std',
        zoneId: 'ist',
        name: 'Standart',
        type: 'sabit',
        priceMinor: 4990,
        freeOverMinor: 75000,
        tiers: null,
        estimatedDays: '1-2',
        carrier: 'yurtici',
        isActive: true,
        sortOrder: 0,
      },
      {
        id: 'ist-kapida',
        zoneId: 'ist',
        name: 'Kapıda ödeme',
        type: 'kapıda',
        priceMinor: 6990,
        freeOverMinor: null,
        tiers: null,
        estimatedDays: '1-2',
        carrier: null,
        isActive: true,
        sortOrder: 1,
      },
      {
        id: 'ist-pasif',
        zoneId: 'ist',
        name: 'Pasif',
        type: 'sabit',
        priceMinor: 1,
        freeOverMinor: null,
        tiers: null,
        estimatedDays: '',
        carrier: null,
        isActive: false,
        sortOrder: 2,
      },
    ],
  },
  {
    id: 'tr',
    name: 'Türkiye',
    countries: ['TR'],
    cities: [],
    sortOrder: 1,
    methods: [
      {
        id: 'tr-desi',
        zoneId: 'tr',
        name: 'Desi bazlı',
        type: 'desi',
        priceMinor: 9990,
        freeOverMinor: null,
        tiers: [
          { upTo: 1, priceMinor: 5990 },
          { upTo: 5, priceMinor: 7990 },
          { upTo: null, priceMinor: 12990 },
        ],
        estimatedDays: '2-4',
        carrier: 'aras',
        isActive: true,
        sortOrder: 0,
      },
      {
        id: 'tr-tutar',
        zoneId: 'tr',
        name: 'Tutara göre',
        type: 'tutara-göre',
        priceMinor: 0,
        freeOverMinor: null,
        tiers: [
          { upTo: 25000, priceMinor: 7990 },
          { upTo: 50000, priceMinor: 4990 },
          { upTo: null, priceMinor: 0 },
        ],
        estimatedDays: '2-4',
        carrier: 'mng',
        isActive: true,
        sortOrder: 1,
      },
    ],
  },
];

describe('kargo tarife motoru', () => {
  it('il eşleşmesi özel bölgeyi önceler', () => {
    expect(matchZone(zones, 'TR', 'istanbul')?.id).toBe('ist');
    expect(matchZone(zones, 'TR', 'Ankara')?.id).toBe('tr');
    expect(matchZone(zones, 'DE', 'Berlin')).toBeUndefined();
  });

  it('sabit ücret + ücretsiz eşiği', () => {
    const base = { country: 'TR', city: 'İstanbul', desi: 1, freeShippingCoupon: false };
    const under = quoteShipping(zones, { ...base, cartTotalMinor: 30000 });
    expect(under.find((q) => q.methodId === 'ist-std')?.priceMinor).toBe(4990);
    const over = quoteShipping(zones, { ...base, cartTotalMinor: 80000 });
    const q = over.find((x) => x.methodId === 'ist-std');
    expect(q?.priceMinor).toBe(0);
    expect(q?.freeReason).toBe('eşik');
  });

  it('pasif yöntem listelenmez', () => {
    const qs = quoteShipping(zones, {
      country: 'TR', city: 'İstanbul', cartTotalMinor: 100, desi: 1, freeShippingCoupon: false,
    });
    expect(qs.map((q) => q.methodId)).toEqual(['ist-std', 'ist-kapida']);
  });

  it('desi kademeleri', () => {
    const base = { country: 'TR', city: 'İzmir', cartTotalMinor: 100, freeShippingCoupon: false };
    const pick = (desi: number) =>
      quoteShipping(zones, { ...base, desi }).find((q) => q.methodId === 'tr-desi')?.priceMinor;
    expect(pick(0.5)).toBe(5990);
    expect(pick(1)).toBe(5990);
    expect(pick(3)).toBe(7990);
    expect(pick(20)).toBe(12990);
  });

  it('sepet tutarı kademeleri', () => {
    const base = { country: 'TR', city: 'İzmir', desi: 1, freeShippingCoupon: false };
    const pick = (cartTotalMinor: number) =>
      quoteShipping(zones, { ...base, cartTotalMinor }).find((q) => q.methodId === 'tr-tutar');
    expect(pick(10000)?.priceMinor).toBe(7990);
    expect(pick(40000)?.priceMinor).toBe(4990);
    expect(pick(90000)?.priceMinor).toBe(0);
  });

  it('ücretsiz kargo kuponu kapıda ödemeye uygulanmaz', () => {
    const qs = quoteShipping(zones, {
      country: 'TR', city: 'İstanbul', cartTotalMinor: 100, desi: 1, freeShippingCoupon: true,
    });
    expect(qs.find((q) => q.methodId === 'ist-std')).toMatchObject({ priceMinor: 0, freeReason: 'kupon' });
    expect(qs.find((q) => q.methodId === 'ist-kapida')?.priceMinor).toBe(6990);
  });
});
