'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, m } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import type { FlavorProfile } from '@/types';
import { flavorMeta } from '@/components/ui/FlavorTag';
import { ProductCard } from '@/components/product/ProductCard';
import { QuickView } from '@/components/product/QuickView';
import { SectionHeading } from '@/components/ui/Reveal';
import type { Product } from '@/types';
import { cn } from '@/lib/utils';

const order: FlavorProfile[] = ['meyveli', 'ferah', 'tatli', 'eksi', 'kremsi', 'tutun', 'icecek', 'mentollu'];

export function FlavorExplorer({ products }: { products: Product[] }) {
  const [active, setActive] = useState<FlavorProfile>('meyveli');
  const [quick, setQuick] = useState<Product | null>(null);

  const shown = useMemo(
    () =>
      products
        .filter((p) => p.flavorProfiles.includes(active))
        .sort((a, b) => Number(b.featured) - Number(a.featured))
        .slice(0, 4),
    [active, products],
  );

  return (
    <section className="section surface-lavender">
      <div className="container-page">
        <SectionHeading
          eyebrow="Tat Profiline Göre Keşif"
          title="Bugün hangi tada yakınsın?"
          description="Bir profil seç; sana en uygun aromaları anında öne çıkaralım."
        />

        <div className="mt-8 flex flex-wrap gap-2">
          {order.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setActive(p)}
              aria-pressed={active === p}
              className={cn(
                'flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all',
                active === p
                  ? 'border-purple-600 bg-purple-600 text-cream shadow-soft'
                  : 'border-purple-200 bg-white text-purple-700 hover:border-purple-400',
              )}
            >
              <span className={cn('h-2 w-2 rounded-full', flavorMeta[p].dot)} />
              {flavorMeta[p].label}
            </button>
          ))}
        </div>

        <div className="mt-8 min-h-[360px]">
          <AnimatePresence mode="wait">
            <m.div
              key={active}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4"
            >
              {shown.map((p) => (
                <ProductCard key={p.id} product={p} onQuickView={setQuick} />
              ))}
            </m.div>
          </AnimatePresence>
        </div>

        <div className="mt-6">
          <Link
            href={`/urunler?profil=${active}`}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-purple-700 link-underline"
          >
            {flavorMeta[active].label} aromaların tümünü gör <ArrowRight size={15} />
          </Link>
        </div>
      </div>

      <QuickView product={quick} onClose={() => setQuick(null)} />
    </section>
  );
}
