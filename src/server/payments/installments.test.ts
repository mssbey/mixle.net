import { describe, expect, it } from 'vitest';
import { DEFAULT_INSTALLMENTS, installmentOptions, resolveInstallment, tableForBin } from './installments';

describe('taksit tablosu', () => {
  it('tutar eşiğine göre seçenekleri filtreler', () => {
    const small = installmentOptions(20_000, DEFAULT_INSTALLMENTS);
    expect(small.map((o) => o.count)).toEqual([1]);
    const mid = installmentOptions(60_000, DEFAULT_INSTALLMENTS);
    expect(mid.map((o) => o.count)).toEqual([1, 2, 3, 6]);
  });

  it('vade farkını kuruş bazında hesaplar, aylık tutar yukarı yuvarlanır', () => {
    const opts = installmentOptions(100_000, DEFAULT_INSTALLMENTS);
    const six = opts.find((o) => o.count === 6)!;
    expect(six.interestMinor).toBe(6000);
    expect(six.totalMinor).toBe(106_000);
    expect(six.perMonthMinor).toBe(Math.ceil(106_000 / 6));
    const one = opts.find((o) => o.count === 1)!;
    expect(one.interestMinor).toBe(0);
  });

  it('BIN eşleşmesi banka tablosunu seçer, yoksa varsayılan', () => {
    const tables = [
      ...DEFAULT_INSTALLMENTS,
      { bank: 'Test Bank', bins: ['454360'], rules: [{ count: 1, rateBps: 0 }, { count: 12, rateBps: 0 }] },
    ];
    expect(tableForBin(tables, '4543 60xx xxxx')?.bank).toBe('Test Bank');
    expect(tableForBin(tables, '5555')?.bank).toBe('varsayilan');
    expect(installmentOptions(50_000, tables, '454360').map((o) => o.count)).toEqual([1, 12]);
  });

  it('geçersiz taksit tek çekime düşer', () => {
    expect(resolveInstallment(10_000, DEFAULT_INSTALLMENTS, 9).count).toBe(1);
    expect(resolveInstallment(100_000, DEFAULT_INSTALLMENTS, 9).count).toBe(9);
  });

  it('tek çekim her zaman vardır', () => {
    expect(installmentOptions(1, [{ bank: 'x', bins: [], rules: [{ count: 3, rateBps: 100 }] }]).some((o) => o.count === 1)).toBe(true);
  });
});
