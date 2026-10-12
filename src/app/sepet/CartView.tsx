'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Trash2, ShoppingBag, Tag, ArrowRight } from 'lucide-react';
import { useCart } from '@/store/cart';
import { useMounted } from '@/lib/hooks';
import { detailLines, shippingLabel, summarize } from '@/lib/cart-math';
import { useCartCampaigns } from '@/lib/cart-quote';
import { EmptyState } from '@/components/ui/EmptyState';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { ButtonLink } from '@/components/ui/Button';
import { RelatedRail } from '@/components/product/RelatedRail';
import { currency } from '@/lib/site';
import { variantLabel } from '@/lib/commerce';
import { useSlimProducts } from '@/components/catalog/CatalogProvider';
import { toast } from '@/store/toast';
import { clamp } from '@/lib/utils';

export function CartView() {
  const mounted = useMounted();
  const router = useRouter();
  const { lines, setQty, remove, applyPromo, removePromo, clear } = useCart();
  const promo = useCart((s) => s.promo);
  const [code, setCode] = useState('');

  const { products, loading } = useSlimProducts();
  const ready = mounted && !loading;
  const detailed = ready ? detailLines(lines, products) : [];
  const campaigns = useCartCampaigns(lines, mounted);
  const summary = summarize(detailed, promo, campaigns);
  const progress = summary.freeShippingThreshold
    ? clamp((1 - summary.freeShippingRemaining / summary.freeShippingThreshold) * 100, 0, 100)
    : 100;

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
        <ul className="divide-y divide-line rounded-lg border border-line bg-white">
          {detailed.map((line) => (
            <li key={line.key} className="flex gap-4 p-4 sm:p-5">
              <Link href={`/urun/${line.product.slug}`} className="shrink-0">
                <Image
                  src={line.variant.image || line.product.images[0].src}
                  alt={line.product.name}
                  width={96}
                  height={96}
                  className="h-24 w-24 rounded-md border border-line object-cover"
                />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">{line.product.series}</p>
                    <Link href={`/urun/${line.product.slug}`} className="font-semibold text-ink hover:text-brand-500">
                      {line.product.name}
                    </Link>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(line.key)}
                    aria-label="Ürünü sepetten çıkar"
                    className="rounded p-1.5 text-ink-soft hover:text-brand-500"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>

                {[variantLabel(line.product, line.variant), line.variant.type].filter(Boolean).length > 0 && (
                  <p className="mt-2 text-xs text-ink-soft">
                    {[variantLabel(line.product, line.variant), line.variant.type].filter(Boolean).join(' · ')}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <QuantityStepper
                    value={line.qty}
                    onChange={(n) => setQty(line.key, n)}
                    onRemove={() => remove(line.key)}
                    size="sm"
                    max={Math.max(1, line.variant.stockCount || 99)}
                  />
                  <div className="text-right">
                    {line.lineOldTotal > line.lineTotal && (
                      <p className="text-xs text-ink-soft line-through">{currency(line.lineOldTotal)}</p>
                    )}
                    <p className="text-lg font-bold text-ink">{currency(line.lineTotal)}</p>
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
          <button type="button" onClick={clear} className="text-xs font-medium text-brand-500 hover:text-brand-600">
            Sepeti temizle
          </button>
        </div>
      </div>

      <aside className="h-fit rounded-lg border border-line bg-white p-5 lg:sticky lg:top-[calc(var(--header-h-scrolled)+16px)]">
        <h2 className="text-lg font-bold text-ink">Sipariş Özeti</h2>

        <div className="mt-4">
          {promo ? (
            <div
              className={
                summary.promoValid === false
                  ? 'rounded-md bg-brand-500/10 px-3 py-2 text-xs font-semibold text-brand-600'
                  : 'rounded-md bg-success/10 px-3 py-2 text-xs font-semibold text-success'
              }
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Tag size={13} /> {promo}{' '}
                  {summary.promoValid === null ? 'kontrol ediliyor…' : summary.promoValid ? 'uygulandı' : 'geçersiz'}
                </span>
                <button type="button" onClick={removePromo} className="underline">
                  Kaldır
                </button>
              </div>
              {summary.promoLabel && <p className="mt-1 font-normal">{summary.promoLabel}</p>}
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!applyPromo(code)) toast.error('Bir kod girin.');
                setCode('');
              }}
              className="flex gap-2"
            >
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="İndirim kodu"
                aria-label="İndirim kodu"
                className="min-w-0 flex-1 rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-brand-400"
              />
              <button type="submit" className="btn-ghost px-4 text-xs">
                Uygula
              </button>
            </form>
          )}
        </div>

        <div className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
          <div className="flex justify-between">
            <span className="text-ink-soft">Ara toplam</span>
            <span className="font-semibold text-ink">{currency(summary.subtotal)}</span>
          </div>
          {summary.productSavings > 0 && (
            <div className="flex justify-between text-success">
              <span>Ürün indirimi</span>
              <span>−{currency(summary.productSavings)}</span>
            </div>
          )}
          {summary.campaigns.map((c) => (
            <div key={c.id} className="flex justify-between text-success">
              <span>{c.name}</span>
              <span>−{currency(c.discount)}</span>
            </div>
          ))}
          {summary.promoDiscount > 0 && (
            <div className="flex justify-between text-success">
              <span>Kod indirimi</span>
              <span>−{currency(summary.promoDiscount)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-ink-soft">Kargo{summary.shippingVaries && summary.shipping != null ? ' (tahmini)' : ''}</span>
            <span className="font-semibold text-ink">{shippingLabel(summary, currency)}</span>
          </div>
        </div>

        {summary.freeShippingRemaining > 0 && (
          <div className="mt-3">
            <p className="text-[11px] text-ink-soft">
              Ücretsiz kargoya <strong className="text-ink">{currency(summary.freeShippingRemaining)}</strong> kaldı
            </p>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line">
              <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
          <span className="font-semibold text-ink">Toplam{summary.shipping == null ? ' (kargo hariç)' : ''}</span>
          <span className="text-xl font-bold text-brand-600">{currency(summary.total)}</span>
        </div>

        <button
          type="button"
          onClick={() => router.push('/odeme')}
          className="btn-primary mt-5 w-full"
        >
          Ödemeye Geç <ArrowRight size={16} />
        </button>
        <p className="mt-2 text-center text-[11px] text-ink-soft">
          Kargo ve kupon tutarı ödeme adımında adresinize göre kesinleşir.
        </p>
      </aside>
    </div>
  );
}
