'use client';

import type { Product } from '@/types';
import { type Selection, selectValue, valueVariant } from '@/lib/commerce';
import { currency } from '@/lib/site';
import { cn } from '@/lib/utils';

/**
 * Ürünün tüm seçenek satırları (Hacim, Sertlik, VG / PG Oranı…), paneldeki
 * sırayla. İlk satırdaki butonlar, değerler arasında fiyat farkı varsa o
 * değere geçilince olacak fiyatı da gösterir. Mevcut seçimle var olmayan ya da
 * tükenen kombinasyon soluk görünür ama tıklanabilir: tıklanınca en yakın
 * mevcut kombinasyona geçilir.
 */
export function VariantOptions({
  product,
  selection,
  onChange,
  compact = false,
}: {
  product: Product;
  selection: Selection;
  onChange: (next: Selection) => void;
  compact?: boolean;
}) {
  if (product.variants.length < 2) return null;

  return (
    <div className={compact ? 'space-y-3' : 'space-y-5'}>
      {product.options.map((option, index) => {
        const current = option.values.find((v) => v.id === selection[option.id]);
        const entries = option.values.map((value) => ({
          value,
          variant: valueVariant(product, selection, option.id, value.id),
        }));
        const prices = new Set(entries.map((e) => e.variant?.price).filter((p) => p != null));
        const withPrice = index === 0 && !compact && prices.size > 1;

        return (
          <div key={option.id} role="group" aria-label={option.name}>
            <p className={cn('mb-2 text-ink-soft', compact ? 'text-[11px]' : 'text-sm')}>
              <span className="font-semibold">{option.name}:</span>{' '}
              <span className="font-bold text-ink">{current?.label ?? '—'}</span>
            </p>
            <div className={cn('flex flex-wrap', compact ? 'gap-1.5' : 'gap-2')}>
              {entries.map(({ value, variant }) => {
                const selected = value.id === selection[option.id];
                const available = !!variant && variant.stock !== 'out-of-stock';
                return (
                  <button
                    key={value.id}
                    type="button"
                    aria-pressed={selected}
                    title={available ? undefined : variant ? 'Bu kombinasyon tükendi' : 'Bu kombinasyon yok'}
                    onClick={() => onChange(selectValue(product, selection, option.id, value.id))}
                    className={cn(
                      'rounded-md border font-semibold transition-colors',
                      compact ? 'px-2.5 py-1 text-xs' : withPrice ? 'min-w-[4.5rem] px-3 py-2 text-sm' : 'px-3 py-1.5 text-[13px]',
                      selected
                        ? 'border-brand-500 bg-brand-50 text-brand-600 ring-1 ring-brand-500'
                        : available
                          ? 'border-line bg-white text-ink hover:border-ink/40'
                          : 'border-dashed border-line bg-white text-ink-soft/60',
                      variant?.stock === 'out-of-stock' && !selected && 'line-through',
                    )}
                  >
                    <span className="block leading-tight">{value.label}</span>
                    {withPrice && variant && (
                      <span
                        className={cn(
                          'mt-0.5 block text-[11px] font-medium leading-tight',
                          selected ? 'text-brand-600' : 'text-ink-soft',
                        )}
                      >
                        {currency(variant.price)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
