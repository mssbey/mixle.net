import { describe, expect, it } from 'vitest';
import { adjustPrice, withDescendants } from './pricing';
import { isInNewWindow, newWindowState } from '@/lib/new-badge';

describe('adjustPrice', () => {
  const pct = (mode: 'dusur' | 'artir', value: number, roundUp = false) => ({ mode, valueType: 'yuzde' as const, value, roundUp });

  it('düşürme satış fiyatını doğrudan değiştirir, üstü çizili fiyat oluşturmaz', () => {
    expect(adjustPrice({ priceMinor: 10000, compareAtPriceMinor: null }, pct('dusur', 10))).toEqual({
      priceMinor: 9000,
      compareAtPriceMinor: null,
    });
  });

  it('tekrar uygulanınca yeni fiyattan hesaplanır (100 → 90 → 81)', () => {
    const once = adjustPrice({ priceMinor: 10000, compareAtPriceMinor: null }, pct('dusur', 10))!;
    expect(adjustPrice(once, pct('dusur', 10))).toEqual({ priceMinor: 8100, compareAtPriceMinor: null });
  });

  it('artırma', () => {
    expect(adjustPrice({ priceMinor: 10000, compareAtPriceMinor: null }, pct('artir', 15))).toEqual({
      priceMinor: 11500,
      compareAtPriceMinor: null,
    });
  });

  it('sabit tutar', () => {
    expect(adjustPrice({ priceMinor: 10000, compareAtPriceMinor: null }, { mode: 'dusur', valueType: 'tutar', value: 12.5 })).toEqual({
      priceMinor: 8750,
      compareAtPriceMinor: null,
    });
    expect(adjustPrice({ priceMinor: 10000, compareAtPriceMinor: null }, { mode: 'artir', valueType: 'tutar', value: 20 })!.priceMinor).toBe(12000);
  });

  it('küsüratı bir üst liraya yuvarlar; tam sayıyı yukarı kaydırmaz', () => {
    expect(adjustPrice({ priceMinor: 20396, compareAtPriceMinor: null }, pct('dusur', 10, true))!.priceMinor).toBe(18400);
    expect(adjustPrice({ priceMinor: 10000, compareAtPriceMinor: null }, pct('dusur', 10, true))!.priceMinor).toBe(9000);
  });

  it('önceden girilmiş üstü çizili fiyat aynı oranda değişir', () => {
    expect(adjustPrice({ priceMinor: 10000, compareAtPriceMinor: 12000 }, pct('artir', 10))).toEqual({
      priceMinor: 11000,
      compareAtPriceMinor: 13200,
    });
  });

  it('fiyatsız ya da 0 altına inecek varyant atlanır', () => {
    expect(adjustPrice({ priceMinor: 0, compareAtPriceMinor: null }, pct('artir', 10))).toBeNull();
    expect(adjustPrice({ priceMinor: 1000, compareAtPriceMinor: null }, { mode: 'dusur', valueType: 'tutar', value: 10 })).toBeNull();
  });

  it('indirimi kaldırır', () => {
    expect(adjustPrice({ priceMinor: 9000, compareAtPriceMinor: 10000 }, { mode: 'indirim-kaldir' })).toEqual({
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
