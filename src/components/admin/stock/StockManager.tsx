'use client';

// Panel > Stok Yönetimi: tüm ürünler Excel tablosu gibi tek ekranda.
// SKU, fiyat, stok, stok takibi / durumu, KDV, kargo sınıfı ve ağırlık
// hücrelerin üzerinden düzenlenir; "Tüm değişiklikleri kaydet" hepsini tek
// seferde yazar. Stok hücresine "40" (40 yap), "+20" (20 ekle) ya da "-5"
// (5 düş) yazılabilir.
//
// Veri her açılışta sunucudan taze okunur — ekrandaki stok sitenin sattığı
// stokla aynıdır. Fiyat doğrudan satış fiyatı olur; üstü çizili / indirimli
// fiyat oluşturulmaz.

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  History,
  ImageOff,
  Percent,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Upload,
  X,
} from 'lucide-react';
import { useAdminData } from '@/components/admin/AdminDataProvider';
import { EmptyState, TableSkeleton } from '@/components/admin/primitives';
import { UnsavedGuard } from '@/components/admin/UnsavedGuard';
import { PriceAdjustDialog } from '@/components/admin/PriceAdjustDialog';
import { categoryTree } from '@/lib/admin/mutations';
import { withDescendants } from '@/lib/admin/pricing';
import { stockManagerApi } from '@/lib/admin/stock-client';
import {
  applyStockExpr,
  buildStockCsv,
  isAvailable,
  parseStockExpr,
  type ManagerData,
  type ManagerProduct,
  type ManagerVariant,
  type ProductChange,
  type VariantChange,
} from '@/lib/admin/stock-manager';
import { ApiError } from '@/lib/admin/client';
import { formatMinor, minorToInput, parseMajorInput } from '@/lib/money';
import { catalogPhotos } from '@/lib/storefront-images';
import { toast } from '@/store/toast';
import { StockHistoryDialog } from './StockHistoryDialog';
import { StockCsvImportDialog } from './StockCsvImportDialog';

// ------------------------------------------------------------- taslaklar ---

interface VariantDraft {
  sku?: string;
  price?: string;
  stock?: string;
  trackStock?: boolean;
  inStock?: boolean;
  weight?: string;
}
interface ProductDraft {
  taxRateId?: string | null;
  shippingClass?: string;
}

type SortKey = 'name-asc' | 'name-desc' | 'stock-asc' | 'stock-desc' | 'price-asc' | 'price-desc';
const SORTS: { id: SortKey; label: string }[] = [
  { id: 'name-asc', label: 'Ürün adı A-Z' },
  { id: 'name-desc', label: 'Ürün adı Z-A' },
  { id: 'stock-asc', label: 'Stoku en az olanlar' },
  { id: 'stock-desc', label: 'Stoku en fazla olanlar' },
  { id: 'price-asc', label: 'Fiyatı en düşük olanlar' },
  { id: 'price-desc', label: 'Fiyatı en yüksek olanlar' },
];

type StockFilter = '' | 'stokta' | 'yok' | 'az';
const STATUS_LABEL: Record<string, string> = {
  yayında: 'Yayında',
  taslak: 'Taslak',
  arşiv: 'Arşiv',
};

const lower = (s: string) => s.toLocaleLowerCase('tr');
const priceInput = (minor: number) => minorToInput(minor);
const weightInput = (g: number | null) => (g == null ? '' : String(g));

/** Taslak alanlarının doğrulanmış hâli + hata mesajı. */
function resolveDraft(v: ManagerVariant, d: VariantDraft | undefined) {
  const errors: Partial<Record<keyof VariantDraft, string>> = {};
  const change: Omit<VariantChange, 'variantId'> = {};
  if (!d) return { change, errors, changed: false };

  if (d.sku !== undefined && d.sku.trim() !== v.sku) {
    if (d.sku.trim().length > 64) errors.sku = 'En fazla 64 karakter';
    else change.sku = d.sku.trim();
  }
  if (d.price !== undefined && d.price.trim() !== priceInput(v.priceMinor)) {
    const minor = parseMajorInput(d.price);
    if (minor == null || minor <= 0) errors.price = 'Geçerli bir fiyat girin';
    else if (minor !== v.priceMinor) change.priceMinor = minor;
  }
  if (d.stock !== undefined && d.stock.trim() !== String(v.stock)) {
    const e = parseStockExpr(d.stock);
    if (!e) errors.stock = 'Ör. 40, +20 ya da -5';
    else if (applyStockExpr(v.stock, e) < 0) errors.stock = 'Stok negatif olamaz';
    else if (!(e.op === 'set' && e.value === v.stock))
      change.stock = { ...e, expected: e.op === 'set' ? v.stock : undefined };
  }
  if (d.trackStock !== undefined && d.trackStock !== v.trackStock) change.trackStock = d.trackStock;
  if (d.inStock !== undefined && d.inStock !== v.inStock) change.inStock = d.inStock;
  if (d.weight !== undefined && d.weight.trim() !== weightInput(v.weightGrams)) {
    const t = d.weight.trim();
    if (t === '') change.weightGrams = null;
    else if (!/^\d{1,7}$/.test(t)) errors.weight = 'Gram cinsinden tam sayı';
    else change.weightGrams = Number(t);
  }
  return {
    change,
    errors,
    changed: Object.keys(change).length > 0 || Object.keys(errors).length > 0,
  };
}

function resolveProductDraft(p: ManagerProduct, d: ProductDraft | undefined): Omit<ProductChange, 'productId'> {
  const change: Omit<ProductChange, 'productId'> = {};
  if (!d) return change;
  if (d.taxRateId !== undefined && d.taxRateId !== p.taxRateId) change.taxRateId = d.taxRateId;
  if (d.shippingClass !== undefined && d.shippingClass.trim() !== p.shippingClass)
    change.shippingClass = d.shippingClass.trim();
  return change;
}

