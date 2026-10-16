'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { SlidersHorizontal, LayoutGrid, List, ChevronDown, PackageSearch } from 'lucide-react';
import type { Product } from '@/types';
import { applyFilters, defaultFilters, sortOptions, type FilterState } from '@/lib/filters';
import { parseFilters, filtersToParams, countActive } from '@/lib/filter-url';
import { FilterPanel } from './FilterPanel';
import { ActiveFilterChips } from './ActiveFilterChips';
import { ProductGrid } from '@/components/product/ProductGrid';
import { ProductCard } from '@/components/product/ProductCard';
import { ProductGridSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Drawer } from '@/components/ui/Drawer';
import { Pagination } from '@/components/ui/Pagination';
import { cn } from '@/lib/utils';
import { sortVolumeLabels } from '@/lib/commerce';

/** Sayfa başına ürün; fazlası numaralı sayfalara bölünür (`?sayfa=2`). */
const PAGE_SIZE = 100;

export function ProductBrowser({
  baseProducts,
  lockCategory = false,
  emptyTitle = 'Ürün bulunamadı',
  emptyDescription = 'Filtreleri değiştirerek tekrar deneyin.',
}: {
  baseProducts: Product[];
  lockCategory?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const priceMin = useMemo(() => Math.min(...baseProducts.flatMap((p) => p.variants.map((v) => v.price)), 0), [baseProducts]);
  const priceMax = useMemo(() => Math.max(...baseProducts.flatMap((p) => p.variants.map((v) => v.price)), 100), [baseProducts]);

  const [filters, setFilters] = useState<FilterState>(() =>
    parseFilters(searchParams, priceMin, priceMax),
  );
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    setFilters(parseFilters(searchParams, priceMin, priceMax));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const set = useCallback(
    (patch: Partial<FilterState>) => {
      setLoading(true);
      const next = { ...filters, ...patch };
      setFilters(next);
      const params = new URLSearchParams(filtersToParams(next, priceMin, priceMax));
      const query = searchParams.get("q");
      if (query) params.set("q", query);
      const qs = params.size ? "?" + params.toString() : "";
      router.replace(`${pathname}${qs}`, { scroll: false });
      window.setTimeout(() => setLoading(false), 260);
    },
    [filters, pathname, priceMin, priceMax, router, searchParams],
  );

  const clear = () => set(defaultFilters(priceMin, priceMax));

  const seriesOptions = useMemo(() => Array.from(new Set(baseProducts.map((p) => p.series))).sort(), [baseProducts]);
  const subcategoryOptions = useMemo(
    () => Array.from(new Set(baseProducts.map((p) => p.subcategory))).sort((a, b) => a.localeCompare(b, 'tr')),
    [baseProducts],
  );
  const volumeOptions = useMemo(
    () => sortVolumeLabels(Array.from(new Set(baseProducts.flatMap((p) => p.variants.map((v) => v.volume)).filter(Boolean)))),
    [baseProducts],
  );

  const filtered = useMemo(() => applyFilters(baseProducts, filters), [baseProducts, filters]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const requestedPage = Number(searchParams.get('sayfa')) || 1;
  const page = Math.min(Math.max(1, Math.floor(requestedPage)), pageCount);
  const shown = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const listTop = useRef<HTMLDivElement>(null);

  // Filtre değişince `set` adresi `sayfa` olmadan yeniden kurar → 1. sayfaya döner.
  const goToPage = (next: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next <= 1) params.delete('sayfa');
    else params.set('sayfa', String(next));
    const qs = params.size ? '?' + params.toString() : '';
    router.push(`${pathname}${qs}`, { scroll: false });
    listTop.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const activeCount = countActive(filters, priceMin, priceMax);

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[240px_1fr]">
      <aside className="hidden lg:block">
        <div className="sticky top-[calc(var(--header-h-scrolled)+16px)] max-h-[calc(100vh-var(--header-h-scrolled)-32px)] overflow-y-auto rounded-lg border border-line bg-white p-5">
          <FilterPanel
            filters={filters}
            set={set}
            priceMin={priceMin}
            priceMax={priceMax}
            seriesOptions={seriesOptions}
            subcategoryOptions={subcategoryOptions}
            volumeOptions={volumeOptions}
            lockCategory={lockCategory}
          />
        </div>
      </aside>

      <div ref={listTop} className="min-w-0 scroll-mt-[calc(var(--header-h-scrolled)+16px)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
          <p aria-live="polite" className="text-sm text-ink-soft">
            <strong className="text-ink">{filtered.length}</strong> ürün bulundu
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="btn-ghost px-3 py-2 text-xs lg:hidden"
            >
              <SlidersHorizontal size={14} /> Filtrele
              {activeCount > 0 && (
                <span className="ml-0.5 grid h-4 w-4 place-items-center rounded-full bg-brand-500 text-[10px] text-white">
                  {activeCount}
                </span>
              )}
            </button>

            <div className="relative">
              <select
                value={filters.sort}
                onChange={(e) => set({ sort: e.target.value as FilterState['sort'] })}
                aria-label="Sıralama"
                className="appearance-none rounded-md border border-line bg-white py-2 pl-3 pr-8 text-xs font-medium text-ink outline-none focus:border-brand-400"
              >
                {sortOptions.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-purple-400" />
            </div>

            <div className="hidden items-center gap-1 rounded-md border border-line p-1 sm:flex">
              <button
                type="button"
                onClick={() => setView('grid')}
                aria-label="Izgara görünümü"
                aria-pressed={view === 'grid'}
                className={cn('grid h-7 w-7 place-items-center rounded', view === 'grid' ? 'bg-brand-500 text-white' : 'text-ink-soft')}
              >
                <LayoutGrid size={14} />
              </button>
              <button
                type="button"
                onClick={() => setView('list')}
                aria-label="Liste görünümü"
                aria-pressed={view === 'list'}
                className={cn('grid h-7 w-7 place-items-center rounded', view === 'list' ? 'bg-brand-500 text-white' : 'text-ink-soft')}
              >
                <List size={14} />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <ActiveFilterChips filters={filters} set={set} clear={clear} priceMin={priceMin} priceMax={priceMax} />
        </div>

        <div className="mt-6">
          {loading ? (
            <ProductGridSkeleton count={8} />
          ) : shown.length === 0 ? (
            <EmptyState
              icon={PackageSearch}
              title={emptyTitle}
              description={emptyDescription}
              action={
                <button type="button" onClick={clear} className="btn-primary">
                  Filtreleri temizle
                </button>
              }
            />
          ) : view === 'grid' ? (
            <ProductGrid products={shown} columns={4} />
          ) : (
            <div className="space-y-4">
              {shown.map((p) => (
                <div key={p.id} className="product-list-item">
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          )}
        </div>

        {!loading && <Pagination page={page} pageCount={pageCount} onChange={goToPage} className="mt-10" />}
      </div>

      <Drawer open={sheetOpen} onClose={() => setSheetOpen(false)} label="Filtreler" side="bottom" title="Filtreler">
        <div className="overflow-y-auto px-5 pb-4">
          <FilterPanel
            filters={filters}
            set={set}
            priceMin={priceMin}
            priceMax={priceMax}
            seriesOptions={seriesOptions}
            subcategoryOptions={subcategoryOptions}
            volumeOptions={volumeOptions}
            lockCategory={lockCategory}
          />
        </div>
        <div className="border-t border-line p-4">
          <button type="button" onClick={() => setSheetOpen(false)} className="btn-primary w-full">
            {filtered.length} ürünü göster
          </button>
        </div>
      </Drawer>
    </div>
  );
}
