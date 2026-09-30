import { describe, expect, it } from 'vitest';
import { adjustPrice, withDescendants } from './pricing';
import { isInNewWindow, newWindowState } from '@/lib/new-badge';

describe('adjustPrice', () => {
  it('indirim orijinal fiyattan hesaplanır ve eski fiyatı saklar', () => {
    expect(adjustPrice({ priceMinor: 24990, compareAtPriceMinor: null }, 'indirim', 10, false)).toEqual({
      priceMinor: 22491,
      compareAtPriceMinor: 24990,
    });
  });

  it('zaten indirimli ürüne indirim üst üste binmez', () => {
    expect(adjustPrice({ priceMinor: 20000, compareAtPriceMinor: 30000 }, 'indirim', 10)).toEqual({
      priceMinor: 27000,
      compareAtPriceMinor: 30000,
    });
  });

  it('tam liraya yuvarlar', () => {
    expect(adjustPrice({ priceMinor: 24990, compareAtPriceMinor: null }, 'indirim', 10, true).priceMinor).toBe(22500);
  });

  it('zam satış ve eski fiyatı birlikte artırır', () => {
    expect(adjustPrice({ priceMinor: 10000, compareAtPriceMinor: 12000 }, 'zam', 10)).toEqual({
      priceMinor: 11000,
      compareAtPriceMinor: 13200,
    });
    expect(adjustPrice({ priceMinor: 10000, compareAtPriceMinor: null }, 'zam', 15)).toEqual({
      priceMinor: 11500,
      compareAtPriceMinor: null,
    });
  });

  it('indirimi kaldırır', () => {
    expect(adjustPrice({ priceMinor: 9000, compareAtPriceMinor: 10000 }, 'indirim-kaldir', 0)).toEqual({
      priceMinor: 10000,
      compareAtPriceMinor: null,
    });
  });
});

describe('withDescendants', () => {
  it('alt kategorileri de kapsar', () => {
    const cats = [
      { id: 'a', parentId: null },
      { id: 'b', parentId: 'a' },
      { id: 'c', parentId: 'b' },
      { id: 'd', parentId: null },
    ];
    expect(withDescendants(cats, ['a']).sort()).toEqual(['a', 'b', 'c']);
  });
});

describe('yeni damgası tarih aralığı', () => {
  const w = { newFrom: '2026-10-01', newUntil: '2026-10-07' };
  it('TR günü sınırlarını kapsar', () => {
    expect(isInNewWindow(w, new Date('2026-09-30T20:59:59Z'))).toBe(false); // TR 23:59
    expect(isInNewWindow(w, new Date('2026-09-30T21:00:00Z'))).toBe(true); // TR 1 Ekim 00:00
    expect(isInNewWindow(w, new Date('2026-10-07T20:59:00Z'))).toBe(true); // TR 7 Ekim 23:59
    expect(isInNewWindow(w, new Date('2026-10-07T21:00:01Z'))).toBe(false);
  });
  it('durum etiketi', () => {
    expect(newWindowState({ newFrom: null, newUntil: null })).toBe('yok');
    expect(newWindowState(w, new Date('2026-10-03T10:00:00Z'))).toBe('aktif');
    expect(newWindowState(w, new Date('2026-11-01T10:00:00Z'))).toBe('bitti');
  });
});
