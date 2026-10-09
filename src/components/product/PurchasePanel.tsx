'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MessageCircle, ShieldCheck, Truck, RotateCcw, PackageCheck } from 'lucide-react';
import type { Product, ProductVariant } from '@/types';
import { Price } from '@/components/ui/Price';
import { Rating } from '@/components/ui/Rating';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { FavoriteButton } from './FavoriteButton';
import { stockLabel, type Selection } from '@/lib/commerce';
import { VariantOptions } from './VariantOptions';
import { CampaignBox, type ProductCampaign } from './CampaignBox';
import { useCart } from '@/store/cart';
import { useUI } from '@/store/ui';
import { toast } from '@/store/toast';
import { site, currency } from '@/lib/site';
import { useCategories } from '@/components/catalog/CatalogProvider';
import { cn } from '@/lib/utils';

interface Props {
  product: Product;
  variant: ProductVariant;
  selection: Selection;
  qty: number;
  onSelect: (next: Selection) => void;
  onQty: (n: number) => void;
  campaigns?: ProductCampaign[];
  renderedAt?: number;
}

export function PurchasePanel({ product, variant, selection, qty, onSelect, onQty, campaigns = [], renderedAt = 0 }: Props) {
  const router = useRouter();
  const add = useCart((s) => s.add);
  const openCart = useUI((s) => s.openCart);
  const categories = useCategories();
  const category = categories.find((c) => c.slug === product.category);
  const soldOut = variant.stock === 'out-of-stock';
  // Çok varyantlı üründe stok durumu seçili kombinasyonu izler.
  const stock = stockLabel[product.variants.length > 1 ? variant.stock : product.stockStatus];

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
      <h1 className="mt-1.5 text-2xl font-bold text-ink sm:text-3xl">
        {product.name}
        {variant.label && product.variants.length > 1 && (
          <span className="mt-1 block text-base font-semibold text-ink-soft sm:text-lg">{variant.label}</span>
        )}
      </h1>
      <p className="mt-2 text-sm text-ink-soft">{product.shortDescription}</p>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        {product.rating > 0 && <Rating value={product.rating} count={product.reviewCount} />}
        <span className={cn('inline-flex items-center gap-1.5 text-xs font-semibold', stock.className)}>
          <PackageCheck size={14} /> {stock.text}
        </span>
      </div>

      <div className="mt-5 flex flex-wrap items-end justify-between gap-3 rounded-lg border border-line bg-mist p-4">
        <div>
          <Price price={variant.price} oldPrice={variant.oldPrice} size="lg" />
        </div>
        <p className="max-w-[12rem] text-right text-[11px] leading-snug text-ink-soft">
          Fiyata KDV dahildir.
        </p>
      </div>

      <CampaignBox campaigns={campaigns} renderedAt={renderedAt} />

      <div className="mt-6 space-y-5">
        <VariantOptions product={product} selection={selection} onChange={onSelect} />

        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-ink-soft">
          <span>
            Ürün tipi: <span className="font-semibold text-ink">{variant.type}</span>
          </span>
          <span>
            SKU: <span className="font-mono text-ink">{variant.sku || '—'}</span>
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
