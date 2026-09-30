'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { EmptyState } from '@/components/ui/EmptyState';
import { ButtonLink } from '@/components/ui/Button';
import { useUI } from '@/store/ui';
import { useCart } from '@/store/cart';
import { useMounted } from '@/lib/hooks';
import { detailLines, summarize } from '@/lib/cart-math';
import { useSlimProducts } from '@/components/catalog/CatalogProvider';
import { currency, site } from '@/lib/site';
import { variantLabel } from '@/lib/commerce';
import { clamp } from '@/lib/utils';

export function CartDrawer() {
  const mounted = useMounted();
  const { cartOpen, closeCart } = useUI();
  const { lines, setQty, remove, changeVariant } = useCart();
  const promo = useCart((s) => s.promo);

  // Katalog yalnızca çekmece açıldığında indirilir.
  const { products, loading } = useSlimProducts(cartOpen);
  const detailed = mounted && !loading ? detailLines(lines, products) : [];
  const summary = summarize(detailed, promo);
  const progress = clamp(
    (1 - summary.freeShippingRemaining / site.commerce.freeShippingThreshold) * 100,
    0,
    100,
  );

  return (
    <Drawer open={cartOpen} onClose={closeCart} label="Sepetiniz" side="right" title={
        <span className="flex items-baseline gap-2">
          Sepetiniz
          {detailed.length > 0 && (
            <span className="text-sm font-medium text-ink-soft">{summary.itemCount} ürün</span>
          )}
        </span>
      }>
      {detailed.length === 0 ? (
        <div className="flex flex-1 items-center p-5">
          <EmptyState
            icon={ShoppingBag}
            title="Sepetiniz boş"
            description="Aromaları keşfedin, favori profilinizi sepete ekleyin."
            action={
              <ButtonLink href="/urunler" onClick={closeCart} variant="primary">
                Aromaları keşfet
              </ButtonLink>
            }
          />
        </div>
      ) : (
        <>
          <div className="border-b border-line px-5 py-3">
            {summary.freeShippingRemaining > 0 ? (
              <p className="text-xs text-ink-soft">
                Ücretsiz kargoya <strong className="font-semibold text-ink">{currency(summary.freeShippingRemaining)}</strong> kaldı
              </p>
            ) : (
              <p className="text-xs font-semibold text-emerald-600">Ücretsiz kargo kazandınız.</p>
            )}
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-purple-100">
              <div className="h-full rounded-full bg-gold-400 transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <ul className="flex-1 divide-y divide-line overflow-y-auto px-5">
            {detailed.map((line) => (
              <li key={line.key} className="flex gap-3 py-4">
                <Link href={`/urun/${line.product.slug}`} onClick={closeCart} className="shrink-0">
                  <Image
                    src={line.variant.image || line.product.images[0].src}
                    alt={line.product.name}
                    width={72}
                    height={72}
                    className="h-18 w-18 rounded-lg border border-line bg-white object-contain"
                    style={{ height: 72, width: 72 }}
                  />
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/urun/${line.product.slug}`}
                      onClick={closeCart}
                      className="line-clamp-2 text-sm font-semibold leading-snug text-ink hover:text-brand-500"
                    >
                      {line.product.name}
                    </Link>
                    <button
                      type="button"
                      onClick={() => remove(line.key)}
                      aria-label="Ürünü sepetten çıkar"
                      className="shrink-0 rounded p-1 text-ink-soft/60 hover:text-brand-500"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <select
                    value={line.variantId}
                    onChange={(e) => changeVariant(line.key, e.target.value)}
                    aria-label="Varyasyon seç"
                    className="mt-1.5 max-w-full rounded-md border border-line bg-white px-2 py-1 text-xs font-medium text-ink-soft focus:border-ink/30 focus:outline-none"
                  >
                    {line.product.variants.map((v) => (
                      <option key={v.id} value={v.id} disabled={v.stock === 'out-of-stock'}>
                        {variantLabel(line.product, v)}
                        {v.stock === 'out-of-stock' ? ' (tükendi)' : ''}
                      </option>
                    ))}
                  </select>
                  <div className="mt-2 flex items-center justify-between">
                    <QuantityStepper
                      value={line.qty}
                      onChange={(n) => setQty(line.key, n)}
                      size="sm"
                      max={Math.max(1, line.variant.stockCount || 99)}
                    />
                    <span className="text-sm font-bold tabular-nums text-ink">{currency(line.lineTotal)}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="space-y-3 border-t border-line bg-white/60 p-5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-soft">Ara toplam</span>
              <span className="font-semibold tabular-nums text-ink">{currency(summary.subtotal)}</span>
            </div>
            {summary.promoDiscount > 0 && (
              <div className="flex items-center justify-between text-sm text-emerald-600">
                <span>İndirim kodu ({promo})</span>
                <span>−{currency(summary.promoDiscount)}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-soft">Kargo</span>
              <span className="font-semibold tabular-nums text-ink">
                {summary.shipping === 0 ? 'Ücretsiz' : currency(summary.shipping)}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-line pt-3 text-base">
              <span className="font-bold text-ink">Toplam</span>
              <span className="text-xl font-extrabold tracking-tight tabular-nums text-ink">{currency(summary.total)}</span>
            </div>
            <ButtonLink href="/sepet" onClick={closeCart} variant="primary" className="w-full">
              Sepete git <ArrowRight size={16} />
            </ButtonLink>
            <button
              type="button"
              onClick={closeCart}
              className="w-full text-center text-xs font-medium text-ink-soft hover:text-ink"
            >
              Alışverişe devam et
            </button>
          </div>
        </>
      )}
    </Drawer>
  );
}
