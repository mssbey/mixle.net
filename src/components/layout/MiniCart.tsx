'use client';

import Link from 'next/link';
import Image from 'next/image';
import { m } from 'framer-motion';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '@/store/cart';
import { useMounted } from '@/lib/hooks';
import { detailLines, summarize } from '@/lib/cart-math';
import { useSlimProducts } from '@/components/catalog/CatalogProvider';
import { currency } from '@/lib/site';
import { variantLabel } from '@/lib/commerce';

/**
 * Masaüstü header'da sepet düğmesinin altında açılan mini sepet.
 * Katalog yalnızca panel açıldığında (`open`) indirilir.
 */
export function MiniCart({ open, onNavigate }: { open: boolean; onNavigate: () => void }) {
  const mounted = useMounted();
  const lines = useCart((s) => s.lines);
  const promo = useCart((s) => s.promo);
  const { products, loading } = useSlimProducts(open);

  const detailed = mounted && !loading ? detailLines(lines, products) : [];
  const summary = summarize(detailed, promo);

  return (
    <m.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
      className="absolute right-0 top-full z-50 mt-2 w-[360px] overflow-hidden rounded-xl border border-line bg-white shadow-lift"
      role="dialog"
      aria-label="Mini sepet"
    >
      {detailed.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
          <ShoppingBag size={28} className="text-purple-300" />
          <p className="text-sm font-semibold text-ink">Sepetiniz boş</p>
          <p className="text-xs text-ink-soft">Ürünleri keşfedin, sepete ekleyin.</p>
          <Link
            href="/urunler"
            onClick={onNavigate}
            className="mt-2 text-xs font-semibold text-brand-500 hover:text-brand-600"
          >
            Alışverişe başla →
          </Link>
        </div>
      ) : (
        <>
          <ul className="max-h-[320px] divide-y divide-line overflow-y-auto px-4">
            {detailed.map((line) => (
              <li key={line.key} className="flex gap-3 py-3">
                <Link href={`/urun/${line.product.slug}`} onClick={onNavigate} className="shrink-0">
                  <Image
                    src={line.variant.image || line.product.images[0].src}
                    alt={line.product.name}
                    width={56}
                    height={56}
                    className="h-14 w-14 rounded-md border border-line object-cover"
                    style={{ height: 56, width: 56 }}
                  />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/urun/${line.product.slug}`}
                    onClick={onNavigate}
                    className="line-clamp-1 text-[13px] font-semibold text-ink hover:text-brand-500"
                  >
                    {line.product.name}
                  </Link>
                  <p className="mt-0.5 text-[11px] text-ink-soft">
                    {variantLabel(line.product, line.variant)}
                  </p>
                  <div className="mt-1 flex items-center justify-between text-[12px]">
                    <span className="text-ink-soft">{line.qty} adet</span>
                    <span className="font-semibold text-ink">{currency(line.lineTotal)}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="space-y-3 border-t border-line bg-mist/60 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-soft">Ara toplam</span>
              <span className="font-bold text-ink">{currency(summary.subtotal)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/sepet"
                onClick={onNavigate}
                className="btn-ghost h-10 px-3 py-0 text-xs"
              >
                Sepete git
              </Link>
              <Link
                href="/odeme"
                onClick={onNavigate}
                className="btn-primary h-10 px-3 py-0 text-xs"
              >
                Ödemeye geç <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </>
      )}
    </m.div>
  );
}
