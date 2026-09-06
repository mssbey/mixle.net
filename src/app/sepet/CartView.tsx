'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Trash2, ShoppingBag, Tag, ArrowRight } from 'lucide-react';
import { useCart } from '@/store/cart';
import { useMounted } from '@/lib/hooks';
import { detailLines, summarize } from '@/lib/cart-math';
import { EmptyState } from '@/components/ui/EmptyState';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { ButtonLink } from '@/components/ui/Button';
import { RelatedRail } from '@/components/product/RelatedRail';
import { currency, site } from '@/lib/site';
import { useSlimProducts } from '@/components/catalog/CatalogProvider';
import { toast } from '@/store/toast';
import { clamp } from '@/lib/utils';

export function CartView() {
  const mounted = useMounted();
  const router = useRouter();
  const { lines, setQty, remove, changeVariant, applyPromo, removePromo, clear } = useCart();
  const promo = useCart((s) => s.promo);
  const [code, setCode] = useState('');

  const { products, loading } = useSlimProducts();
  const ready = mounted && !loading;
  const detailed = ready ? detailLines(lines, products) : [];
  const summary = summarize(detailed, promo);
  const progress = clamp((1 - summary.freeShippingRemaining / site.commerce.freeShippingThreshold) * 100, 0, 100);

  if (ready && detailed.length === 0) {
    return (
      <>
        <EmptyState
          icon={ShoppingBag}
          title="Sepetiniz boş"
          description="Aromaları keşfedip favori profillerinizi sepete ekleyebilirsiniz."
          action={<ButtonLink href="/urunler">Aromaları keşfet</ButtonLink>}
        />
        <RelatedRail title="Çok satanlar" products={products.filter((p) => p.bestSeller).slice(0, 8)} />
      </>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
      <div>
        <ul className="divide-y divide-purple-100 rounded-2xl border border-purple-100 bg-white">
          {detailed.map((line) => (
            <li key={line.key} className="flex gap-4 p-4 sm:p-5">
              <Link href={`/urun/${line.product.slug}`} className="shrink-0">
                <Image
                  src={line.variant.image || line.product.images[0].src}
                  alt={line.product.name}
                  width={96}
                  height={96}
                  className="h-24 w-24 rounded-xl object-cover"
                />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gold-500">{line.product.series}</p>
                    <Link href={`/urun/${line.product.slug}`} className="font-semibold text-purple-900 hover:text-purple-600">
                      {line.product.name}
                    </Link>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(line.key)}
                    aria-label="Ürünü sepetten çıkar"
                    className="rounded p-1.5 text-purple-300 hover:text-rose-500"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>

                <select
                  value={line.variantId}
                  onChange={(e) => changeVariant(line.key, e.target.value)}
                  aria-label="Varyasyon seç"
                  className="mt-2 rounded-lg border border-purple-200 bg-white px-2.5 py-1.5 text-xs text-ink-soft"
                >
                  {line.product.variants.map((v) => (
                    <option key={v.id} value={v.id} disabled={v.stock === 'out-of-stock'}>
                      {v.volume} · {v.intensity} · {v.type}
                      {v.stock === 'out-of-stock' ? ' (tükendi)' : ''}
                    </option>
                  ))}
                </select>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <QuantityStepper
                    value={line.qty}
                    onChange={(n) => setQty(line.key, n)}
                    size="sm"
                    max={Math.max(1, line.variant.stockCount || 99)}
                  />
                  <div className="text-right">
                    {line.lineOldTotal > line.lineTotal && (
                      <p className="text-xs text-ink-soft line-through">{currency(line.lineOldTotal)}</p>
                    )}
                    <p className="font-display text-lg font-semibold text-purple-900">{currency(line.lineTotal)}</p>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <ButtonLink href="/urunler" variant="link">
            ← Alışverişe devam et
          </ButtonLink>
          <button type="button" onClick={clear} className="text-xs font-medium text-rose-500 hover:text-rose-600">
            Sepeti temizle
          </button>
        </div>
      </div>

      <aside className="h-fit rounded-2xl border border-purple-100 bg-white p-5 lg:sticky lg:top-[calc(var(--header-h)+16px)]">
        <h2 className="font-display text-lg font-semibold text-purple-900">Sipariş Özeti</h2>

        <div className="mt-4">
          {promo ? (
            <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
              <span className="flex items-center gap-1.5">
                <Tag size={13} /> {promo} uygulandı
              </span>
              <button type="button" onClick={removePromo} className="underline">
                Kaldır
              </button>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const res = applyPromo(code);
                if (res.ok) toast.success(res.message);
                else toast.error(res.message);
                setCode('');
              }}
              className="flex gap-2"
            >
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="İndirim kodu"
                aria-label="İndirim kodu"
                className="min-w-0 flex-1 rounded-lg border border-purple-200 px-3 py-2 text-sm outline-none focus:border-purple-400"
              />
              <button type="submit" className="btn-ghost px-4 text-xs">
                Uygula
              </button>
            </form>
          )}
          <p className="mt-1.5 text-[11px] text-ink-soft">Örnek kodlar: NEFIS10, ILKAROMA, GOLDENDROP</p>
        </div>

        <div className="mt-4 space-y-2 border-t border-purple-100 pt-4 text-sm">
          <div className="flex justify-between">
            <span className="text-ink-soft">Ara toplam</span>
            <span className="font-medium text-purple-900">{currency(summary.subtotal)}</span>
          </div>
          {summary.productSavings > 0 && (
            <div className="flex justify-between text-emerald-600">
              <span>Ürün indirimi</span>
              <span>−{currency(summary.productSavings)}</span>
            </div>
          )}
          {summary.promoDiscount > 0 && (
            <div className="flex justify-between text-emerald-600">
              <span>Kod indirimi</span>
              <span>−{currency(summary.promoDiscount)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-ink-soft">Kargo</span>
            <span className="font-medium text-purple-900">{summary.shipping === 0 ? 'Ücretsiz' : currency(summary.shipping)}</span>
          </div>
        </div>

        {summary.freeShippingRemaining > 0 && (
          <div className="mt-3">
            <p className="text-[11px] text-ink-soft">
              Ücretsiz kargoya <strong className="text-purple-800">{currency(summary.freeShippingRemaining)}</strong> kaldı
            </p>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-purple-100">
              <div className="h-full rounded-full bg-gold-400 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between border-t border-purple-100 pt-4">
          <span className="font-semibold text-purple-900">Toplam</span>
          <span className="font-display text-xl font-bold text-purple-900">{currency(summary.total)}</span>
        </div>

        <button
          type="button"
          onClick={() => router.push('/siparis/tamamlandi')}
          className="btn-primary mt-5 w-full"
        >
          Siparişi Tamamla <ArrowRight size={16} />
        </button>
        <p className="mt-2 text-center text-[11px] text-ink-soft">
          Bu bir demo akıştır; gerçek bir ödeme işlemi gerçekleştirilmez.
        </p>
      </aside>
    </div>
  );
}
