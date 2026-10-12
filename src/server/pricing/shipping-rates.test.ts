import { describe, expect, it } from 'vitest';
import {
  estimateShipping,
  matchZone,
  methodThreshold,
  quoteMethod,
  quoteShipping,
  type ShippingContext,
  type ShippingMethodRule,
  type ShippingZoneRule,
} from './shipping-rates';

const method = (over: Partial<ShippingMethodRule>): ShippingMethodRule => ({
  id: 'm', zoneId: 'z', name: 'Standart', type: 'sabit', priceMinor: 15_000, freeOverMinor: 150_000,
  tiers: null, estimatedDays: '', carrier: null, isActive: true, sortOrder: 0, ...over,
});
const ctx = (over: Partial<ShippingContext> = {}): ShippingContext => ({
  country: 'TR', city: 'Ankara', cartTotalMinor: 0, desi: null, freeShippingCoupon: false, ...over,
});

describe('eşik sınırları (kuruş)', () => {
  const std = method({});
  it('eşiğin bir kuruş altı → ücret', () => {
    expect(quoteMethod(std, ctx({ cartTotalMinor: 149_999 })).priceMinor).toBe(15_000);
  });
  it('tam eşik → ücretsiz', () => {
    expect(quoteMethod(std, ctx({ cartTotalMinor: 150_000 }))).toMatchObject({ priceMinor: 0, freeReason: 'eşik' });
  });
  it('bir kuruş üstü → ücretsiz', () => {
    expect(quoteMethod(std, ctx({ cartTotalMinor: 150_001 })).priceMinor).toBe(0);
  });
  it('eşiksiz yöntem hiçbir tutarda ücretsizleşmez', () => {
    expect(quoteMethod(method({ freeOverMinor: null }), ctx({ cartTotalMinor: 10_000_000 })).priceMinor).toBe(15_000);
  });
  it('0 eşik "eşik yok" demektir (her sepeti ücretsiz yapmaz)', () => {
    expect(methodThreshold(method({ freeOverMinor: 0 }))).toBeNull();
    expect(quoteMethod(method({ freeOverMinor: 0 }), ctx({ cartTotalMinor: 100 })).priceMinor).toBe(15_000);
  });
  it('ücretsiz yöntem her zaman 0', () => {
    expect(quoteMethod(method({ type: 'ücretsiz' }), ctx({ cartTotalMinor: 1 }))).toMatchObject({ priceMinor: 0, freeReason: 'yöntem' });
  });
});

describe('kapıda ödeme kargosu', () => {
  const cod = method({ id: 'cod', type: 'kapıda', priceMinor: 6_990, freeOverMinor: 50_000 });
  it('eşik uygulanmaz (panelde eşik kalmış olsa bile)', () => {
    expect(methodThreshold(cod)).toBeNull();
    expect(quoteMethod(cod, ctx({ cartTotalMinor: 999_999 })).priceMinor).toBe(6_990);
  });
  it('ücretsiz kargo kuponu uygulanmaz; normal kargoyu sıfırlar', () => {
    expect(quoteMethod(cod, ctx({ freeShippingCoupon: true })).priceMinor).toBe(6_990);
    expect(quoteMethod(method({}), ctx({ freeShippingCoupon: true }))).toMatchObject({ priceMinor: 0, freeReason: 'kupon' });
  });
});

describe('kademeler', () => {
  const tiers = [
    { upTo: 1, priceMinor: 5_990 },
    { upTo: 5, priceMinor: 7_990 },
    { upTo: null, priceMinor: 12_990 },
  ];
  it('desi/ağırlık: üst sınır dahil', () => {
    const desi = method({ type: 'desi', tiers, freeOverMinor: null });
    expect(quoteMethod(desi, ctx({ desi: 1 })).priceMinor).toBe(5_990);
    expect(quoteMethod(desi, ctx({ desi: 1.001 })).priceMinor).toBe(7_990);
    expect(quoteMethod(desi, ctx({ desi: 5 })).priceMinor).toBe(7_990);
    expect(quoteMethod(desi, ctx({ desi: 40 })).priceMinor).toBe(12_990);
  });
  it('ağırlık bilinmiyorsa desi yöntemi sunulmaz (ilk kademe uydurulmaz)', () => {
    const zones: ShippingZoneRule[] = [
      { id: 'z', name: 'TR', countries: ['TR'], cities: [], sortOrder: 0, methods: [method({ id: 'd', type: 'desi', tiers }), method({ id: 's', sortOrder: 1 })] },
    ];
    expect(quoteShipping(zones, ctx({ desi: null })).map((q) => q.methodId)).toEqual(['s']);
    expect(quoteShipping(zones, ctx({ desi: 2 })).map((q) => q.methodId)).toEqual(['d', 's']);
  });
  it('tutara göre: indirim sonrası sepet tutarı, üst sınır dahil', () => {
    const t = method({ type: 'tutara-göre', freeOverMinor: null, tiers: [{ upTo: 25_000, priceMinor: 7_990 }, { upTo: null, priceMinor: 0 }] });
    expect(quoteMethod(t, ctx({ cartTotalMinor: 25_000 })).priceMinor).toBe(7_990);
    expect(quoteMethod(t, ctx({ cartTotalMinor: 25_001 })).priceMinor).toBe(0);
  });
});

