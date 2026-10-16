'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Star } from 'lucide-react';
import type { Product } from '@/types';
import { FavoriteButton } from '@/components/product/FavoriteButton';
import { pickDefaultVariant, variantPriceRange } from '@/lib/commerce';
import { discountPercent } from '@/lib/site';
import { cn } from '@/lib/utils';

/** Referans kart fiyat biçimi: her zaman iki ondalık ("₺107,20"). */
const price = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2 });

/** mixle.net ana sayfasındaki ürün kartının birebir karşılığı. */
export function HomeProductCard({
  product,
  label,
}: {
  product: Product;
  /** Kartın üstündeki mor kategori etiketi (ör. "MİX AROMALAR"). */
  label: string;
}) {
  const variant = pickDefaultVariant(product);
  const soldOut = product.stockStatus === 'out-of-stock';
  const pct = discountPercent(variant.price, variant.oldPrice);
  const range = variantPriceRange(product);
  const href = `/urun/${product.slug}`;
  const rating = Math.round(product.rating);

  return (
    <div className="home-card group relative h-full overflow-hidden rounded-xl border border-[#e5e7eb] bg-white">
      <div className="relative aspect-square overflow-hidden">
        <Link href={href} aria-label={product.name} className="absolute inset-0">
          <Image
            src={product.images[0].src}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 244px"
            className="object-cover transition-transform duration-500"
          />
        </Link>

        {/* Rozetler sağ altta: sol üstteki ürün görseli yazılarını (ör. marka adı) kapatmasın. */}
        <div className="pointer-events-none absolute bottom-2 right-2 flex flex-col items-end gap-1">
          {pct > 0 && <span className="rounded-md bg-[#e31213] px-2 py-0.5 text-[10px] font-bold text-white">%{pct} İndirim</span>}
          {product.badges.includes('cok-satan') && (
            <span className="rounded-md bg-[#f59e0b] px-2 py-0.5 text-[10px] font-bold text-white">🔥 Çok Satan</span>
          )}
          {product.badges.includes('yeni') && <span className="rounded-md bg-[#10b981] px-2 py-0.5 text-[10px] font-bold text-white">Yeni</span>}
        </div>

        <div className="absolute right-2 top-2 z-10 flex flex-col items-end gap-1 opacity-0 transition-opacity group-hover:opacity-100 max-lg:opacity-100">
          <FavoriteButton productId={product.id} productName={product.name} size={16} className="h-8 w-8 border-0 bg-white/80 text-[#65758b] shadow-none hover:text-red-400" />
        </div>

        {soldOut && (
          <div className="absolute inset-0 grid place-items-center bg-white/70">
            <span className="rounded-full bg-gray-900 px-4 py-1.5 text-xs font-semibold text-white">Tükendi</span>
          </div>
        )}
      </div>

      <div className="px-1.5 pb-1.5 pt-3 lg:px-2 lg:pb-2 lg:pt-4">
        <Link href={href} className="block">
          <span className="block truncate text-xs font-medium uppercase text-[#6366f1]">{label}</span>
          <h3 className="mt-1 line-clamp-1 text-sm font-semibold text-[#111827] transition-colors group-hover:text-[#e31213]">{product.name}</h3>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-base font-bold tabular-nums text-[#111827]">
              {range.min !== range.max
                ? `${price.format(range.min)} – ${price.format(range.max)}`
                : price.format(variant.price)}
            </span>
            {range.min === range.max && pct > 0 && variant.oldPrice && (
              <span className="text-xs tabular-nums text-gray-400 line-through">{price.format(variant.oldPrice)}</span>
            )}
          </div>
          <div className="mt-1.5 flex min-h-[16px] items-center gap-1">
            <div className="flex gap-0.5" aria-label={rating ? `${rating} / 5 puan` : 'Henüz değerlendirilmedi'}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} className={cn('h-3 w-3', n <= rating ? 'fill-[#f59e0b] text-[#f59e0b]' : 'text-[#e5e7eb]')} />
              ))}
            </div>
            {product.reviewCount > 0 && <span className="text-[10px] text-gray-500">({product.reviewCount})</span>}
          </div>
        </Link>
        {/* Sepete yalnız ürün sayfasından eklenir; kart ürüne götürür. */}
        <Link
          href={href}
          tabIndex={-1}
          className={cn(
            'mt-2 flex h-8 w-full items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-all duration-200 active:scale-95',
            soldOut ? 'bg-gray-200 text-gray-500' : 'bg-[#e31213] text-white hover:bg-[#c90f10]',
          )}
        >
          <span>{soldOut ? 'Tükendi' : 'Ürünü İncele'}</span>
          {!soldOut && <ArrowRight className="h-3 w-3 shrink-0" />}
        </Link>
      </div>
    </div>
  );
}
