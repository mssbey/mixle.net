import { describe, expect, it } from 'vitest';
import {
  applyStockExpr,
  buildStockCsv,
  parseAvailability,
  parseOnOff,
  parsePriceCell,
  parseStockCsv,
  parseStockExpr,
  type ManagerProduct,
} from './stock-manager';

describe('parseStockExpr', () => {
  it('düz sayı = o değere ayarla', () => {
    expect(parseStockExpr('40')).toEqual({ op: 'set', value: 40 });
    expect(parseStockExpr(' 0 ')).toEqual({ op: 'set', value: 0 });
  });
  it('+ / - göreli değişim', () => {
    expect(parseStockExpr('+20')).toEqual({ op: 'add', value: 20 });
    expect(parseStockExpr('- 5')).toEqual({ op: 'sub', value: 5 });
    expect(applyStockExpr(50, { op: 'add', value: 20 })).toBe(70);
    expect(applyStockExpr(70, { op: 'sub', value: 5 })).toBe(65);
  });
  it('geçersiz girdiler', () => {
    expect(parseStockExpr('')).toBeNull();
    expect(parseStockExpr('abc')).toBeNull();
    expect(parseStockExpr('1.5')).toBeNull();
    expect(parseStockExpr('+0')).toBeNull();
  });
});

describe('CSV', () => {
  const products: ManagerProduct[] = [
    {
      id: 'p1',
      slug: 'fizzy',
      name: 'Fizzy; "Santa"',
      status: 'yayında',
      image: null,
      categoryIds: [],
      taxRateId: null,
      shippingClass: '',
      variants: [
        { id: 'v1', label: '30 ML', sku: 'FIZ30', priceMinor: 30000, compareAtPriceMinor: null, stock: 20, trackStock: true, inStock: true, weightGrams: 50, isActive: true, image: null },
        { id: 'v2', label: '60 ML', sku: 'FIZ60', priceMinor: 50000, compareAtPriceMinor: null, stock: 0, trackStock: false, inStock: true, weightGrams: null, isActive: true, image: null },
      ],
    },
  ];

  it('dışa aktarılan dosya geri okunabilir (gidiş-dönüş)', () => {
    const csv = buildStockCsv(products);
    expect(csv.startsWith('﻿')).toBe(true);
    const { rows, error } = parseStockCsv(csv);
    expect(error).toBeNull();
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ line: 2, productId: 'p1', variantId: 'v1', sku: 'FIZ30', name: 'Fizzy; "Santa"', price: '300,00', stock: '20', trackStock: 'Açık', inStock: 'Stokta', weight: '50' });
    expect(rows[1]).toMatchObject({ variantId: 'v2', stock: '', trackStock: 'Kapalı', inStock: 'Stokta' });
  });

  it('virgül ayırıcılı ve sütun sırası farklı dosyayı da okur', () => {
    const { rows } = parseStockCsv('SKU,Stok\r\nFIZ30,+10\r\n\r\nFIZ60,5\r\n');
    expect(rows.map((r) => [r.sku, r.stock])).toEqual([
      ['FIZ30', '+10'],
      ['FIZ60', '5'],
    ]);
  });

  it('tanımlayıcı sütun yoksa hata', () => {
    expect(parseStockCsv('Ürün;Stok\nA;5').error).toMatch(/sütunu bulunamadı/);
  });

  it('hücre çözümleyicileri', () => {
    expect(parsePriceCell('1.250,50')).toBe(125050);
    expect(parsePriceCell('450 TL')).toBe(45000);
    expect(parsePriceCell('')).toBeUndefined();
    expect(parsePriceCell('abc')).toBeNull();
    expect(parseOnOff('Kapalı')).toBe(false);
    expect(parseOnOff('açık')).toBe(true);
    expect(parseOnOff('belki')).toBeNull();
    expect(parseAvailability('Stokta yok')).toBe(false);
    expect(parseAvailability('STOKTA')).toBe(true);
  });
});
