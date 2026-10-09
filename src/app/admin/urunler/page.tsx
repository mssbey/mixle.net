'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Camera, Copy, ExternalLink, Eye, ImageOff, Loader2, Percent, Plus, Trash2, Wand2, X } from 'lucide-react';
import type { AdminProduct, ProductStatus } from '@/types/admin';
import { productStatuses, statusLabels } from '@/types/admin';
import { useAdminData } from '@/components/admin/AdminDataProvider';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { PriceAdjustDialog } from '@/components/admin/PriceAdjustDialog';
import { EmptyState, Pagination, StatusToggle, TableSkeleton } from '@/components/admin/primitives';
import { categoryTree, listProducts, type ProductQuery } from '@/lib/admin/mutations';
import { COLLECTIONS_ENABLED } from '@/lib/admin/features';
import { localId, priceRangeOf } from '@/lib/admin/variants';
import { mediaApi } from '@/lib/admin/media-client';
import { ApiError } from '@/lib/admin/client';
import { toast } from '@/store/toast';
import { formatMinor } from '@/lib/admin/format';
import { useDebounced } from '@/lib/hooks';
import { openInStorefrontPath } from '@/lib/admin/preview';
import { catalogPhotos } from '@/lib/storefront-images';

const PAGE_SIZE = 20;

