'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Gösterilecek sayfa numaraları; aradaki boşluklar `null` (…) olur. */
function pageItems(page: number, pageCount: number): (number | null)[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);
  const items: (number | null)[] = [1];
  const from = Math.max(2, page - 1);
  const to = Math.min(pageCount - 1, page + 1);
  if (from > 2) items.push(null);
  for (let i = from; i <= to; i++) items.push(i);
  if (to < pageCount - 1) items.push(null);
  items.push(pageCount);
  return items;
}

const cell = 'grid h-6 min-w-6 place-items-center rounded-sm px-1 text-xs font-semibold tabular-nums';

export function Pagination({
  page,
  pageCount,
  onChange,
  className,
}: {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
  className?: string;
}) {
  if (pageCount <= 1) return null;
  return (
    <nav aria-label="Sayfalar" className={cn('flex items-center justify-center gap-1.5', className)}>
      {page > 1 && (
        <button type="button" onClick={() => onChange(page - 1)} aria-label="Önceki sayfa" className={cn(cell, 'text-ink hover:text-brand-600')}>
          <ChevronLeft size={14} />
        </button>
      )}
      {pageItems(page, pageCount).map((n, i) =>
        n == null ? (
          <span key={`gap-${i}`} className={cn(cell, 'text-ink-soft')}>
            …
          </span>
        ) : (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-label={`${n}. sayfa`}
            aria-current={n === page ? 'page' : undefined}
            className={cn(cell, n === page ? 'bg-brand-500 text-white' : 'text-ink hover:text-brand-600')}
          >
            {n}
          </button>
        ),
      )}
      {page < pageCount && (
        <button type="button" onClick={() => onChange(page + 1)} aria-label="Sonraki sayfa" className={cn(cell, 'text-ink hover:text-brand-600')}>
          <ChevronRight size={14} />
        </button>
      )}
    </nav>
  );
}