describe('bölge eşleşmesi', () => {
  const zones: ShippingZoneRule[] = [
    { id: 'genel', name: 'Türkiye', countries: ['TR'], cities: [], sortOrder: 1, methods: [method({ id: 'g', zoneId: 'genel' })] },
    { id: 'izmir', name: 'İzmir', countries: ['TR'], cities: ['İzmir', 'Iğdır'], sortOrder: 0, methods: [method({ id: 'i', zoneId: 'izmir', priceMinor: 9_000, freeOverMinor: null })] },
  ];
  it('Türkçe büyük/küçük harf eşleşir; öncelik sortOrder', () => {
    expect(matchZone(zones, 'TR', 'izmir')?.id).toBe('izmir');
    expect(matchZone(zones, 'tr', 'IĞDIR')?.id).toBe('izmir');
    expect(matchZone(zones, 'TR', ' İZMİR ')?.id).toBe('izmir');
    expect(matchZone(zones, 'TR', 'Ankara')?.id).toBe('genel');
  });
  it('pasif yöntem ne listelenir ne tahmin edilir', () => {
    const z: ShippingZoneRule[] = [
      { id: 'z', name: 'TR', countries: ['TR'], cities: [], sortOrder: 0, methods: [method({ id: 'p', isActive: false, priceMinor: 1 }), method({ id: 'a', sortOrder: 1 })] },
    ];
    expect(quoteShipping(z, ctx()).map((q) => q.methodId)).toEqual(['a']);
    expect(estimateShipping(z, { country: 'TR', cartTotalMinor: 0, desi: null, freeShippingCoupon: false })?.method.id).toBe('a');
  });
});

describe('sepet tahmini: ücret ve eşik aynı yöntemden', () => {
  // Eski davranış: eşik = ülkedeki EN DÜŞÜK eşik (ekspres, 500 ₺), ücret = ilk
  // ücretli yöntem (standart, eşiksiz) → "500 ₺ üzeri ücretsiz" yanlış vaadi.
  const zones: ShippingZoneRule[] = [
    {
      id: 'tr', name: 'Türkiye', countries: ['TR'], cities: [], sortOrder: 0,
      methods: [
        method({ id: 'std', priceMinor: 5_000, freeOverMinor: null, sortOrder: 0 }),
        method({ id: 'exp', priceMinor: 12_000, freeOverMinor: 50_000, sortOrder: 1 }),
        method({ id: 'cod', type: 'kapıda', priceMinor: 6_000, freeOverMinor: null, sortOrder: 2 }),
      ],
    },
  ];
  const opts = { country: 'TR', cartTotalMinor: 60_000, desi: null, freeShippingCoupon: false };
  it('tahmin standart yöntem: eşik yok, ücret yansır', () => {
    const e = estimateShipping(zones, opts)!;
    expect(e.method.id).toBe('std');
    expect(e.thresholdMinor).toBeNull();
    expect(e.quote.priceMinor).toBe(5_000);
  });
  it('seçili yöntem varsa onun ücret ve eşiği', () => {
    const e = estimateShipping(zones, { ...opts, city: 'Ankara', methodId: 'exp' })!;
    expect(e.thresholdMinor).toBe(50_000);
    expect(e.quote.priceMinor).toBe(0);
  });
  it('kapıda seçiliyse eşik yok', () => {
    expect(estimateShipping(zones, { ...opts, city: 'Ankara', methodId: 'cod' })?.thresholdMinor).toBeNull();
  });
  it('il özel bölgede farklı tarife varsa varies=true', () => {
    const regional: ShippingZoneRule[] = [
      ...zones,
      { id: 'ist', name: 'İstanbul', countries: ['TR'], cities: ['İstanbul'], sortOrder: -1, methods: [method({ id: 'ist', zoneId: 'ist', priceMinor: 3_000, freeOverMinor: null })] },
    ];
    expect(estimateShipping(zones, opts)?.varies).toBe(false);
    expect(estimateShipping(regional, opts)?.varies).toBe(true);
    expect(estimateShipping(regional, { ...opts, city: 'İstanbul' })?.method.id).toBe('ist');
  });
});