/** Listede ürünü tanımayı kolaylaştıran küçük ön izleme görseli. */
function ProductThumb({ product, size = 48 }: { product: AdminProduct; size?: number }) {
  const { canWrite, updateProduct } = useAdminData();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const src = catalogPhotos(product.images)[0]?.src;

  // Ürüne girmeden ana görseli değiştirir: seçilen dosya medya kütüphanesine
  // yüklenir ve ürünün ilk (ana) görselinin yerine geçer; diğer görseller kalır.
  const replaceMainImage = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const { asset } = await mediaApi.upload(file);
      const main = catalogPhotos(product.images)[0];
      const rest = product.images.filter((img) => img.id !== main?.id);
      const alt = main?.alt || product.name;
      await updateProduct(product.id, { images: [{ id: localId('img'), src: asset.path, alt }, ...rest] });
    } catch (err) {
      toast.error(`${file.name} yüklenemedi`, err instanceof ApiError ? err.message : undefined);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const content = src ? (
    <Image src={src} alt="" fill sizes={`${size}px`} className="object-contain" />
  ) : (
    <ImageOff size={16} />
  );
  const box = 'relative grid shrink-0 place-items-center overflow-hidden rounded border border-[var(--admin-line)] bg-white text-[var(--admin-ink-soft)]';

  if (!canWrite) {
    return (
      <Link href={`/admin/urunler/${product.slug}`} className={box} style={{ width: size, height: size }} tabIndex={-1} aria-hidden="true">
        {content}
      </Link>
    );
  }

  return (
    <label
      className={`group ${box} ${uploading ? 'pointer-events-none' : 'cursor-pointer'}`}
      style={{ width: size, height: size }}
      title={src ? 'Görseli değiştir' : 'Görsel yükle'}
    >
      {content}
      <span
        className={`absolute inset-0 grid place-items-center bg-black/45 text-white transition-opacity ${uploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'}`}
      >
        {uploading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
      </span>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="sr-only"
        aria-label={`${product.name} görselini değiştir`}
        disabled={uploading}
        onChange={(e) => void replaceMainImage(e.target.files?.[0])}
      />
    </label>
  );
}

function ProductsView() {
  const params = useSearchParams();
  const router = useRouter();
  const {
    status,
    catalog,
    categories,
    collections,
    categoryName,
    bulkProducts,
    duplicateProduct,
    canWrite,
    reload,
    storeUrl,
    updateProduct,
  } = useAdminData();
  const [priceOpen, setPriceOpen] = useState(false);

  // Aynı satıra iki kez basılmasın diye çoğaltılan ürün kilitlenir.
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  // "Kopyala": taslak kopya oluşturulur ve düzenleme ekranı YENİ SEKMEDE açılır;
  // liste bu sekmede kalır. Sekme tıklama anında açılır (sonradan açılan pencereyi
  // tarayıcı açılır pencere engelleyicisine takar), adresi kopya hazır olunca verilir.
  const duplicate = async (id: string) => {
    setDuplicatingId(id);
    const tab = window.open('about:blank', '_blank');
    const copy = await duplicateProduct(id);
    setDuplicatingId(null);
    const href = copy ? `/admin/urunler/${copy.slug}` : null;
    if (href && tab) tab.location.href = href;
    else if (href) router.push(href);
    else tab?.close();
  };

  // Durum sütunundaki aç/kapa: yayında ⇄ taslak.
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const toggleStatus = async (id: string, current: ProductStatus) => {
    setTogglingId(id);
    await updateProduct(id, { status: current === 'yayında' ? 'taslak' : 'yayında' });
    setTogglingId(null);
  };

  // Filtre, sıralama ve sayfa adreste tutulur: sayfa yenilenince (F5) ya da
  // ürün düzenlemeden geri dönülünce liste aynı yerden açılır.
  const sortKeys = ['created', 'updated', 'name', 'price', 'stock'] as const;
  const initialSort = params.get('sort') as NonNullable<ProductQuery['sort']> | null;
  const [search, setSearch] = useState(params.get('search') ?? '');
  const [categoryId, setCategoryId] = useState(params.get('kategori') ?? '');
  const [collectionId, setCollectionId] = useState(params.get('koleksiyon') ?? '');
  const [statusFilter, setStatusFilter] = useState<ProductStatus | 'all'>(() => {
    const s = params.get('durum') as ProductStatus | null;
    return s && productStatuses.includes(s) ? s : 'all';
  });
  const [sort, setSort] = useState<NonNullable<ProductQuery['sort']>>(
    initialSort && (sortKeys as readonly string[]).includes(initialSort) ? initialSort : 'created',
  );
  const [dir, setDir] = useState<NonNullable<ProductQuery['dir']>>(
    params.get('yon') === 'asc' ? 'asc' : 'desc',
  );
  const [page, setPage] = useState(() => Math.max(1, Number(params.get('sayfa')) || 1));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkCategory, setBulkCategory] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Toplu SEO: seçili ürünler veya tüm katalog.
  const [seoTarget, setSeoTarget] = useState<'selected' | 'all' | null>(null);

  const debouncedSearch = useDebounced(search, 200);

  // Filtre değişince ilk sayfaya dön; ilk açılışta adresteki sayfa korunur.
  const filterKey = [debouncedSearch, categoryId, collectionId, statusFilter, sort, dir].join('|');
  const prevFilterKey = useRef(filterKey);
  useEffect(() => {
    if (prevFilterKey.current === filterKey) return;
    prevFilterKey.current = filterKey;
    setPage(1);
  }, [filterKey]);

  useEffect(() => {
    const qs = new URLSearchParams();
    if (debouncedSearch) qs.set('search', debouncedSearch);
    if (categoryId) qs.set('kategori', categoryId);
    if (collectionId) qs.set('koleksiyon', collectionId);
    if (statusFilter !== 'all') qs.set('durum', statusFilter);
    if (sort !== 'created') qs.set('sort', sort);
    if (dir !== 'desc') qs.set('yon', dir);
    if (page > 1) qs.set('sayfa', String(page));
    const next = qs.size ? `?${qs.toString()}` : '';
    if (next !== window.location.search) router.replace(`/admin/urunler${next}`, { scroll: false });
  }, [debouncedSearch, categoryId, collectionId, statusFilter, sort, dir, page, router]);

  // Ürünler başka sekmede düzenlenebildiği için sekmeye dönünce liste
  // sessizce tazelenir (görsel, fiyat, stok güncel görünür).
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void reload({ silent: true });
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [reload]);

  // Sayfa geçişi: listeyi tazele ve tablonun başına çık.
  const goToPage = (next: number) => {
    setPage(next);
    void reload({ silent: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const result = useMemo(() => {
    if (!catalog) return null;
    return listProducts(catalog, {
      search: debouncedSearch,
      categoryId: categoryId || undefined,
      collectionId: collectionId || undefined,
      status: statusFilter,
      sort,
      dir,
      page,
      pageSize: PAGE_SIZE,
    });
  }, [catalog, debouncedSearch, categoryId, collectionId, statusFilter, sort, dir, page]);

  const items = result?.items ?? [];
  const allOnPageSelected = items.length > 0 && items.every((p) => selected.has(p.id));

  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) items.forEach((p) => next.delete(p.id));
      else items.forEach((p) => next.add(p.id));
      return next;
    });
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const ids = useMemo(() => [...selected], [selected]);

  const runBulk = async (action: 'activate' | 'deactivate') => {
    if (!ids.length) return;
    const ok = await bulkProducts({ action, ids });
    if (ok) setSelected(new Set());
  };

  const runBulkStatus = async (value: ProductStatus) => {
    if (!ids.length) return;
    const ok = await bulkProducts({ action: 'status', ids, status: value });
    if (ok) setSelected(new Set());
  };

  const runBulkCategory = async () => {
    if (!ids.length || !bulkCategory) return;
    const ok = await bulkProducts({ action: 'category', ids, categoryIds: [bulkCategory] });
    if (ok) {
      setSelected(new Set());
      setBulkCategory('');
    }
  };

  const runBulkDelete = async () => {
    setConfirmDelete(false);
    if (!ids.length) return;
    const ok = await bulkProducts({ action: 'delete', ids });
    if (ok) setSelected(new Set());
  };

  const seoIds = seoTarget === 'all' ? (catalog?.products.map((p) => p.id) ?? []) : ids;
  const runBulkSeo = async () => {
    const target = seoTarget;
    setSeoTarget(null);
    if (!seoIds.length) return;
    const ok = await bulkProducts({ action: 'seo', ids: seoIds });
    if (ok && target === 'selected') setSelected(new Set());
  };

  const hasFilters =
    debouncedSearch || categoryId || collectionId || statusFilter !== 'all';

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-[var(--brand-purple-deep)]">Ürünler</h1>
          <p className="admin-hint mt-0.5">
            {result ? `${result.total} ürün` : '…'}
            {hasFilters ? ' (filtreli)' : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="admin-btn admin-btn-ghost"
            disabled={!canWrite}
            onClick={() => setPriceOpen(true)}
          >
            <Percent size={15} aria-hidden="true" /> Toplu fiyat
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-ghost"
            disabled={!canWrite || !catalog?.products.length}
            onClick={() => setSeoTarget('all')}
            title="Tüm ürünlerin SEO başlığı ve açıklamasını ürün açıklamasından üret"
          >
            <Wand2 size={15} aria-hidden="true" /> {"SEO'yu doldur"}
          </button>
          <Link href="/admin/urunler/cop-kutusu" className="admin-btn admin-btn-ghost">
            <Trash2 size={15} aria-hidden="true" /> Çöp kutusu
          </Link>
          <Link href="/admin/urunler/yeni" className="admin-btn admin-btn-primary">
            <Plus size={15} aria-hidden="true" /> Yeni ürün
          </Link>
        </div>
      </header>

      {/* Filtreler */}
      <div className="admin-card flex flex-wrap items-end gap-3" style={{ padding: 12 }}>
        <div className="admin-field min-w-[200px] flex-1">
          <label className="admin-label" htmlFor="flt-search">
            Ara
          </label>
          <input
            id="flt-search"
            type="search"
            className="admin-input"
            placeholder="Ad, slug, SKU, seri…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="admin-field">
          <label className="admin-label" htmlFor="flt-cat">
            Kategori
          </label>
          <select
            id="flt-cat"
            className="admin-select"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">Tümü</option>
            {categoryTree(categories).map(({ category: c, depth }) => (
              <option key={c.id} value={c.id}>
                {'— '.repeat(depth)}
                {c.name}
              </option>
            ))}
          </select>
        </div>
        {COLLECTIONS_ENABLED && (
          <div className="admin-field">
            <label className="admin-label" htmlFor="flt-col">
              Koleksiyon
            </label>
            <select
              id="flt-col"
              className="admin-select"
              value={collectionId}
              onChange={(e) => setCollectionId(e.target.value)}
            >
              <option value="">Tümü</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="admin-field">
          <label className="admin-label" htmlFor="flt-status">
            Durum
          </label>
          <select
            id="flt-status"
            className="admin-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ProductStatus | 'all')}
          >
            <option value="all">Tümü</option>
            {productStatuses.map((s) => (
              <option key={s} value={s}>
                {statusLabels[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="admin-field">
          <label className="admin-label" htmlFor="flt-sort">
            Sıralama
          </label>
          <select
            id="flt-sort"
            className="admin-select"
            value={`${sort}:${dir}`}
            onChange={(e) => {
              const [s, d] = e.target.value.split(':');
              setSort(s as NonNullable<ProductQuery['sort']>);
              setDir(d as NonNullable<ProductQuery['dir']>);
            }}
          >
            <option value="created:desc">En son yüklenen</option>
            <option value="created:asc">İlk yüklenen</option>
            <option value="updated:desc">En son güncellenen</option>
            <option value="updated:asc">En eski güncellenen</option>
            <option value="name:asc">Ada göre (A→Z)</option>
            <option value="name:desc">Ada göre (Z→A)</option>
            <option value="price:asc">Fiyat (artan)</option>
            <option value="price:desc">Fiyat (azalan)</option>
            <option value="stock:asc">Stok (az→çok)</option>
            <option value="stock:desc">Stok (çok→az)</option>
          </select>
        </div>
        {hasFilters && (
          <button
            type="button"
            className="admin-btn admin-btn-ghost admin-btn-sm"
            onClick={() => {
              setSearch('');
              setCategoryId('');
              setCollectionId('');
              setStatusFilter('all');
            }}
          >
            <X size={13} /> Temizle
          </button>
        )}
      </div>

      {/* Toplu işlem çubuğu */}
      {selected.size > 0 && (
        <div
          className="admin-card flex flex-wrap items-center gap-2"
          style={{ padding: 10, borderColor: 'var(--brand-purple)' }}
          role="region"
          aria-label="Toplu işlemler"
        >
          <span className="text-xs font-semibold text-[var(--brand-purple-deep)]">
            {selected.size} seçili
          </span>
          <button
            type="button"
            className="admin-btn admin-btn-ghost admin-btn-sm"
            disabled={!canWrite}
            onClick={() => runBulk('activate')}
          >
            Yayına al
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-ghost admin-btn-sm"
            disabled={!canWrite}
            onClick={() => runBulk('deactivate')}
          >
            Taslağa al
          </button>
          <select
            className="admin-select admin-btn-sm"
            style={{ width: 'auto' }}
            defaultValue=""
            disabled={!canWrite}
            aria-label="Toplu durum"
            onChange={(e) => {
              if (e.target.value) void runBulkStatus(e.target.value as ProductStatus);
              e.currentTarget.value = '';
            }}
          >
            <option value="" disabled>
              Durum ata…
            </option>
            {productStatuses.map((s) => (
              <option key={s} value={s}>
                {statusLabels[s]}
              </option>
            ))}
          </select>
          <span className="inline-flex items-center gap-1.5">
            <select
              className="admin-select admin-btn-sm"
              style={{ width: 'auto' }}
              value={bulkCategory}
              disabled={!canWrite}
              aria-label="Toplu kategori"
              onChange={(e) => setBulkCategory(e.target.value)}
            >
              <option value="">Kategori değiştir…</option>
              {categoryTree(categories).map(({ category: c, depth }) => (
                <option key={c.id} value={c.id}>
                  {'— '.repeat(depth)}
                  {c.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="admin-btn admin-btn-ghost admin-btn-sm"
              disabled={!canWrite || !bulkCategory}
              onClick={runBulkCategory}
            >
              Uygula
            </button>
          </span>
          <button
            type="button"
            className="admin-btn admin-btn-ghost admin-btn-sm"
            disabled={!canWrite}
            onClick={() => setPriceOpen(true)}
          >
            <Percent size={13} aria-hidden="true" /> İndirim / zam
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-ghost admin-btn-sm"
            disabled={!canWrite}
            onClick={() => setSeoTarget('selected')}
          >
            <Wand2 size={13} aria-hidden="true" /> {"SEO'yu doldur"}
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-danger admin-btn-sm"
            disabled={!canWrite}
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 size={13} aria-hidden="true" /> Çöpe taşı
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-ghost admin-btn-sm ml-auto"
            onClick={() => setSelected(new Set())}
          >
            Seçimi bırak
          </button>
        </div>
      )}

      {status === 'loading' || !result ? (
        <TableSkeleton rows={8} />
      ) : items.length === 0 ? (
        <div className="admin-card">
          <EmptyState
            title="Ürün bulunamadı"
            hint={hasFilters ? 'Filtreleri gevşetmeyi deneyin.' : 'İlk ürünü ekleyin.'}
            action={
              <Link href="/admin/urunler/yeni" className="admin-btn admin-btn-primary">
                <Plus size={15} /> Yeni ürün
              </Link>
            }
          />
        </div>
      ) : (
        <>
          {/* Masaüstü tablo */}
          <div className="admin-table-wrap admin-table-wrap--sticky admin-view-desktop">
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: 34 }}>
                    <input
                      type="checkbox"
                      aria-label="Sayfadaki tümünü seç"
                      checked={allOnPageSelected}
                      onChange={toggleAll}
                    />
                  </th>
                  <th style={{ width: 64 }} aria-label="Görsel" />
                  <th>Ürün</th>
                  <th>Kategori</th>
                  <th>Fiyat</th>
                  <th>Stok</th>
                  <th>Durum</th>
                  <th aria-label="İşlemler" />
                </tr>
              </thead>
              <tbody>
                {items.map((p) => {
                  const range = priceRangeOf(p.variants);
                  const stock = p.variants
                    .filter((v) => v.isActive)
                    .reduce((s, v) => s + v.stock, 0);
                  return (
                    <tr key={p.id} data-selected={selected.has(p.id)}>
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`${p.name} seç`}
                          checked={selected.has(p.id)}
                          onChange={() => toggleOne(p.id)}
                        />
                      </td>
                      <td>
                        <ProductThumb product={p} />
                      </td>
                      <td>
                        <Link
                          href={`/admin/urunler/${p.slug}`}
                          className="font-medium text-[var(--brand-purple-deep)] hover:underline"
                        >
                          {p.name}
                        </Link>
                        <span className="admin-hint block">
                          {p.variants.length} varyant · {p.slug}
                        </span>
                      </td>
                      <td className="text-[var(--admin-ink-soft)]">
                        {p.categoryIds.map(categoryName).join(', ') || '—'}
                      </td>
                      <td className="whitespace-nowrap">
                        {range.min === range.max
                          ? formatMinor(range.min)
                          : `${formatMinor(range.min)} – ${formatMinor(range.max)}`}
                      </td>
                      <td>
                        {stock <= 0 ? (
                          <span className="admin-badge admin-badge-stok">yok</span>
                        ) : (
                          <span className="tabular-nums">{stock}</span>
                        )}
                      </td>
                      <td>
                        <StatusToggle
                          status={p.status}
                          disabled={!canWrite || togglingId === p.id}
                          onToggle={() => void toggleStatus(p.id, p.status)}
                        />
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1.5">
                          <a
                            href={openInStorefrontPath(p.slug, p.status, storeUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="admin-btn admin-btn-ghost admin-btn-sm"
                            aria-label={
                              p.status === 'yayında'
                                ? `${p.name} ürününü vitrinde aç`
                                : `${p.name} ürününü önizle`
                            }
                            title={p.status === 'yayında' ? 'Vitrinde aç' : 'Önizle'}
                          >
                            {p.status === 'yayında' ? <ExternalLink size={13} /> : <Eye size={13} />}
                          </a>
                          <button
                            type="button"
                            className="admin-btn admin-btn-ghost admin-btn-sm"
                            disabled={!canWrite || duplicatingId === p.id}
                            onClick={() => void duplicate(p.id)}
                            aria-label={`${p.name} ürününü kopyala`}
                            title="Kopyala — taslak kopyayı yeni sekmede düzenlemeye aç"
                          >
                            <Copy size={13} />
                          </button>
                          <Link
                            href={`/admin/urunler/${p.slug}`}
                            className="admin-btn admin-btn-ghost admin-btn-sm"
                          >
                            Düzenle
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobil kartlar */}
          <div className="admin-card-list admin-view-mobile">
            {items.map((p) => {
              const range = priceRangeOf(p.variants);
              return (
                <article key={p.id} className="admin-row-card" data-selected={selected.has(p.id)}>
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      aria-label={`${p.name} seç`}
                      checked={selected.has(p.id)}
                      onChange={() => toggleOne(p.id)}
                      className="mt-1"
                    />
                    <ProductThumb product={p} size={52} />
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/admin/urunler/${p.slug}`}
                        className="font-medium text-[var(--brand-purple-deep)]"
                      >
                        {p.name}
                      </Link>
                      <p className="admin-hint">{p.categoryIds.map(categoryName).join(', ')}</p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <StatusToggle
                          status={p.status}
                          disabled={!canWrite || togglingId === p.id}
                          onToggle={() => void toggleStatus(p.id, p.status)}
                        />
                        <span className="text-xs text-[var(--admin-ink-soft)]">
                          {range.min === range.max
                            ? formatMinor(range.min)
                            : `${formatMinor(range.min)}–${formatMinor(range.max)}`}
                        </span>
                        <button
                          type="button"
                          className="admin-btn admin-btn-ghost admin-btn-sm ml-auto"
                          disabled={!canWrite || duplicatingId === p.id}
                          onClick={() => void duplicate(p.id)}
                          aria-label={`${p.name} ürününü kopyala`}
                        >
                          <Copy size={13} /> Kopyala
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Sayfalama */}
          <Pagination page={result.page} pageCount={result.pageCount} onChange={goToPage} />
        </>
      )}

      <PriceAdjustDialog
        open={priceOpen}
        onClose={() => setPriceOpen(false)}
        selectedIds={ids}
        products={catalog?.products ?? []}
        categories={categories}
        onDone={async () => {
          await reload();
          setSelected(new Set());
        }}
      />

      <ConfirmDialog
        open={seoTarget !== null}
        title={
          seoTarget === 'all'
            ? `${seoIds.length} ürünün tamamının SEO alanları doldurulsun mu?`
            : `${seoIds.length} ürünün SEO alanları doldurulsun mu?`
        }
        description="SEO başlığı ürün adından, SEO açıklaması ürünün uzun açıklamasının giriş cümlelerinden üretilir. Mevcut SEO metinlerinin üzerine yazılır."
        confirmLabel="SEO'yu doldur"
        onConfirm={runBulkSeo}
        onCancel={() => setSeoTarget(null)}
      />

      <ConfirmDialog
        open={confirmDelete}
        title={`${selected.size} ürün çöp kutusuna taşınsın mı?`}
        description="Ürünler vitrinden kaldırılır. 30 gün boyunca Çöp kutusundan geri yükleyebilirsiniz."
        confirmLabel="Çöpe taşı"
        destructive
        onConfirm={runBulkDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}

export default function AdminProductsPage() {
  return (
    <Suspense fallback={<TableSkeleton rows={8} />}>
      <ProductsView />
    </Suspense>
  );
}
