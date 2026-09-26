import type { FilterState, SortKey } from '@/lib/filters';
import { defaultFilters } from '@/lib/filters';
import type { FlavorProfile } from '@/types';
import { flavorProfileIdSchema } from '@/lib/flavor-profiles';

const LIST_KEYS: (keyof FilterState)[] = ['categories', 'subcategories', 'series', 'profiles', 'forms', 'volumes'];
const BOOL_KEYS: (keyof FilterState)[] = ['inStockOnly', 'onSaleOnly', 'newOnly', 'bestSellerOnly'];

const PARAM: Record<string, keyof FilterState> = {
  kategori: 'categories',
  alt: 'subcategories',
  seri: 'series',
  profil: 'profiles',
  form: 'forms',
  hacim: 'volumes',
  stok: 'inStockOnly',
  indirim: 'onSaleOnly',
  yeni: 'newOnly',
  cok: 'bestSellerOnly',
  sirala: 'sort',
};
const REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(PARAM).map(([k, v]) => [v, k]),
);

export function parseFilters(
  params: URLSearchParams,
  priceMin: number,
  priceMax: number,
): FilterState {
  const f = defaultFilters(priceMin, priceMax);

  for (const [param, key] of Object.entries(PARAM)) {
    const raw = params.get(param);
    if (!raw) continue;
    if (LIST_KEYS.includes(key)) {
      (f[key] as string[]) = raw.split(',').filter(Boolean);
    } else if (BOOL_KEYS.includes(key)) {
      (f[key] as boolean) = raw === '1';
    } else if (key === 'sort') {
      f.sort = raw as SortKey;
    }
  }

  const fresh = params.get('ferahlik');
  if (fresh) {
    const [a, b] = fresh.split('-').map(Number);
    if (!Number.isNaN(a) && !Number.isNaN(b)) f.freshness = [a, b];
  }
  const sweet = params.get('tatlilik');
  if (sweet) {
    const [a, b] = sweet.split('-').map(Number);
    if (!Number.isNaN(a) && !Number.isNaN(b)) f.sweetness = [a, b];
  }
  const price = params.get('fiyat');
  if (price) {
    const [a, b] = price.split('-').map(Number);
    if (!Number.isNaN(a) && !Number.isNaN(b)) f.price = [a, b];
  }
  return f;
}

export function filtersToParams(f: FilterState, priceMin: number, priceMax: number): string {
  const sp = new URLSearchParams();

  for (const key of LIST_KEYS) {
    const arr = f[key] as string[];
    if (arr.length) sp.set(REVERSE[key], arr.join(','));
  }
  for (const key of BOOL_KEYS) {
    if (f[key]) sp.set(REVERSE[key], '1');
  }
  if (f.sort !== 'onerilen') sp.set('sirala', f.sort);
  if (f.freshness[0] !== 0 || f.freshness[1] !== 10) sp.set('ferahlik', f.freshness.join('-'));
  if (f.sweetness[0] !== 0 || f.sweetness[1] !== 10) sp.set('tatlilik', f.sweetness.join('-'));
  if (f.price[0] !== priceMin || f.price[1] !== priceMax) sp.set('fiyat', f.price.join('-'));

  const s = sp.toString();
  return s ? `?${s}` : '';
}

export function countActive(f: FilterState, priceMin: number, priceMax: number): number {
  let c = 0;
  for (const key of LIST_KEYS) c += (f[key] as string[]).length;
  for (const key of BOOL_KEYS) if (f[key]) c += 1;
  if (f.freshness[0] !== 0 || f.freshness[1] !== 10) c += 1;
  if (f.sweetness[0] !== 0 || f.sweetness[1] !== 10) c += 1;
  if (f.price[0] !== priceMin || f.price[1] !== priceMax) c += 1;
  return c;
}

export const profileFromParam = (v: string): FlavorProfile | null =>
  flavorProfileIdSchema.safeParse(v).success ? v : null;
