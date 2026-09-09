'use client';

import { useState } from 'react';
import type { Product } from '@/types';
import { ProductCard } from './ProductCard';
import { QuickView } from './QuickView';
import { Reveal } from '@/components/ui/Reveal';
import { cn } from '@/lib/utils';

export function ProductGrid({
  products,
  className,
  columns = 5,
  reveal = true,
  priorityCount = 0,
}: {
  products: Product[];
  className?: string;
  columns?: 3 | 4 | 5;
  reveal?: boolean;
  priorityCount?: number;
}) {
  const [quick, setQuick] = useState<Product | null>(null);

  const colClass =
    columns === 3
      ? 'grid-cols-2 md:grid-cols-3'
      : columns === 4
        ? 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4'
        : 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5';

  return (
    <>
      <div className={cn('grid gap-3 sm:gap-4', colClass, className)}>
        {products.map((p, i) => {
          const card = (
            <ProductCard
              product={p}
              onQuickView={setQuick}
              priority={i < priorityCount}
            />
          );
          return reveal ? (
            <Reveal key={p.id} delay={Math.min(i, 7) * 0.04} className="h-full">
              {card}
            </Reveal>
          ) : (
            <div key={p.id} className="h-full">
              {card}
            </div>
          );
        })}
      </div>
      <QuickView product={quick} onClose={() => setQuick(null)} />
    </>
  );
}
