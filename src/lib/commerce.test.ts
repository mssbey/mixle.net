import { describe, expect, it } from 'vitest';
import type { Product, ProductVariant } from '@/types';
import { findVariant, selectValue } from './commerce';

const variant = (id: string, selection: Record<string, string>, stock: ProductVariant['stock'] = 'in-stock') =>
  ({ id, selection, stock, price: 100, label: id }) as ProductVariant;

const product = {
  options: [
    { id: 'hacim', name: 'Hacim', values: [{ id: '100', label: '100 ml' }, { id: '250', label: '250 ml' }] },
    { id: 'mg', name: 'Sertlik', values: [{ id: '0', label: '0 Mg' }, { id: '3', label: '3 Mg' }] },
  ],
  variants: [
    variant('a', { hacim: '100', mg: '0' }),
    variant('b', { hacim: '100', mg: '3' }),
    variant('c', { hacim: '250', mg: '3' }),
  ],
} as unknown as Product;

describe('çok seçenekli varyant seçimi', () => {
  it('tam kombinasyonu bulur', () => {
    expect(findVariant(product, { hacim: '100', mg: '3' })?.id).toBe('b');
  });

  it('var olan kombinasyonda yalnız tıklanan seçenek değişir', () => {
    expect(selectValue(product, { hacim: '100', mg: '0' }, 'mg', '3')).toEqual({ hacim: '100', mg: '3' });
  });

  it('kombinasyon yoksa en yakın mevcut varyanta geçer', () => {
    // 250 ml + 0 Mg yok → 250 ml + 3 Mg
    expect(selectValue(product, { hacim: '100', mg: '0' }, 'hacim', '250')).toEqual({ hacim: '250', mg: '3' });
  });
});
