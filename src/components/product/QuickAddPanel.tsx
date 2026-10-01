'use client';

import { useState } from 'react';
import { m } from 'framer-motion';
import { Check } from 'lucide-react';
import type { Product } from '@/types';
import { initialSelection, variantFor, type Selection } from '@/lib/commerce';
import { currency } from '@/lib/site';
import { VariantOptions } from './VariantOptions';

export function QuickAddPanel({
  product,
  onConfirm,
}: {
  product: Product;
  onConfirm: (variantId: string) => void;
}) {
  const [selection, setSelection] = useState<Selection>(() => initialSelection(product));
  const variant = variantFor(product, selection);

  return (
    <m.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.2 }}
      className="absolute inset-1 z-20 overflow-y-auto rounded-md border border-line bg-white p-3 shadow-lift"
      onClick={(e) => e.preventDefault()}
    >
      <VariantOptions product={product} selection={selection} onChange={setSelection} compact />
      <button
        type="button"
        disabled={variant.stock === 'out-of-stock'}
        onClick={() => onConfirm(variant.id)}
        className="btn-primary mt-3 w-full py-2 text-xs disabled:opacity-50"
      >
        {variant.stock === 'out-of-stock' ? (
          'Bu varyant tükendi'
        ) : (
          <>
            <Check size={14} /> Sepete ekle · {currency(variant.price)}
          </>
        )}
      </button>
    </m.div>
  );
}
