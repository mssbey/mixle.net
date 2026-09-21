'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import type { Product } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Price } from '@/components/ui/Price';
import { Rating } from '@/components/ui/Rating';
import { FlavorTag } from '@/components/ui/FlavorTag';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { uniqueOptions, resolveVariant, stockLabel } from '@/lib/commerce';
import { useCart } from '@/store/cart';
import { useUI } from '@/store/ui';
import { toast } from '@/store/toast';
import { currency } from '@/lib/site';
import { cn } from '@/lib/utils';

function QuickViewContent({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const add = useCart((s) => s.add);
  const openCart = useUI((s) => s.openCart);
  const [qty, setQty] = useState(1);
  const [volume, setVolume] = useState<string>();
  const [intensity, setIntensity] = useState<string>();

  const open = !!product;
  const options = product ? uniqueOptions(product) : { volumes: [], intensities: [], types: [] };
  const variant = product
    ? resolveVariant(product, {
        volume: volume ?? options.volumes[0],
        intensity: intensity ?? options.intensities[0],
      })
    : null;

  return (
    <Modal open={open} onClose={onClose} label="Hızlı ürün önizleme" className="max-w-3xl">
      {product && variant && (
        <div className="grid gap-0 sm:grid-cols-2">
          <div className="relative aspect-square bg-mist sm:rounded-l-lg">
            <Image
              src={variant.image || product.images[0].src}
              alt={product.name}
              fill
              sizes="(max-width:640px) 100vw, 384px"
              className="object-contain bg-white p-4 sm:rounded-l-lg"
            />
          </div>
          <div className="flex flex-col p-5 sm:p-6">
            <p className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">{product.series}</p>
            <h2 className="mt-1 text-xl font-bold text-ink">{product.name}</h2>
            <div className="mt-2">
              <Rating value={product.rating} count={product.reviewCount} size={14} />
            </div>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">{product.shortDescription}</p>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {product.flavorNotes.slice(0, 4).map((f) => (
                <FlavorTag key={f.label} profile={f.profile} label={f.label} />
              ))}
            </div>

            <div className="mt-4 space-y-3">
              {options.volumes.some(Boolean) && (
              <div>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">Hacim</p>
                <div className="flex flex-wrap gap-1.5">
                  {options.volumes.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setVolume(v)}
                      className={cn(
                        'rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors',
                        v === (volume ?? options.volumes[0])
                          ? 'border-brand-500 bg-brand-500 text-white'
                          : 'border-line text-ink hover:border-ink/30',
                      )}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              )}
              {options.intensities.length > 1 && (
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">Yoğunluk</p>
                  <div className="flex flex-wrap gap-1.5">
                    {options.intensities.map((it) => (
                      <button
                        key={it}
                        type="button"
                        onClick={() => setIntensity(it)}
                        className={cn(
                          'rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors',
                          it === (intensity ?? options.intensities[0])
                            ? 'border-brand-500 bg-brand-500 text-white'
                            : 'border-line text-ink hover:border-ink/30',
                        )}
                      >
                        {it}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <Price price={variant.price} oldPrice={variant.oldPrice} size="lg" />
              <span className={cn('text-xs font-semibold', stockLabel[product.stockStatus].className)}>
                {stockLabel[product.stockStatus].text}
              </span>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <QuantityStepper value={qty} onChange={setQty} max={Math.max(1, variant.stockCount || 99)} />
              <button
                type="button"
                disabled={variant.stock === 'out-of-stock'}
                onClick={() => {
                  add(product.id, variant.id, qty);
                  onClose();
                  openCart();
                  toast.success('Sepete eklendi', `${product.name} · ${qty} adet`);
                }}
                className="btn-primary flex-1"
              >
                Sepete ekle · {currency(variant.price * qty)}
              </button>
            </div>

            <Link
              href={`/urun/${product.slug}`}
              onClick={onClose}
              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-500 link-underline"
            >
              Ürün detayına git <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}
    </Modal>
  );
}

export function QuickView(props: { product: Product | null; onClose: () => void }) { return <QuickViewContent key={props.product?.id ?? "closed"} {...props} />; }