// ---------------------------------------------------------------- ekran ----

export function StockManager() {
  const { can, categories, products: adminProducts, reload: reloadAdmin } = useAdminData();
  const canStock = can('stok:yaz');
  const canCatalog = can('katalog:yaz');

  const [data, setData] = useState<ManagerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, VariantDraft>>({});
  const [pdrafts, setPdrafts] = useState<Record<string, ProductDraft>>({});
  const [rowMsg, setRowMsg] = useState<Record<string, { tone: 'bad' | 'warn'; text: string }>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const [q, setQ] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [type, setType] = useState<'' | 'basit' | 'varyasyonlu'>('');
  const [stockFilter, setStockFilter] = useState<StockFilter>('');
  const [tracking, setTracking] = useState<'' | 'acik' | 'kapali'>('');
  const [status, setStatus] = useState('');
  const [dirtyOnly, setDirtyOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>('name-asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const [historyFor, setHistoryFor] = useState<{
    variantId: string;
    title: string;
  } | null>(null);
  const [csvOpen, setCsvOpen] = useState(false);
  const [priceOpen, setPriceOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await stockManagerApi.load());
    } catch (err) {
      toast.error('Ürünler yüklenemedi', err instanceof Error ? err.message : undefined);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => setPage(1), [q, categoryId, type, stockFilter, tracking, status, dirtyOnly, sort, pageSize]);

  const threshold = data?.lowStockThreshold ?? 5;

  // --- türetilmiş: kirli satırlar
  const resolved = useMemo(() => {
    const out = new Map<string, ReturnType<typeof resolveDraft>>();
    if (!data) return out;
    for (const p of data.products)
      for (const v of p.variants) if (drafts[v.id]) out.set(v.id, resolveDraft(v, drafts[v.id]));
    return out;
  }, [data, drafts]);

  const dirtyVariantIds = useMemo(
    () => new Set([...resolved].filter(([, r]) => r.changed).map(([id]) => id)),
    [resolved],
  );
  const { dirtyProductIds, productLevelDirty } = useMemo(() => {
    const all = new Set<string>();
    let own = 0;
    for (const p of data?.products ?? []) {
      if (Object.keys(resolveProductDraft(p, pdrafts[p.id])).length) {
        all.add(p.id);
        own += 1;
      }
      if (p.variants.some((v) => dirtyVariantIds.has(v.id))) all.add(p.id);
    }
    return { dirtyProductIds: all, productLevelDirty: own };
  }, [data, pdrafts, dirtyVariantIds]);
  const invalidCount = [...resolved.values()].filter((r) => Object.keys(r.errors).length).length;
  const dirtyCount = dirtyVariantIds.size + productLevelDirty;

  // --- filtre + sıralama
  const categoryScope = useMemo(
    () => (categoryId ? new Set(withDescendants(categories, [categoryId])) : null),
    [categories, categoryId],
  );

  const { rows, matchedVariants } = useMemo(() => {
    const matched = new Set<string>();
    if (!data) return { rows: [] as ManagerProduct[], matchedVariants: matched };
    const term = lower(q.trim());
    const vOk = (v: ManagerVariant) => {
      if (tracking === 'acik' && !v.trackStock) return false;
      if (tracking === 'kapali' && v.trackStock) return false;
      if (stockFilter === 'stokta' && !isAvailable(v)) return false;
      if (stockFilter === 'yok' && isAvailable(v)) return false;
      if (stockFilter === 'az' && !(v.trackStock && v.stock > 0 && v.stock <= threshold)) return false;
      return true;
    };
    const list = data.products.filter((p) => {
      if (status && p.status !== status) return false;
      if (type === 'basit' && p.variants.length > 1) return false;
      if (type === 'varyasyonlu' && p.variants.length <= 1) return false;
      if (categoryScope && !p.categoryIds.some((c) => categoryScope.has(c))) return false;
      if (dirtyOnly && !dirtyProductIds.has(p.id)) return false;
      if ((tracking || stockFilter) && !p.variants.some(vOk)) return false;
      if (term) {
        const own = lower(p.name).includes(term) || lower(p.id).includes(term) || lower(p.slug).includes(term);
        const hits = p.variants.filter((v) => lower(v.sku).includes(term) || lower(v.id) === term);
        if (!own && hits.length === 0) return false;
        if (!own) for (const v of hits) matched.add(v.id);
      }
      return true;
    });

    const stockKey = (p: ManagerProduct, dir: 1 | -1) => {
      const vals = p.variants.map((v) => (v.trackStock ? v.stock : v.inStock ? Number.POSITIVE_INFINITY : 0));
      return dir === 1 ? Math.min(...vals) : Math.max(...vals.map((x) => (x === Number.POSITIVE_INFINITY ? -1 : x)));
    };
    const priceKey = (p: ManagerProduct, dir: 1 | -1) =>
      dir === 1 ? Math.min(...p.variants.map((v) => v.priceMinor)) : Math.max(...p.variants.map((v) => v.priceMinor));
    const byName = (a: ManagerProduct, b: ManagerProduct) => a.name.localeCompare(b.name, 'tr');
    const sorted = [...list].sort((a, b) => {
      switch (sort) {
        case 'name-desc':
          return byName(b, a);
        case 'stock-asc':
          return stockKey(a, 1) - stockKey(b, 1) || byName(a, b);
        case 'stock-desc':
          return stockKey(b, -1) - stockKey(a, -1) || byName(a, b);
        case 'price-asc':
          return priceKey(a, 1) - priceKey(b, 1) || byName(a, b);
        case 'price-desc':
          return priceKey(b, -1) - priceKey(a, -1) || byName(a, b);
        default:
          return byName(a, b);
      }
    });
    return { rows: sorted, matchedVariants: matched };
  }, [data, q, status, type, categoryScope, dirtyOnly, dirtyProductIds, tracking, stockFilter, threshold, sort]);

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);

  // --- özet
  const stats = useMemo(() => {
    const all = data?.products.flatMap((p) => p.variants) ?? [];
    return {
      products: data?.products.length ?? 0,
      variants: all.length,
      out: all.filter((v) => !isAvailable(v)).length,
      low: all.filter((v) => v.trackStock && v.stock > 0 && v.stock <= threshold).length,
    };
  }, [data, threshold]);

  const shippingClasses = useMemo(
    () =>
      [...new Set((data?.products ?? []).map((p) => p.shippingClass).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, 'tr'),
      ),
    [data],
  );

  // --- düzenleme
  const setVariantField = <K extends keyof VariantDraft>(id: string, key: K, value: VariantDraft[K]) => {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], [key]: value } }));
    setRowMsg((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };
  const setProductField = <K extends keyof ProductDraft>(id: string, key: K, value: ProductDraft[K]) =>
    setPdrafts((prev) => ({ ...prev, [id]: { ...prev[id], [key]: value } }));

  const resetProduct = (p: ManagerProduct) => {
    setDrafts((prev) => {
      const next = { ...prev };
      for (const v of p.variants) delete next[v.id];
      return next;
    });
    setPdrafts((prev) => {
      const next = { ...prev };
      delete next[p.id];
      return next;
    });
    setRowMsg((prev) => {
      const next = { ...prev };
      for (const v of p.variants) delete next[v.id];
      delete next[`urun:${p.id}`];
      return next;
    });
  };
  const discardAll = () => {
    setDrafts({});
    setPdrafts({});
    setRowMsg({});
  };

  // --- kaydetme
  const save = async (only?: ManagerProduct) => {
    if (!data) return;
    const scope = only ? [only] : data.products;
    const variants: VariantChange[] = [];
    const products: ProductChange[] = [];
    for (const p of scope) {
      const pc = resolveProductDraft(p, pdrafts[p.id]);
      if (Object.keys(pc).length) products.push({ productId: p.id, ...pc });
      for (const v of p.variants) {
        const r = resolved.get(v.id);
        if (!r || !r.changed) continue;
        if (Object.keys(r.errors).length) {
          toast.error(
            'Hatalı hücreler var',
            `${p.name}${v.label ? ` (${v.label})` : ''}: ${Object.values(r.errors)[0]}`,
          );
          return;
        }
        variants.push({ key: v.id, variantId: v.id, ...r.change });
      }
    }
    if (!variants.length && !products.length) {
      toast.info('Kaydedilecek değişiklik yok');
      return;
    }
    setSaving(true);
    try {
      const res = await stockManagerApi.save({
        source: 'panel',
        variants,
        products,
      });
      const failed = res.results.filter((r) => r.status === 'cakisma' || r.status === 'hata');
      const failedKeys = new Set(failed.map((r) => r.key));
      // Başarılı satırların taslağı silinir; hatalılar ekranda kalır.
      setDrafts((prev) => {
        const next = { ...prev };
        for (const v of variants) if (!failedKeys.has(v.key!)) delete next[v.variantId];
        return next;
      });
      setPdrafts((prev) => {
        const next = { ...prev };
        for (const p of products) if (!failedKeys.has(`urun:${p.productId}`)) delete next[p.productId];
        return next;
      });
      setRowMsg((prev) => {
        const next = { ...prev };
        for (const v of variants) delete next[v.variantId];
        for (const r of failed)
          next[r.key] = {
            tone: r.status === 'cakisma' ? 'warn' : 'bad',
            text: r.message ?? 'Kaydedilemedi',
          };
        return next;
      });
      // Çakışmada ekrandaki "beklenen" stok güncellensin diye veri tazelenir.
      setData(await stockManagerApi.load());
      if (failed.length) {
        toast.error(`${res.summary.updated} satır kaydedildi, ${failed.length} satır kaydedilemedi`, failed[0].message);
      } else {
        toast.success('Değişiklikler kaydedildi', `${res.summary.updated} satır güncellendi`);
      }
      if (variants.some((v) => v.priceMinor !== undefined || v.sku !== undefined)) void reloadAdmin();
    } catch (err) {
      toast.error(
        'Kaydedilemedi',
        err instanceof ApiError
          ? (Object.values(err.issues)[0] ?? err.message)
          : err instanceof Error
            ? err.message
            : undefined,
      );
    } finally {
      setSaving(false);
    }
  };

  // Ctrl+S → tümünü kaydet
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (!saving) void saveRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [saving]);

  const exportCsv = () => {
    const csv = buildStockCsv(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stok-listesi-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV indirildi', `${rows.length} ürün · ${rows.reduce((s, p) => s + p.variants.length, 0)} satır`);
  };

  const toggleExpanded = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const filtersActive = !!(q || categoryId || type || stockFilter || tracking || status || dirtyOnly);
  const clearFilters = () => {
    setQ('');
    setCategoryId('');
    setType('');
    setStockFilter('');
    setTracking('');
    setStatus('');
    setDirtyOnly(false);
  };

  if (loading && !data) return <TableSkeleton rows={10} />;
  if (!data) return <EmptyState title="Ürünler yüklenemedi" hint="Sayfayı yenileyip tekrar deneyin." />;

  const ctx: RowCtx = {
    data,
    drafts,
    pdrafts,
    resolved,
    rowMsg,
    threshold,
    canStock,
    canCatalog,
    shippingClasses,
    setVariantField,
    setProductField,
    openHistory: (variantId, title) => setHistoryFor({ variantId, title }),
  };

  return (
    <div className="stock-manager flex flex-col gap-3">
      <UnsavedGuard when={dirtyCount > 0} />

      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold text-[var(--brand-purple-deep)]">Stok Yönetimi</h1>
          <p className="admin-hint mt-0.5">
            Tüm ürünlerin SKU, fiyat ve stok bilgisini tek ekrandan değiştirin. Stok hücresine <b>40</b> (40 yap),{' '}
            <b>+20</b> (20 ekle) ya da <b>-5</b> (5 düş) yazabilirsiniz. Fiyat doğrudan satış fiyatı olur, indirim
            olarak görünmez.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="admin-btn admin-btn-ghost" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : undefined} /> Yenile
          </button>
          <button type="button" className="admin-btn admin-btn-ghost" onClick={exportCsv}>
            <Download size={14} /> CSV / Excel’e aktar
          </button>
          {canStock && (
            <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setCsvOpen(true)}>
              <Upload size={14} /> CSV’den yükle
            </button>
          )}
          {canCatalog && (
            <button
              type="button"
              className="admin-btn admin-btn-ghost"
              onClick={() => setPriceOpen(true)}
              disabled={dirtyCount > 0}
              title={
                dirtyCount > 0
                  ? 'Önce bekleyen değişiklikleri kaydedin'
                  : 'Kategoriye / ürünlere göre toplu fiyat düşür veya artır'
              }
            >
              <Percent size={14} /> Toplu fiyat
            </button>
          )}
        </div>
      </header>

      {/* Özet kartları — tıklayınca filtreler */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatCard
          label="Ürün"
          value={stats.products}
          hint={`${stats.variants} satış kalemi`}
          onClick={clearFilters}
          active={!filtersActive}
        />
        <StatCard
          label="Stokta yok"
          value={stats.out}
          tone="bad"
          onClick={() => setStockFilter('yok')}
          active={stockFilter === 'yok'}
        />
        <StatCard
          label={`Az stok (≤ ${threshold})`}
          value={stats.low}
          tone="warn"
          onClick={() => setStockFilter('az')}
          active={stockFilter === 'az'}
        />
        <StatCard
          label="Kaydedilmemiş"
          value={dirtyCount}
          tone={dirtyCount ? 'warn' : undefined}
          onClick={() => setDirtyOnly((v) => !v)}
          active={dirtyOnly}
        />
      </div>

      {/* Kaydet çubuğu */}
      {dirtyCount > 0 && (
        <div
          className="sticky z-30 flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 shadow-sm"
          style={{
            top: 'calc(var(--admin-topbar-h) + 8px)',
            background: '#fffbeb',
            borderColor: '#f2d597',
          }}
          role="status"
        >
          <span className="text-sm">
            <b className="text-[#8a5a00]">●</b> <b>{dirtyCount}</b> kaydedilmemiş değişiklik
            {invalidCount > 0 && <span className="ml-2 text-[#b42318]">· {invalidCount} hatalı hücre</span>}
            <span className="admin-hint ml-2 hidden sm:inline">Ctrl+S ile de kaydedebilirsiniz</span>
          </span>
          <div className="flex gap-2">
            <button type="button" className="admin-btn admin-btn-ghost" onClick={discardAll} disabled={saving}>
              <X size={14} /> Vazgeç
            </button>
            <button type="button" className="admin-btn admin-btn-primary" onClick={() => void save()} disabled={saving}>
              <Save size={14} /> {saving ? 'Kaydediliyor…' : 'Tüm değişiklikleri kaydet'}
            </button>
          </div>
        </div>
      )}

      {/* Filtreler */}
      <div className="admin-card flex flex-wrap items-end gap-2" style={{ padding: 10 }}>
        <label className="admin-field" style={{ minWidth: 220, flex: '1 1 220px' }}>
          <span className="admin-label">Ara</span>
          <span className="relative">
            <Search
              size={14}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--admin-ink-soft)]"
            />
            <input
              type="search"
              className="admin-input w-full"
              style={{ paddingLeft: 28 }}
              placeholder="Ürün adı, SKU ya da ID"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </span>
        </label>
        <label className="admin-field" style={{ minWidth: 170 }}>
          <span className="admin-label">Kategori</span>
          <select className="admin-select" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Tümü</option>
            {categoryTree(categories).map(({ category: c, depth }) => (
              <option key={c.id} value={c.id}>
                {'  '.repeat(depth)}
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-field" style={{ minWidth: 130 }}>
          <span className="admin-label">Ürün tipi</span>
          <select className="admin-select" value={type} onChange={(e) => setType(e.target.value as typeof type)}>
            <option value="">Tümü</option>
            <option value="basit">Basit</option>
            <option value="varyasyonlu">Varyasyonlu</option>
          </select>
        </label>
        <label className="admin-field" style={{ minWidth: 130 }}>
          <span className="admin-label">Stok durumu</span>
          <select
            className="admin-select"
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value as StockFilter)}
          >
            <option value="">Tümü</option>
            <option value="stokta">Stokta</option>
            <option value="yok">Stokta yok</option>
            <option value="az">Az stok</option>
          </select>
        </label>
        <label className="admin-field" style={{ minWidth: 120 }}>
          <span className="admin-label">Stok takibi</span>
          <select
            className="admin-select"
            value={tracking}
            onChange={(e) => setTracking(e.target.value as typeof tracking)}
          >
            <option value="">Tümü</option>
            <option value="acik">Açık</option>
            <option value="kapali">Kapalı</option>
          </select>
        </label>
        <label className="admin-field" style={{ minWidth: 120 }}>
          <span className="admin-label">Yayın</span>
          <select className="admin-select" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Tümü</option>
            {Object.entries(STATUS_LABEL).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-field" style={{ minWidth: 190 }}>
          <span className="admin-label">Sıralama</span>
          <select className="admin-select" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        {filtersActive && (
          <button type="button" className="admin-btn admin-btn-ghost" onClick={clearFilters}>
            <X size={14} /> Filtreleri temizle
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="admin-hint">
          {rows.length} ürün gösteriliyor
          {filtersActive ? ` (toplam ${data.products.length})` : ''}
        </span>
        <span className="flex items-center gap-2">
          <button
            type="button"
            className="admin-btn admin-btn-ghost admin-btn-sm"
            onClick={() => setExpanded(new Set(pageRows.filter((p) => p.variants.length > 1).map((p) => p.id)))}
          >
            Tüm varyasyonları aç
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-ghost admin-btn-sm"
            onClick={() => setExpanded(new Set())}
          >
            Kapat
          </button>
        </span>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="Bu filtrelerle ürün bulunamadı"
          hint={filtersActive ? 'Filtreleri temizleyip tekrar deneyin.' : undefined}
        />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table stock-grid">
            <colgroup>
              <col />
              <col style={{ width: '13%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: 92 }} />
            </colgroup>
            <thead>
              <tr>
                <th>Ürün</th>
                <th>SKU</th>
                <th className="text-right">Fiyat (₺)</th>
                <th className="text-right">Stok</th>
                <th>Durum / takip</th>
                <th>KDV / kargo sınıfı</th>
                <th className="text-right">Ağırlık (g)</th>
                <th aria-label="İşlemler" />
              </tr>
            </thead>
            <tbody>
              {pageRows.map((p) => {
                const variable = p.variants.length > 1;
                const open = expanded.has(p.id) || p.variants.some((v) => matchedVariants.has(v.id));
                const dirty = dirtyProductIds.has(p.id);
                return (
                  <Fragment key={p.id}>
                    {variable ? (
                      <ParentRow
                        ctx={ctx}
                        product={p}
                        open={open}
                        dirty={dirty}
                        saving={saving}
                        onToggle={() => toggleExpanded(p.id)}
                        onSave={() => void save(p)}
                        onReset={() => resetProduct(p)}
                      />
                    ) : (
                      <VariantRow
                        ctx={ctx}
                        product={p}
                        variant={p.variants[0]}
                        simple
                        dirty={dirty}
                        saving={saving}
                        onSave={() => void save(p)}
                        onReset={() => resetProduct(p)}
                      />
                    )}
                    {variable && open && (
                      <>
                        <tr className="stock-grid-note">
                          <td colSpan={8}>
                            Her varyasyon ayrı yönetilir: bir varyasyonun stoğunu ya da fiyatını değiştirdiğinizde{' '}
                            <b>yalnız o varyasyon</b> değişir.
                          </td>
                        </tr>
                        {p.variants.map((v) => (
                          <VariantRow
                            key={v.id}
                            ctx={ctx}
                            product={p}
                            variant={v}
                            highlight={matchedVariants.has(v.id)}
                            saving={saving}
                          />
                        ))}
                      </>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {rows.length > 0 && (
        <nav className="flex flex-wrap items-center justify-between gap-2" aria-label="Sayfalama">
          <label className="flex items-center gap-2 text-sm">
            Sayfa başına
            <select className="admin-select" value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
              {[25, 50, 100, 200].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <span className="flex items-center gap-2 text-sm">
            <button
              type="button"
              className="admin-btn admin-btn-ghost admin-btn-sm"
              disabled={page <= 1}
              onClick={() => setPage((x) => x - 1)}
              aria-label="Önceki sayfa"
            >
              <ChevronLeft size={14} />
            </button>
            {page} / {pageCount}
            <button
              type="button"
              className="admin-btn admin-btn-ghost admin-btn-sm"
              disabled={page >= pageCount}
              onClick={() => setPage((x) => x + 1)}
              aria-label="Sonraki sayfa"
            >
              <ChevronRight size={14} />
            </button>
          </span>
        </nav>
      )}

      <StockHistoryDialog target={historyFor} onClose={() => setHistoryFor(null)} />
      <StockCsvImportDialog
        open={csvOpen}
        onClose={() => setCsvOpen(false)}
        hasDrafts={dirtyCount > 0}
        onDone={async () => {
          setData(await stockManagerApi.load());
          void reloadAdmin();
        }}
      />
      <PriceAdjustDialog
        open={priceOpen}
        onClose={() => setPriceOpen(false)}
        selectedIds={[]}
        products={adminProducts}
        categories={categories}
        onDone={async () => {
          await Promise.all([load(), reloadAdmin()]);
        }}
      />
    </div>
  );
}

// ------------------------------------------------------------- satırlar ----

interface RowCtx {
  data: ManagerData;
  drafts: Record<string, VariantDraft>;
  pdrafts: Record<string, ProductDraft>;
  resolved: Map<string, ReturnType<typeof resolveDraft>>;
  rowMsg: Record<string, { tone: 'bad' | 'warn'; text: string }>;
  threshold: number;
  canStock: boolean;
  canCatalog: boolean;
  shippingClasses: string[];
  setVariantField: <K extends keyof VariantDraft>(id: string, key: K, value: VariantDraft[K]) => void;
  setProductField: <K extends keyof ProductDraft>(id: string, key: K, value: ProductDraft[K]) => void;
  openHistory: (variantId: string, title: string) => void;
}

function Thumb({ product, src }: { product: ManagerProduct; src: string | null }) {
  const photo = catalogPhotos(src ? [{ src }] : [])[0]?.src;
  return (
    <Link
      href={`/admin/urunler/${product.slug}`}
      className="relative grid shrink-0 place-items-center overflow-hidden rounded border border-[var(--admin-line)] bg-white text-[var(--admin-ink-soft)]"
      style={{ width: 36, height: 36 }}
      tabIndex={-1}
      title="Ürün düzenleme sayfasını aç"
    >
      {photo ? <Image src={photo} alt="" fill sizes="36px" className="object-contain" /> : <ImageOff size={14} />}
    </Link>
  );
}

function ProductCells({ ctx, product }: { ctx: RowCtx; product: ManagerProduct }) {
  const d = ctx.pdrafts[product.id];
  const tax = d?.taxRateId !== undefined ? d.taxRateId : product.taxRateId;
  const ship = d?.shippingClass ?? product.shippingClass;
  const defaultLabel = `Varsayılan (%${ctx.data.defaultTaxRateBps / 100})`;
  return (
    <td>
      <div className="flex flex-col gap-1">
        <select
          className="stock-cell"
          data-changed={(tax ?? null) !== product.taxRateId || undefined}
          value={tax ?? ''}
          disabled={!ctx.canCatalog}
          onChange={(e) => ctx.setProductField(product.id, 'taxRateId', e.target.value || null)}
          aria-label={`${product.name} KDV`}
        >
          <option value="">{defaultLabel}</option>
          {ctx.data.taxRates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} (%{t.rateBps / 100})
            </option>
          ))}
        </select>
        <input
          className="stock-cell"
          data-changed={ship.trim() !== product.shippingClass || undefined}
          list="stock-shipping-classes"
          value={ship}
          placeholder="Kargo sınıfı"
          disabled={!ctx.canCatalog}
          onChange={(e) => ctx.setProductField(product.id, 'shippingClass', e.target.value)}
          aria-label={`${product.name} kargo sınıfı`}
          data-col="ship"
          onKeyDown={moveOnEnter}
        />
        <datalist id="stock-shipping-classes">
          {ctx.shippingClasses.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>
    </td>
  );
}

function ProductTitle({ product, kind }: { product: ManagerProduct; kind: string }) {
  return (
    <div className="flex min-w-0 flex-col">
      <Link
        href={`/admin/urunler/${product.slug}`}
        className="line-clamp-2 font-medium leading-snug hover:underline"
        title={product.name}
      >
        {product.name}
      </Link>
      <span className="admin-hint flex flex-wrap items-center gap-1.5 text-[11px]">
        <span className="max-w-full truncate font-mono">ID: {product.id}</span>
        <span>· {kind}</span>
        {product.status !== 'yayında' && (
          <span className="rounded bg-[#f1f1f1] px-1">{STATUS_LABEL[product.status] ?? product.status}</span>
        )}
      </span>
    </div>
  );
}

function RowActions({
  dirty,
  saving,
  onSave,
  onReset,
  historyFor,
  ctx,
}: {
  dirty?: boolean;
  saving: boolean;
  onSave?: () => void;
  onReset?: () => void;
  historyFor?: { id: string; title: string };
  ctx: RowCtx;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      {dirty && onSave && (
        <>
          <button
            type="button"
            className="admin-btn admin-btn-ghost admin-btn-sm"
            onClick={onReset}
            disabled={saving}
            title="Değişiklikleri geri al"
            aria-label="Değişiklikleri geri al"
          >
            <RotateCcw size={13} />
          </button>
          <button type="button" className="admin-btn admin-btn-primary admin-btn-sm" onClick={onSave} disabled={saving}>
            Kaydet
          </button>
        </>
      )}
      {historyFor && (
        <button
          type="button"
          className="admin-btn admin-btn-ghost admin-btn-sm"
          onClick={() => ctx.openHistory(historyFor.id, historyFor.title)}
          title="Stok geçmişi"
          aria-label="Stok geçmişi"
        >
          <History size={13} />
        </button>
      )}
    </div>
  );
}

function ParentRow({
  ctx,
  product,
  open,
  dirty,
  saving,
  onToggle,
  onSave,
  onReset,
}: {
  ctx: RowCtx;
  product: ManagerProduct;
  open: boolean;
  dirty: boolean;
  saving: boolean;
  onToggle: () => void;
  onSave: () => void;
  onReset: () => void;
}) {
  const vs = product.variants;
  const prices = vs.map((v) => v.priceMinor);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const tracked = vs.filter((v) => v.trackStock);
  const total = tracked.reduce((s, v) => s + v.stock, 0);
  const outCount = vs.filter((v) => !isAvailable(v)).length;
  const trackLabel = tracked.length === vs.length ? 'Açık' : tracked.length === 0 ? 'Kapalı' : 'Karışık';
  return (
    <tr className="stock-grid-parent" data-dirty={dirty || undefined}>
      <td>
        <div className="flex min-w-0 items-start gap-2">
          <Thumb product={product} src={product.image} />
          <div className="min-w-0 flex-1">
            <ProductTitle product={product} kind={`Varyasyonlu ürün (${vs.length})`} />
            <button
              type="button"
              className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-[var(--brand-purple)] hover:underline"
              onClick={onToggle}
              aria-expanded={open}
            >
              <ChevronDown
                size={13}
                style={{
                  transform: open ? 'rotate(180deg)' : undefined,
                  transition: 'transform .15s',
                }}
              />
              {open ? 'Varyasyonları gizle' : 'Varyasyonları göster'}
            </button>
            {dirty && <DirtyMark />}
            {ctx.rowMsg[`urun:${product.id}`] && (
              <p className="mt-1 text-xs text-[#b42318]" role="alert">
                {ctx.rowMsg[`urun:${product.id}`].text}
              </p>
            )}
          </div>
        </div>
      </td>
      <td className="admin-hint">—</td>
      <td className="text-right text-xs tabular-nums">
        {min === max ? (
          formatMinor(min)
        ) : (
          <>
            {formatMinor(min)}
            <br />– {formatMinor(max)}
          </>
        )}
      </td>
      <td className="text-right tabular-nums">
        {tracked.length ? (
          <span title="Takip edilen varyasyonların toplamı">Σ {total}</span>
        ) : (
          <span className="admin-hint">—</span>
        )}
      </td>
      <td>
        {outCount === 0 ? (
          <Chip tone="ok">Stokta</Chip>
        ) : outCount === vs.length ? (
          <Chip tone="bad">Stokta yok</Chip>
        ) : (
          <Chip tone="warn">{outCount} tükendi</Chip>
        )}
        <span className="admin-hint mt-1 block text-[11px]">Takip: {trackLabel}</span>
      </td>
      <ProductCells ctx={ctx} product={product} />
      <td className="admin-hint">—</td>
      <td>
        <RowActions ctx={ctx} dirty={dirty} saving={saving} onSave={onSave} onReset={onReset} />
      </td>
    </tr>
  );
}

function VariantRow({
  ctx,
  product,
  variant: v,
  simple,
  dirty,
  highlight,
  saving,
  onSave,
  onReset,
}: {
  ctx: RowCtx;
  product: ManagerProduct;
  variant: ManagerVariant;
  simple?: boolean;
  dirty?: boolean;
  highlight?: boolean;
  saving: boolean;
  onSave?: () => void;
  onReset?: () => void;
}) {
  const d = ctx.drafts[v.id];
  const r = ctx.resolved.get(v.id);
  const msg = ctx.rowMsg[v.id] ?? (simple ? ctx.rowMsg[`urun:${product.id}`] : undefined);
  const track = d?.trackStock ?? v.trackStock;
  const inStock = d?.inStock ?? v.inStock;
  const stockText = d?.stock ?? String(v.stock);
  const expr = parseStockExpr(stockText);
  const nextStock = expr ? applyStockExpr(v.stock, expr) : null;
  const available = track ? (nextStock ?? v.stock) > 0 : inStock;
  const low = track && available && (nextStock ?? v.stock) <= ctx.threshold;
  const rowDirty = simple ? dirty : r?.changed;
  const title = `${product.name}${v.label ? ` — ${v.label}` : ''}`;

  return (
    <tr
      className={simple ? undefined : 'stock-grid-child'}
      data-dirty={rowDirty || undefined}
      data-highlight={highlight || undefined}
    >
      <td>
        {simple ? (
          <div className="flex min-w-0 items-start gap-2">
            <Thumb product={product} src={product.image} />
            <div className="min-w-0 flex-1">
              <ProductTitle product={product} kind="Basit ürün" />
            </div>
          </div>
        ) : (
          <div className="flex min-w-0 flex-col pl-10">
            <span className="font-medium">{v.label || 'Varyasyon'}</span>
            <span className="admin-hint truncate font-mono text-[11px]">ID: {v.id}</span>
          </div>
        )}
        {!v.isActive && <span className="admin-hint text-[11px]">Pasif varyant (satışta değil)</span>}
        {rowDirty && <DirtyMark />}
        {msg && (
          <p className="mt-1 text-xs" style={{ color: msg.tone === 'bad' ? '#b42318' : '#8a5a00' }} role="alert">
            {msg.text}
          </p>
        )}
      </td>
      <td>
        <input
          className="stock-cell font-mono"
          value={d?.sku ?? v.sku}
          placeholder="—"
          disabled={!ctx.canCatalog}
          data-changed={r?.change.sku !== undefined || undefined}
          data-invalid={!!r?.errors.sku || undefined}
          title={r?.errors.sku}
          onChange={(e) => ctx.setVariantField(v.id, 'sku', e.target.value)}
          aria-label={`${title} SKU`}
          data-col="sku"
          onKeyDown={moveOnEnter}
        />
      </td>
      <td>
        <input
          className="stock-cell text-right tabular-nums"
          inputMode="decimal"
          value={d?.price ?? priceInput(v.priceMinor)}
          disabled={!ctx.canCatalog}
          data-changed={r?.change.priceMinor !== undefined || undefined}
          data-invalid={!!r?.errors.price || undefined}
          title={
            r?.errors.price ??
            (v.compareAtPriceMinor && v.compareAtPriceMinor > v.priceMinor
              ? `Eski üstü çizili fiyat: ${formatMinor(v.compareAtPriceMinor)} — fiyatı değiştirirseniz kaldırılır`
              : undefined)
          }
          onChange={(e) => ctx.setVariantField(v.id, 'price', e.target.value)}
          aria-label={`${title} fiyat`}
          data-col="price"
          onKeyDown={moveOnEnter}
        />
      </td>
      <td>
        {track ? (
          <>
            <input
              className="stock-cell text-right tabular-nums"
              inputMode="numeric"
              value={stockText}
              disabled={!ctx.canStock}
              data-changed={r?.change.stock !== undefined || undefined}
              data-invalid={!!r?.errors.stock || undefined}
              title={r?.errors.stock ?? '40 → 40 yap · +20 → 20 ekle · -5 → 5 düş'}
              onChange={(e) => ctx.setVariantField(v.id, 'stock', e.target.value)}
              onFocus={(e) => e.currentTarget.select()}
              aria-label={`${title} stok`}
              data-col="stock"
              onKeyDown={moveOnEnter}
            />
            {expr && expr.op !== 'set' && nextStock != null && (
              <span className="mt-0.5 block text-right text-[11px] text-[#8a5a00]">
                {v.stock} {expr.op === 'add' ? '+' : '−'} {expr.value} = <b>{nextStock}</b>
              </span>
            )}
            {r?.errors.stock && (
              <span className="mt-0.5 block text-right text-[11px] text-[#b42318]">{r.errors.stock}</span>
            )}
          </>
        ) : (
          <span className="admin-hint block text-right" title="Stok takibi kapalı: adet tutulmuyor">
            —
          </span>
        )}
      </td>
      <td>
        <div className="flex flex-col items-start gap-1">
          {track ? (
            <span title="Stok takibi açık: durum adetten otomatik belirlenir">
              {available ? (
                low ? (
                  <Chip tone="warn">Az stok</Chip>
                ) : (
                  <Chip tone="ok">Stokta</Chip>
                )
              ) : (
                <Chip tone="bad">Stokta yok</Chip>
              )}
            </span>
          ) : (
            <select
              className="stock-cell"
              value={inStock ? '1' : '0'}
              disabled={!ctx.canStock}
              data-changed={r?.change.inStock !== undefined || undefined}
              onChange={(e) => ctx.setVariantField(v.id, 'inStock', e.target.value === '1')}
              aria-label={`${title} stok durumu`}
            >
              <option value="1">Stokta</option>
              <option value="0">Stokta yok</option>
            </select>
          )}
          <Switch
            checked={track}
            changed={r?.change.trackStock !== undefined}
            disabled={!ctx.canStock}
            label={`${title} stok takibi`}
            onChange={(on) => ctx.setVariantField(v.id, 'trackStock', on)}
          />
        </div>
      </td>
      {simple ? <ProductCells ctx={ctx} product={product} /> : <td className="admin-hint text-xs">Ürün satırında</td>}
      <td>
        <input
          className="stock-cell text-right tabular-nums"
          inputMode="numeric"
          value={d?.weight ?? weightInput(v.weightGrams)}
          placeholder="—"
          disabled={!ctx.canCatalog}
          data-changed={r?.change.weightGrams !== undefined || undefined}
          data-invalid={!!r?.errors.weight || undefined}
          title={r?.errors.weight}
          onChange={(e) => ctx.setVariantField(v.id, 'weight', e.target.value)}
          aria-label={`${title} ağırlık (gram)`}
          data-col="weight"
          onKeyDown={moveOnEnter}
        />
      </td>
      <td>
        <RowActions
          ctx={ctx}
          dirty={simple ? dirty : false}
          saving={saving}
          onSave={onSave}
          onReset={onReset}
          historyFor={{ id: v.id, title }}
        />
      </td>
    </tr>
  );
}

// -------------------------------------------------------------- parçalar ---

/** Enter / Shift+Enter: aynı sütunda alt / üst hücreye geç (Excel gibi). Esc: odaktan çık. */
function moveOnEnter(e: KeyboardEvent<HTMLInputElement>) {
  if (e.key === 'Escape') {
    e.currentTarget.blur();
    return;
  }
  if (e.key !== 'Enter') return;
  e.preventDefault();
  const col = e.currentTarget.dataset.col;
  const cells = [...document.querySelectorAll<HTMLInputElement>(`input.stock-cell[data-col="${col}"]:not(:disabled)`)];
  const i = cells.indexOf(e.currentTarget);
  const next = cells[i + (e.shiftKey ? -1 : 1)];
  if (next) {
    next.focus();
    next.select();
  }
}

function DirtyMark() {
  return (
    <span className="mt-0.5 block text-[11px] font-medium text-[#8a5a00]">
      <span aria-hidden="true">● </span>Değişiklik yapıldı
    </span>
  );
}

function Chip({ tone, children }: { tone: 'ok' | 'warn' | 'bad'; children: React.ReactNode }) {
  const t = {
    ok: 'bg-[#e6f6ee] text-[#0f6b3d] border-[#a9dfc2]',
    warn: 'bg-[#fff4de] text-[#8a5a00] border-[#f2d597]',
    bad: 'bg-[#fdecec] text-[#b42318] border-[#f4b9b2]',
  }[tone];
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium ${t}`}>
      {children}
    </span>
  );
}

function Switch({
  checked,
  changed,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  changed?: boolean;
  disabled?: boolean;
  label: string;
  onChange: (on: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-1.5 text-xs disabled:opacity-50"
      style={
        changed
          ? {
              outline: '2px solid #f2b84b',
              outlineOffset: 2,
              borderRadius: 999,
            }
          : undefined
      }
    >
      <span
        className="relative inline-block h-[18px] w-[32px] rounded-full transition-colors"
        style={{
          background: checked ? 'var(--brand-purple, #6d28d9)' : '#cbd5e1',
        }}
      >
        <span
          className="absolute top-[2px] h-[14px] w-[14px] rounded-full bg-white shadow transition-all"
          style={{ left: checked ? 16 : 2 }}
        />
      </span>
      Takip {checked ? 'açık' : 'kapalı'}
    </button>
  );
}

function StatCard({
  label,
  value,
  hint,
  tone,
  active,
  onClick,
}: {
  label: string;
  value: number;
  hint?: string;
  tone?: 'warn' | 'bad';
  active?: boolean;
  onClick: () => void;
}) {
  const color = tone === 'bad' ? '#b42318' : tone === 'warn' ? '#8a5a00' : 'var(--brand-purple-deep)';
  return (
    <button
      type="button"
      onClick={onClick}
      className="admin-card flex flex-col items-start text-left transition-shadow hover:shadow-md"
      style={{
        padding: '10px 12px',
        outline: active ? '2px solid var(--brand-purple, #6d28d9)' : undefined,
      }}
      aria-pressed={active}
    >
      <span className="admin-hint text-xs">{label}</span>
      <span className="text-xl font-semibold tabular-nums" style={{ color }}>
        {value.toLocaleString('tr-TR')}
      </span>
      {hint && <span className="admin-hint text-[11px]">{hint}</span>}
    </button>
  );
}
