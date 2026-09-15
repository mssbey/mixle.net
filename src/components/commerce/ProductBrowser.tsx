'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { SlidersHorizontal, LayoutGrid, List, ChevronDown, PackageSearch } from 'lucide-react';
import type { Product } from '@/types';
import { applyFilters, defaultFilters, sortOptions, type FilterState } from '@/lib/filters';
import { parseFilters, filtersToParams, countActive } from '@/lib/filter-url';
import { FilterPanel } from './FilterPanel';
import { ActiveFilterChips } from './ActiveFilterChips';
import { ProductGrid } from '@/components/product/ProductGrid';
import { ProductCard } from '@/components/product/ProductCard';
import { QuickView } from '@/components/product/QuickView';
import { ProductGridSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Drawer } from '@/components/ui/Drawer';
import { cn } from '@/lib/utils';
import { sortVolumeLabels } from '@/lib/commerce';

const PAGE_SIZE = 12;

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
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [quick, setQuick] = useState<Product | null>(null);

  useEffect(() => {
    setFilters(parseFilters(searchParams, priceMin, priceMax));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const set = useCallback(
    (patch: Partial<FilterState>) => {
      setLoading(true);
      const next = { ...filters, ...patch };
      setFilters(next);
      setVisible(PAGE_SIZE);
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
  const shown = filtered.slice(0, visible);
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

      <div className="min-w-0">
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
                  <ProductCard product={p} onQuickView={setQuick} />
                </div>
              ))}
            </div>
          )}
        </div>

        {!loading && visible < filtered.length && (
          <div className="mt-10 text-center">
            <button type="button" onClick={() => setVisible((v) => v + PAGE_SIZE)} className="btn-ghost">
              Daha Fazla Göster ({filtered.length - visible})
            </button>
          </div>
        )}
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

      <QuickView product={quick} onClose={() => setQuick(null)} />
    </div>
  );
}
