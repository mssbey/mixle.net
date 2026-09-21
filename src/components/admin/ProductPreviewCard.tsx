'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { Check, Copy, ExternalLink, Eye, Link2, TriangleAlert } from 'lucide-react';
import type { AdminProduct } from '@/types/admin';
import type { BadgeKind } from '@/types';
import { statusLabels } from '@/types/admin';
import { site } from '@/lib/site';
import { formatMinor } from '@/lib/money';
import { priceRangeOf } from '@/lib/admin/variants';
import { catalogPhotos, productArtwork } from '@/lib/storefront-images';
import { openInStorefrontPath, storefrontPath } from '@/lib/admin/preview';
import { toast } from '@/store/toast';
import { StatusBadge } from './primitives';

const BADGE_LABELS: Record<BadgeKind, string> = {
  yeni: 'Yeni',
  'cok-satan': 'Çok satan',
  'sinirli-seri': 'Sınırlı seri',
  indirim: 'İndirim',
};

interface Props {
  /** Formdaki canlı değerler — kart bunları yansıtır. */
  product: AdminProduct;
  /** Son kayıtlı hâl — bağlantılar bununla kurulur. Yeni (henüz oluşturulmamış) üründe null. */
  saved: AdminProduct | null;
  /** Formda kaydedilmemiş değişiklik var mı — vitrin yalnızca kayıtlı veriyi gösterir. */
  dirty: boolean;
}

/**
 * Sağ paneldeki "Vitrin önizlemesi" kartı.
 *
 * Üst kısım formdaki değerleri CANLI yansıtan bir vitrin kartı taklidi
 * (görsel, ad, fiyat, rozetler, stok). Alt kısım ise gerçek sayfaya giden
 * bağlantı: yayındaki ürün doğrudan açılır, taslak/arşiv ürün Draft Mode
 * çerezi ile açılır (bkz. src/lib/admin/preview.ts).
 */
export function ProductPreviewCard({ product, saved, dirty }: Props) {
  const [copied, setCopied] = useState(false);

  const unsaved = saved === null;
  const target = saved ?? product;
  const live = target.status === 'yayında';
  const slugReady = target.slug.trim().length > 0;
  const canOpen = !unsaved && slugReady;

  const host = useMemo(() => {
    try {
      return new URL(site.domain).host;
    } catch {
      return 'mixle.net';
    }
  }, []);
  const path = storefrontPath(target.slug || product.slug || 'urun-adi');
  const displayUrl = `${host}${decodeURIComponent(path)}`;
  const href = openInStorefrontPath(target.slug, target.status);

  const image = catalogPhotos(product.images)[0]?.src || productArtwork(product);
  const activeVariants = product.variants.filter((v) => v.isActive);
  const pool = activeVariants.length ? activeVariants : product.variants;
  const range = priceRangeOf(product.variants);
  const stock = pool.reduce((s, v) => s + Math.max(0, v.stock), 0);
  const compareAt = pool
    .map((v) => v.compareAtPriceMinor)
    .filter((c): c is number => typeof c === 'number' && c > range.min);
  const strike = compareAt.length ? Math.min(...compareAt) : null;

  const copy = async () => {
    const absolute = `${site.domain.replace(/\/$/, '')}${path}`;
    try {
      await navigator.clipboard.writeText(absolute);
      setCopied(true);
      toast.success('Bağlantı kopyalandı', absolute);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error('Kopyalanamadı', absolute);
    }
  };

  return (
    <section className="admin-card admin-preview" aria-labelledby="preview-title">
      <header className="flex items-center justify-between gap-2 px-4 pt-4">
        <h2 id="preview-title" className="text-sm font-semibold text-[var(--brand-purple-deep)]">
          Vitrin önizlemesi
        </h2>
        <StatusBadge status={product.status} />
      </header>

      {/* Canlı vitrin kartı taklidi */}
      <div className="px-4 pt-3">
        <div className="admin-preview-card">
          <div className="admin-preview-media">
            {image ? (
              <Image src={image} alt="" fill sizes="288px" className="object-cover" unoptimized />
            ) : null}
            {product.badges.length > 0 && (
              <div className="absolute left-2 top-2 flex flex-wrap gap-1">
                {product.badges.map((b) => (
                  <span key={b} className="admin-preview-badge">
                    {BADGE_LABELS[b]}
                  </span>
                ))}
              </div>
            )}
            {stock <= 0 && <span className="admin-preview-soldout">Tükendi</span>}
          </div>
          <div className="px-3 pb-3 pt-2.5">
            {product.series ? (
              <p className="truncate text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--admin-ink-soft)]">
                {product.series}
              </p>
            ) : null}
            <p className="mt-0.5 line-clamp-2 text-[13.5px] font-semibold leading-snug text-[var(--ink)]">
              {product.name || <span className="text-[var(--admin-ink-soft)]">Ürün adı</span>}
            </p>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-[14px] font-bold tabular-nums text-[var(--brand-red)]">
                {range.min === 0 && range.max === 0
                  ? '—'
                  : range.min === range.max
                    ? formatMinor(range.min)
                    : `${formatMinor(range.min)} – ${formatMinor(range.max)}`}
              </span>
              {strike !== null && (
                <span className="text-[11.5px] tabular-nums text-[var(--admin-ink-soft)] line-through">
                  {formatMinor(strike)}
                </span>
              )}
            </div>
            <p className="mt-1 text-[11px] text-[var(--admin-ink-soft)]">
              {pool.length} varyant · {stock > 0 ? `${stock} adet stok` : 'stok yok'}
            </p>
          </div>
        </div>
        <p className="admin-hint mt-1.5">
          Kart, formdaki değerleri anlık yansıtır; vitrin sayfası son kayıtlı hâli gösterir.
        </p>
      </div>

      {/* Adres + eylemler */}
      <div className="mt-3 border-t border-[var(--admin-line)] px-4 pb-4 pt-3">
        <div className="admin-preview-url">
          <Link2 size={13} className="shrink-0 text-[var(--admin-ink-soft)]" />
          <span className="min-w-0 flex-1 truncate font-mono text-[12px]" title={displayUrl}>
            {displayUrl}
          </span>
          <button
            type="button"
            className="admin-preview-iconbtn"
            onClick={copy}
            disabled={!slugReady}
            aria-label="Bağlantıyı kopyala"
            title="Bağlantıyı kopyala"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
          </button>
        </div>

        {unsaved ? (
          <p className="admin-hint mt-2">Önizleme için önce ürünü oluşturun.</p>
        ) : dirty ? (
          <p className="admin-preview-note" role="status">
            <TriangleAlert size={13} className="mt-[1px] shrink-0" />
            Kaydedilmemiş değişiklikler var — vitrinde son kayıtlı hâl açılır.
          </p>
        ) : !live ? (
          <p className="admin-hint mt-2">
            Ürün {statusLabels[target.status].toLocaleLowerCase('tr-TR')} durumunda; önizleme
            yalnızca sizin tarayıcınızda açılır, müşteriler bu adresi göremez.
          </p>
        ) : null}

        <a
          href={canOpen ? href : undefined}
          target="_blank"
          rel="noopener noreferrer"
          className="admin-btn admin-btn-primary mt-3 w-full"
          aria-disabled={!canOpen}
          onClick={(e) => {
            if (!canOpen) e.preventDefault();
          }}
        >
          {live ? (
            <>
              <ExternalLink size={14} /> Vitrinde aç
            </>
          ) : (
            <>
              <Eye size={14} /> Taslağı önizle
            </>
          )}
        </a>
      </div>
    </section>
  );
}
