'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { FilterState } from '@/lib/filters';
import { profileLabels, formLabels } from '@/lib/filters';
import { RangeSlider } from '@/components/ui/RangeSlider';
import { useCategories } from '@/components/catalog/CatalogProvider';
import { currency } from '@/lib/site';
import { cn } from '@/lib/utils';
import type { FlavorProfile } from '@/types';

interface Props {
  filters: FilterState;
  set: (patch: Partial<FilterState>) => void;
  priceMin: number;
  priceMax: number;
  seriesOptions: string[];
  subcategoryOptions: string[];
  volumeOptions: string[];
  lockCategory?: boolean;
}

function Group({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-line py-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between text-sm font-semibold text-ink"
      >
        {title}
        <ChevronDown size={16} className={cn('text-ink-soft transition-transform', open && 'rotate-180')} />
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

function CheckRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 py-1.5 text-sm text-ink-soft hover:text-ink">
      <span
        className={cn(
          'grid h-4 w-4 shrink-0 place-items-center rounded border transition-colors',
          checked ? 'border-brand-500 bg-brand-500 text-white' : 'border-line bg-white',
        )}
      >
        {checked && (
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
            <path d="M2 6.5L4.7 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      {label}
    </label>
  );
}

const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

export function FilterPanel({
  filters,
  set,
  priceMin,
  priceMax,
  seriesOptions,
  subcategoryOptions,
  volumeOptions,
  lockCategory,
}: Props) {
  const categories = useCategories();

  return (
    <div>
      <Group title="Hızlı filtreler">
        <div className="space-y-0.5">
          <CheckRow label="Sadece stokta olanlar" checked={filters.inStockOnly} onChange={() => set({ inStockOnly: !filters.inStockOnly })} />
          <CheckRow label="İndirimli ürünler" checked={filters.onSaleOnly} onChange={() => set({ onSaleOnly: !filters.onSaleOnly })} />
          <CheckRow label="Yeni gelenler" checked={filters.newOnly} onChange={() => set({ newOnly: !filters.newOnly })} />
          <CheckRow label="Çok satanlar" checked={filters.bestSellerOnly} onChange={() => set({ bestSellerOnly: !filters.bestSellerOnly })} />
        </div>
      </Group>

      {!lockCategory && (
        <Group title="Kategori">
          <div className="space-y-0.5">
            {categories.map((c) => (
              <CheckRow
                key={c.slug}
                label={c.name}
                checked={filters.categories.includes(c.slug)}
                onChange={() => set({ categories: toggle(filters.categories, c.slug) })}
              />
            ))}
          </div>
        </Group>
      )}

      {subcategoryOptions.length > 1 && (
        <Group title="Alt kategori" defaultOpen={false}>
          <div className="space-y-0.5">
            {subcategoryOptions.map((s) => (
              <CheckRow
                key={s}
                label={s}
                checked={filters.subcategories.includes(s)}
                onChange={() => set({ subcategories: toggle(filters.subcategories, s) })}
              />
            ))}
          </div>
        </Group>
      )}

      <Group title="Tat profili">
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(profileLabels) as FlavorProfile[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => set({ profiles: toggle(filters.profiles as string[], p) as FlavorProfile[] })}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                filters.profiles.includes(p)
                  ? 'border-brand-500 bg-brand-500 text-white'
                  : 'border-line text-ink hover:border-ink/30',
              )}
            >
              {profileLabels[p]}
            </button>
          ))}
        </div>
      </Group>

      <Group title="Ürün formu" defaultOpen={false}>
        <div className="space-y-0.5">
          {Object.entries(formLabels).map(([k, label]) => (
            <CheckRow
              key={k}
              label={label}
              checked={filters.forms.includes(k)}
              onChange={() => set({ forms: toggle(filters.forms, k) })}
            />
          ))}
        </div>
      </Group>

      <Group title="Hacim" defaultOpen={false}>
        <div className="flex flex-wrap gap-1.5">
          {volumeOptions.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => set({ volumes: toggle(filters.volumes, v) })}
              className={cn(
                'rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors',
                filters.volumes.includes(v)
                  ? 'border-brand-500 bg-brand-500 text-white'
                  : 'border-line text-ink hover:border-ink/30',
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </Group>

      {seriesOptions.length > 1 && (
        <Group title="Seri" defaultOpen={false}>
          <div className="space-y-0.5">
            {seriesOptions.map((s) => (
              <CheckRow
                key={s}
                label={s}
                checked={filters.series.includes(s)}
                onChange={() => set({ series: toggle(filters.series, s) })}
              />
            ))}
          </div>
        </Group>
      )}

      <Group title="Fiyat aralığı">
        <RangeSlider
          label="Fiyat"
          min={priceMin}
          max={priceMax}
          step={5}
          value={filters.price}
          onChange={(v) => set({ price: v })}
          format={(n) => currency(n)}
        />
      </Group>

      <Group title="Ferahlık seviyesi" defaultOpen={false}>
        <RangeSlider label="Ferahlık" min={0} max={10} value={filters.freshness} onChange={(v) => set({ freshness: v })} />
      </Group>

      <Group title="Tatlılık seviyesi" defaultOpen={false}>
        <RangeSlider label="Tatlılık" min={0} max={10} value={filters.sweetness} onChange={(v) => set({ sweetness: v })} />
      </Group>
    </div>
  );
}
