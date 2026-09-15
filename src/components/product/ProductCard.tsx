'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AnimatePresence } from 'framer-motion';
import { ShoppingBag, SlidersHorizontal, Eye } from 'lucide-react';
import type { Product } from '@/types';
import { Price } from '@/components/ui/Price';
import { Badge } from '@/components/ui/Badge';
import { Rating } from '@/components/ui/Rating';
import { FavoriteButton } from './FavoriteButton';
import { QuickAddPanel } from './QuickAddPanel';
import { useCart } from '@/store/cart';
import { useUI } from '@/store/ui';
import { toast } from '@/store/toast';
import { pickDefaultVariant, stockLabel } from '@/lib/commerce';
import { discountPercent } from '@/lib/site';
import { cn } from '@/lib/utils';

export function ProductCard({
  product,
  onQuickView,
  priority = false,
  className,
}: {
  product: Product;
  onQuickView?: (p: Product) => void;
  priority?: boolean;
  className?: string;
}) {
  const [panelOpen, setPanelOpen] = useState(false);
  const add = useCart((s) => s.add);
  const openCart = useUI((s) => s.openCart);

  const singleVariant = product.variants.length === 1;
  const defaultVariant = pickDefaultVariant(product);
  const soldOut = product.stockStatus === 'out-of-stock';
  const img2 = product.images[1]?.src ?? product.images[0].src;
  const pct = discountPercent(defaultVariant.price, defaultVariant.oldPrice);
  const stock = stockLabel[product.stockStatus];
  // Öne çıkan tek rozet: indirim > çok satan > yeni > özel seri
  const badge = product.badges.includes('cok-satan')
    ? 'cok-satan'
    : product.badges.includes('yeni')
      ? 'yeni'
      : product.badges.includes('sinirli-seri')
        ? 'sinirli-seri'
        : null;

  const doAdd = (variantId: string) => {
    add(product.id, variantId, 1);
    setPanelOpen(false);
    openCart();
    toast.success('Sepete eklendi', product.name);
  };

  const handleCta = () => {
    if (soldOut) return;
    if (singleVariant) doAdd(defaultVariant.id);
    else setPanelOpen((v) => !v);
  };

  return (
    <article
      className={cn(
        'product-card group relative flex h-full flex-col overflow-hidden rounded-md border border-line bg-white transition-all duration-200 hover:border-purple-200 hover:shadow-lift',
        className,
      )}
    >
      <div className="relative aspect-square overflow-hidden bg-mist">
        <Link href={`/urun/${product.slug}`} aria-label={product.name} className="absolute inset-0">
          <Image
            src={product.images[0].src}
            alt={product.representativeImages ? `${product.name} — temsili görsel` : product.name}
            fill
            sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, (max-width:1536px) 25vw, 20vw"
            preload={priority}
            className="object-contain bg-white p-3 transition-opacity duration-500 group-hover:opacity-0"
          />
          <Image
            src={img2}
            alt=""
            fill
            sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, (max-width:1536px) 25vw, 20vw"
            className="object-contain bg-white p-3 opacity-0 transition-all duration-500 group-hover:opacity-100"
          />
        </Link>

        <div className="pointer-events-none absolute left-2.5 top-2.5 z-10 flex flex-col items-start gap-1.5">
          {pct > 0 ? (
            <span className="rounded bg-brand-500 px-1.5 py-0.5 text-[11px] font-bold text-white">
              %{pct} İndirim
            </span>
          ) : (
            badge && <Badge kind={badge} />
          )}
        </div>

        <div className="absolute right-2.5 top-2.5 z-10 flex flex-col gap-2">
          <FavoriteButton productId={product.id} productName={product.name} className="h-9 w-9" />
          {onQuickView && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onQuickView(product);
              }}
              aria-label="Hızlı incele"
              className="grid h-9 w-9 place-items-center rounded-full border border-line bg-white/95 text-ink-soft opacity-0 shadow-card backdrop-blur transition-opacity hover:text-ink group-hover:opacity-100 max-lg:opacity-100"
            >
              <Eye size={16} />
            </button>
          )}
        </div>

        {soldOut && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-white/70 backdrop-blur-[1px]">
            <span className="rounded-full bg-ink px-4 py-1.5 text-xs font-semibold text-white">
              Tükendi
            </span>
          </div>
        )}

        <AnimatePresence>
          {panelOpen && <QuickAddPanel product={product} onConfirm={doAdd} />}
        </AnimatePresence>
      </div>

      <div className="flex flex-1 flex-col p-3 sm:p-3.5">
        {product.representativeImages && <p className="mb-2 text-[10px] text-ink-soft">Temsili görsel</p>}
        <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
          {product.series || 'Mixle'}
        </p>
        <h3 className="mt-1 line-clamp-2 text-[13.5px] font-semibold leading-snug text-ink">
          <Link href={`/urun/${product.slug}`} className="hover:text-brand-500">
            {product.name}
          </Link>
        </h3>

        {product.rating > 0 && (
          <Rating value={product.rating} count={product.reviewCount} size={13} className="mt-1.5" />
        )}

        <div className="mt-auto pt-2.5">
          <Price price={defaultVariant.price} oldPrice={defaultVariant.oldPrice} size="md" />
          <p className={cn('mt-0.5 text-[11px] font-medium', stock.className)}>{stock.text}</p>

          <button
            type="button"
            onClick={handleCta}
            disabled={soldOut}
            className={cn(
              'mt-2.5 flex h-10 w-full items-center justify-center gap-1.5 rounded-md text-[13px] font-semibold transition-colors',
              soldOut
                ? 'cursor-not-allowed bg-purple-100 text-ink-soft'
                : singleVariant
                  ? 'bg-brand-500 text-white hover:bg-brand-600'
                  : 'border border-brand-500 bg-white text-brand-500 hover:bg-brand-50',
            )}
          >
            {soldOut ? (
              'Tükendi'
            ) : singleVariant ? (
              <>
                <ShoppingBag size={15} /> Sepete Ekle
              </>
            ) : (
              <>
                <SlidersHorizontal size={15} className={cn('transition-transform', panelOpen && 'rotate-90')} />
                Seçenekleri Gör
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
