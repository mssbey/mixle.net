'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import type { Product } from '@/types';
import { Price } from '@/components/ui/Price';
import { Badge } from '@/components/ui/Badge';
import { Rating } from '@/components/ui/Rating';
import { FavoriteButton } from './FavoriteButton';
import { pickDefaultVariant, stockLabel, variantPriceRange } from '@/lib/commerce';
import { currency, discountPercent } from '@/lib/site';
import { cn } from '@/lib/utils';

export function ProductCard({
  product,
  priority = false,
  className,
}: {
  product: Product;
  priority?: boolean;
  className?: string;
}) {
  const defaultVariant = pickDefaultVariant(product);
  const soldOut = product.stockStatus === 'out-of-stock';
  const img2 = product.images[1]?.src ?? product.images[0].src;
  const pct = discountPercent(defaultVariant.price, defaultVariant.oldPrice);
  const range = variantPriceRange(product);
  const stock = stockLabel[product.stockStatus];
  // Öne çıkan tek rozet: indirim > çok satan > yeni > özel seri
  const badge = product.badges.includes('cok-satan')
    ? 'cok-satan'
    : product.badges.includes('yeni')
      ? 'yeni'
      : product.badges.includes('sinirli-seri')
        ? 'sinirli-seri'
        : null;

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
            alt={product.name}
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

        {/* Rozet sağ altta: sol üstteki ürün görseli yazılarını (ör. marka adı) kapatmasın. */}
        <div className="pointer-events-none absolute bottom-2.5 right-2.5 z-10 flex flex-col items-end gap-1.5">
          {pct > 0 ? (
            <span className="rounded bg-brand-500 px-2.5 py-1 text-[13px] font-bold text-white shadow-card">
              %{pct} İndirim
            </span>
          ) : (
            badge && <Badge kind={badge} className="px-2.5 py-1 text-[13px] shadow-card" />
          )}
        </div>

        <div className="absolute right-2.5 top-2.5 z-10 flex flex-col gap-2">
          <FavoriteButton productId={product.id} productName={product.name} className="h-9 w-9" />
        </div>

        {soldOut && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-white/70 backdrop-blur-[1px]">
            <span className="rounded-full bg-ink px-4 py-1.5 text-xs font-semibold text-white">
              Tükendi
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3 sm:p-3.5">
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
          {range.min !== range.max ? (
            <p className="text-lg font-bold tracking-tight text-ink">
              {currency(range.min)} – {currency(range.max)}
            </p>
          ) : (
            <Price price={defaultVariant.price} oldPrice={defaultVariant.oldPrice} size="md" />
          )}
          <p className={cn('mt-0.5 text-[11px] font-medium', stock.className)}>{stock.text}</p>

          {/* Sepete yalnız ürün sayfasından eklenir; kart ürüne götürür. */}
          <Link
            href={`/urun/${product.slug}`}
            tabIndex={-1}
            className={cn(
              'mt-2.5 flex h-10 w-full items-center justify-center gap-1.5 rounded-md text-[13px] font-semibold transition-colors',
              soldOut ? 'bg-purple-100 text-ink-soft' : 'bg-brand-500 text-white hover:bg-brand-600',
            )}
          >
            {soldOut ? 'Tükendi' : <>Ürünü İncele <ArrowRight size={15} /></>}
          </Link>
        </div>
      </div>
    </article>
  );
}
