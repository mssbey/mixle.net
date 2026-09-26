'use client';

import { X } from 'lucide-react';
import type { FilterState } from '@/lib/filters';
import { formLabels } from '@/lib/filters';
import { flavorProfileLabel } from '@/lib/flavor-profiles';
import { useCategories, useFlavorProfiles } from '@/components/catalog/CatalogProvider';
import { currency } from '@/lib/site';

interface Props {
  filters: FilterState;
  set: (patch: Partial<FilterState>) => void;
  clear: () => void;
  priceMin: number;
  priceMax: number;
}

export function ActiveFilterChips({ filters, set, clear, priceMin, priceMax }: Props) {
  const categories = useCategories();
  const flavorProfiles = useFlavorProfiles();
  const chips: { label: string; onRemove: () => void }[] = [];

  filters.categories.forEach((c) =>
    chips.push({
      label: categories.find((x) => x.slug === c)?.name ?? c,
      onRemove: () => set({ categories: filters.categories.filter((x) => x !== c) }),
    }),
  );
  filters.subcategories.forEach((s) =>
    chips.push({ label: s, onRemove: () => set({ subcategories: filters.subcategories.filter((x) => x !== s) }) }),
  );
  filters.series.forEach((s) =>
    chips.push({ label: s, onRemove: () => set({ series: filters.series.filter((x) => x !== s) }) }),
  );
  filters.profiles.forEach((p) =>
    chips.push({
      label: flavorProfileLabel(flavorProfiles, p),
      onRemove: () => set({ profiles: filters.profiles.filter((x) => x !== p) }),
    }),
  );
  filters.forms.forEach((f) =>
    chips.push({ label: formLabels[f], onRemove: () => set({ forms: filters.forms.filter((x) => x !== f) }) }),
  );
  filters.volumes.forEach((v) =>
    chips.push({ label: v, onRemove: () => set({ volumes: filters.volumes.filter((x) => x !== v) }) }),
  );
  if (filters.inStockOnly) chips.push({ label: 'Stokta', onRemove: () => set({ inStockOnly: false }) });
  if (filters.onSaleOnly) chips.push({ label: 'İndirimli', onRemove: () => set({ onSaleOnly: false }) });
  if (filters.newOnly) chips.push({ label: 'Yeni', onRemove: () => set({ newOnly: false }) });
  if (filters.bestSellerOnly) chips.push({ label: 'Çok satan', onRemove: () => set({ bestSellerOnly: false }) });
  if (filters.price[0] !== priceMin || filters.price[1] !== priceMax)
    chips.push({
      label: `${currency(filters.price[0])} – ${currency(filters.price[1])}`,
      onRemove: () => set({ price: [priceMin, priceMax] }),
    });
  if (filters.freshness[0] !== 0 || filters.freshness[1] !== 10)
    chips.push({ label: `Ferahlık ${filters.freshness[0]}–${filters.freshness[1]}`, onRemove: () => set({ freshness: [0, 10] }) });
  if (filters.sweetness[0] !== 0 || filters.sweetness[1] !== 10)
    chips.push({ label: `Tatlılık ${filters.sweetness[0]}–${filters.sweetness[1]}`, onRemove: () => set({ sweetness: [0, 10] }) });

  if (!chips.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((c, i) => (
        <button
          key={i}
          type="button"
          onClick={c.onRemove}
          className="chip gap-1.5 hover:border-brand-300 hover:text-brand-600"
        >
          {c.label}
          <X size={12} />
        </button>
      ))}
      <button type="button" onClick={clear} className="text-xs font-semibold text-brand-500 underline hover:text-brand-600">
        Filtreleri temizle
      </button>
    </div>
  );
}
