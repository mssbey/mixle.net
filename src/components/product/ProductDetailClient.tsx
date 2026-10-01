'use client';

import { useMemo, useState } from 'react';
import type { Product } from '@/types';
import { Gallery } from './Gallery';
import { PurchasePanel } from './PurchasePanel';
import { initialSelection, variantFor, type Selection } from '@/lib/commerce';
import { useCart } from '@/store/cart';
import { useUI } from '@/store/ui';
import { toast } from '@/store/toast';
import { currency } from '@/lib/site';

export function ProductDetailClient({ product }: { product: Product }) {
  const [selection, setSelection] = useState<Selection>(() => initialSelection(product));
  const [qty, setQty] = useState(1);

  const variant = useMemo(() => variantFor(product, selection), [product, selection]);

  const galleryImages = useMemo(() => {
    const variantImg = { src: variant.image, alt: [product.name, variant.label].filter(Boolean).join(' — ') };
    const rest = product.gallery.filter((g) => g.src !== variant.image);
    return [variantImg, ...rest];
  }, [variant, product]);

  const add = useCart((s) => s.add);
  const openCart = useUI((s) => s.openCart);
  const soldOut = variant.stock === 'out-of-stock';

  return (
    <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
      <Gallery
        images={galleryImages}
        productName={product.name}
        activeHint={variant.id}
      />
      <PurchasePanel
        product={product}
        variant={variant}
        selection={selection}
        qty={qty}
        onSelect={(next) => {
          setSelection(next);
          setQty(1);
        }}
        onQty={setQty}
      />

      {/* Mobil sabit sepete ekle çubuğu — alt navigasyonun üstünde */}
      <div className="fixed inset-x-0 bottom-[54px] z-[70] border-t border-line bg-white/95 p-3 backdrop-blur-lg safe-bottom lg:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-ink">{product.name}</p>
            {variant.label && <p className="truncate text-[11px] text-ink-soft">{variant.label}</p>}
            <p className="text-sm font-bold text-brand-600">{currency(variant.price * qty)}</p>
          </div>
          <button
            type="button"
            disabled={soldOut}
            onClick={() => {
              add(product.id, variant.id, qty);
              openCart();
              toast.success('Sepete eklendi', product.name);
            }}
            className="btn-primary h-11 px-6 text-sm disabled:opacity-40"
          >
            {soldOut ? 'Tükendi' : 'Sepete Ekle'}
          </button>
        </div>
      </div>
    </div>
  );
}
