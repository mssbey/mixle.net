'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MessageCircle, ShieldCheck, Truck, RotateCcw, PackageCheck } from 'lucide-react';
import type { Product, ProductVariant, VariantIntensity, VariantVolume } from '@/types';
import { Price } from '@/components/ui/Price';
import { Rating } from '@/components/ui/Rating';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { FavoriteButton } from './FavoriteButton';
import { uniqueOptions, isOptionAvailable, stockLabel } from '@/lib/commerce';
import { useCart } from '@/store/cart';
import { useUI } from '@/store/ui';
import { toast } from '@/store/toast';
import { site, currency } from '@/lib/site';
import { useCategories } from '@/components/catalog/CatalogProvider';
import { cn } from '@/lib/utils';

interface Props {
  product: Product;
  variant: ProductVariant;
  volume: VariantVolume;
  intensity: VariantIntensity;
  qty: number;
  onVolume: (v: VariantVolume) => void;
  onIntensity: (v: VariantIntensity) => void;
  onQty: (n: number) => void;
}

const optionBtn = (selected: boolean, available: boolean) =>
  cn(
    'rounded-md border px-4 py-2 text-sm font-semibold transition-colors',
    selected
      ? 'border-brand-500 bg-brand-500 text-white'
      : available
        ? 'border-line text-ink hover:border-ink/30'
        : 'cursor-not-allowed border-line text-purple-300 line-through',
  );

export function PurchasePanel({ product, variant, volume, intensity, qty, onVolume, onIntensity, onQty }: Props) {
  const router = useRouter();
  const add = useCart((s) => s.add);
  const openCart = useUI((s) => s.openCart);
  const { volumes, intensities } = uniqueOptions(product);
  const categories = useCategories();
  const category = categories.find((c) => c.slug === product.category);
  const sel = { volume, intensity };
  const soldOut = variant.stock === 'out-of-stock';
  const stock = stockLabel[product.stockStatus];

  const handleAdd = () => {
    add(product.id, variant.id, qty);
    openCart();
    toast.success('Sepete eklendi', `${product.name} · ${qty} adet`);
  };

  const handleBuyNow = () => {
    add(product.id, variant.id, qty);
    router.push('/odeme');
  };

  return (
    <div className="rounded-lg border border-line bg-white p-5 sm:p-7">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-soft">
        {category ? (
          <Link href={`/kategori/${category.slug}`} className="hover:text-brand-500">
            {category.name}
          </Link>
        ) : null}
        {product.series ? ` · ${product.series}` : ''}
      </p>
      <h1 className="mt-1.5 text-2xl font-bold text-ink sm:text-3xl">{product.name}</h1>
      <p className="mt-2 text-sm text-ink-soft">{product.shortDescription}</p>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        {product.rating > 0 && <Rating value={product.rating} count={product.reviewCount} />}
        <span className={cn('inline-flex items-center gap-1.5 text-xs font-semibold', stock.className)}>
          <PackageCheck size={14} /> {stock.text}
        </span>
      </div>

      <div className="mt-5 flex flex-wrap items-end justify-between gap-3 rounded-lg border border-line bg-mist p-4">
        <Price price={variant.price} oldPrice={variant.oldPrice} size="lg" />
        <p className="max-w-[12rem] text-right text-[11px] leading-snug text-ink-soft">
          Fiyata KDV dahildir. Demo katalog — gerçek ödeme alınmaz.
        </p>
      </div>

      <div className="mt-6 space-y-5">
        {volumes.some(Boolean) && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">Hacim</p>
          <div className="flex flex-wrap gap-2">
            {volumes.map((v) => {
              const available = isOptionAvailable(product, 'volume', v, sel);
              return (
                <button
                  key={v}
                  type="button"
                  aria-pressed={v === volume}
                  disabled={!available}
                  onClick={() => onVolume(v as VariantVolume)}
                  className={optionBtn(v === volume, available)}
                >
                  {v}
                </button>
              );
            })}
          </div>
        </div>
        )}

        {intensities.length > 1 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">Yoğunluk</p>
            <div className="flex flex-wrap gap-2">
              {intensities.map((it) => {
                const available = isOptionAvailable(product, 'intensity', it, sel);
                return (
                  <button
                    key={it}
                    type="button"
                    aria-pressed={it === intensity}
                    disabled={!available}
                    onClick={() => onIntensity(it as VariantIntensity)}
                    className={optionBtn(it === intensity, available)}
                  >
                    {it}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-ink-soft">
          <span>
            Ürün tipi: <span className="font-semibold text-ink">{variant.type}</span>
          </span>
          <span>
            SKU: <span className="font-mono text-ink">{variant.sku}</span>
          </span>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <QuantityStepper value={qty} onChange={onQty} max={Math.max(1, variant.stockCount || 99)} />
        <button
          type="button"
          onClick={handleAdd}
          disabled={soldOut}
          className="btn-primary h-12 flex-1 disabled:opacity-40"
        >
          {soldOut ? 'Stokta Yok' : `Sepete Ekle · ${currency(variant.price * qty)}`}
        </button>
        <FavoriteButton
          productId={product.id}
          productName={product.name}
          size={19}
          className="h-12 w-12 shrink-0 border border-line bg-white"
        />
      </div>
      <button
        type="button"
        onClick={handleBuyNow}
        disabled={soldOut}
        className="btn-dark mt-3 h-12 w-full disabled:opacity-40"
      >
        Hemen Al
      </button>

      <Link
        href="/iletisim?konu=urun"
        className="mt-4 flex items-center justify-center gap-2 text-sm font-semibold text-brand-500 hover:text-brand-600"
      >
        <MessageCircle size={16} /> Ürün hakkında soru sor
      </Link>

      <div className="mt-6 grid gap-3 border-t border-line pt-5 text-sm text-ink-soft sm:grid-cols-2">
        <div className="flex items-start gap-2.5">
          <Truck size={17} className="mt-0.5 shrink-0 text-ink-soft" />
          <span>{site.commerce.estimatedDelivery}</span>
        </div>
        <div className="flex items-start gap-2.5">
          <ShieldCheck size={17} className="mt-0.5 shrink-0 text-ink-soft" />
          <span>256bit SSL ile güvenli ödeme</span>
        </div>
        <div className="flex items-start gap-2.5">
          <RotateCcw size={17} className="mt-0.5 shrink-0 text-ink-soft" />
          <Link href="/iade-ve-teslimat" className="link-underline">
            {site.commerce.freeShippingThreshold} ₺ üzeri ücretsiz kargo · kolay iade
          </Link>
        </div>
        <div className="flex items-start gap-2.5">
          <PackageCheck size={17} className="mt-0.5 shrink-0 text-ink-soft" />
          <span>{site.commerce.securePackaging}</span>
        </div>
      </div>
    </div>
  );
}
