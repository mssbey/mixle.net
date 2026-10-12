import { describe, expect, it, vi } from 'vitest';
import type { ShippingMethodRule, ShippingZoneRule } from '@/server/pricing/shipping-rates';
import { freeShippingClaim, freeShippingShort } from '@/lib/shipping-text';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidateTag: vi.fn(), unstable_cache: <T>(fn: T) => fn }));
vi.mock('../storefront-sync', () => ({ notifyStorefronts: vi.fn() }));

const findMany = vi.fn(async (args: { where: { store: string } }) => {
  const all = [
    { id: 'm', store: 'mixle', name: 'TR', countries: ['TR'], cities: [], sortOrder: 0, methods: [row('m1', 'm', 15_000, 150_000)] },
    { id: 'n', store: 'nuclear', name: 'TR', countries: ['TR'], cities: [], sortOrder: 0, methods: [row('n1', 'n', 7_500, 100_000)] },
  ];
  return all.filter((z) => z.store === args.where.store);
});
vi.mock('../db', () => ({ db: { shippingZone: { findMany } } }));

function row(id: string, zoneId: string, priceMinor: number, freeOverMinor: number | null) {
  return { id, zoneId, name: 'Standart', type: 'sabit', priceMinor, freeOverMinor, tiers: null, estimatedDays: '1-3 iş günü', carrier: null, isActive: true, sortOrder: 0 };
}

const { buildShippingPolicy, getShippingPolicy } = await import('./policy');
const { readShippingZones } = await import('./zones');
const { runWithStore } = await import('../store-context');

const m = (over: Partial<ShippingMethodRule>): ShippingMethodRule => ({
  id: 'x', zoneId: 'z', name: 'Standart', type: 'sabit', priceMinor: 15_000, freeOverMinor: 150_000,
  tiers: null, estimatedDays: '', carrier: null, isActive: true, sortOrder: 0, ...over,
});
const z = (methods: ShippingMethodRule[], over: Partial<ShippingZoneRule> = {}): ShippingZoneRule => ({
  id: 'z', name: 'Türkiye', countries: ['TR'], cities: [], sortOrder: 0, methods, ...over,
});

describe('vitrin kargo özeti', () => {
  it('eşik ve ücret panel yönteminden', () => {
    const p = buildShippingPolicy([z([m({})])]);
    expect(p).toMatchObject({ thresholdMinor: 150_000, feeMinor: 15_000, varies: false });
    expect(freeShippingClaim(p)).toMatch(/^(₺1.500|1.500 ₺) üzeri siparişlerde kargo bizden$/);
  });
  it('eşik yoksa ücretsiz kargo vaadi yazılmaz', () => {
    const p = buildShippingPolicy([z([m({ freeOverMinor: null })])]);
    expect(freeShippingClaim(p)).toBeNull();
    expect(freeShippingShort(p)).toBeNull();
  });
  it('bölgesel fark varsa genelleme yapılmaz', () => {
    const p = buildShippingPolicy([
      z([m({ id: 'ist', priceMinor: 5_000, freeOverMinor: 75_000 })], { id: 'ist', cities: ['İstanbul'], sortOrder: 0 }),
      z([m({})], { sortOrder: 1 }),
    ]);
    expect(p.varies).toBe(true);
    expect(freeShippingClaim(p)).toContain('bölgeye göre değişebilir');
    expect(p.zones).toHaveLength(2);
  });
  it('kapıda yöntemin eşiği listelenmez; pasif yöntem listelenmez', () => {
    const p = buildShippingPolicy([z([m({}), m({ id: 'c', type: 'kapıda', freeOverMinor: 99 }), m({ id: 'p', isActive: false })])]);
    expect(p.zones[0].methods.map((x) => [x.type, x.thresholdMinor])).toEqual([['sabit', 150_000], ['kapıda', null]]);
  });
  it('bölge yoksa boş özet', () => {
    expect(buildShippingPolicy([])).toMatchObject({ thresholdMinor: null, feeMinor: null, zones: [] });
  });
});

describe('mağaza izolasyonu (veri katmanı)', () => {
  it('bölgeler mağaza filtresiyle okunur', async () => {
    const zones = await readShippingZones('nuclear');
    expect(findMany).toHaveBeenLastCalledWith(expect.objectContaining({ where: { store: 'nuclear' } }));
    expect(zones.map((x) => x.methods[0].id)).toEqual(['n1']);
  });
  it('vitrin özeti geçerli mağazanın ayarından', async () => {
    const mixle = await runWithStore('mixle', () => getShippingPolicy());
    const nuclear = await runWithStore('nuclear', () => getShippingPolicy());
    expect(mixle.thresholdMinor).toBe(150_000);
    expect(nuclear).toMatchObject({ thresholdMinor: 100_000, feeMinor: 7_500 });
  });
});
