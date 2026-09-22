'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Copy, ExternalLink, Eye, Plus, X } from 'lucide-react';
import type { ProductStatus } from '@/types/admin';
import { productStatuses, statusLabels } from '@/types/admin';
import { useAdminData } from '@/components/admin/AdminDataProvider';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { EmptyState, StatusBadge, TableSkeleton } from '@/components/admin/primitives';
import { categoryTree, listProducts, type ProductQuery } from '@/lib/admin/mutations';
import { priceRangeOf } from '@/lib/admin/variants';
import { formatMinor } from '@/lib/admin/format';
import { useDebounced } from '@/lib/hooks';
import { openInStorefrontPath } from '@/lib/admin/preview';

const PAGE_SIZE = 20;

function ProductsView() {
  const params = useSearchParams();
  const {
    status,
    catalog,
    categories,
    collections,
    categoryName,
    bulkProducts,
    duplicateProduct,
    canWrite,
  } = useAdminData();

  // Aynı satıra iki kez basılmasın diye çoğaltılan ürün kilitlenir.
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  const duplicate = async (id: string) => {
    setDuplicatingId(id);
    await duplicateProduct(id);
    setDuplicatingId(null);
  };

  const [search, setSearch] = useState(params.get('search') ?? '');
  const [categoryId, setCategoryId] = useState('');
  const [collectionId, setCollectionId] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProductStatus | 'all'>('all');
  const [sort, setSort] = useState<NonNullable<ProductQuery['sort']>>('updated');
  const [dir, setDir] = useState<NonNullable<ProductQuery['dir']>>('desc');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkCategory, setBulkCategory] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const debouncedSearch = useDebounced(search, 200);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, categoryId, collectionId, statusFilter, sort, dir]);

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

  const ids = [...selected];

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
        <Link href="/admin/urunler/yeni" className="admin-btn admin-btn-primary">
          <Plus size={15} aria-hidden="true" /> Yeni ürün
        </Link>
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
            className="admin-btn admin-btn-danger admin-btn-sm"
            disabled={!canWrite}
            onClick={() => setConfirmDelete(true)}
          >
            Sil
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
                        <StatusBadge status={p.status} />
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1.5">
                          <a
                            href={openInStorefrontPath(p.slug, p.status)}
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
                            aria-label={`${p.name} ürününü çoğalt`}
                            title="Taslak kopya oluştur"
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
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/admin/urunler/${p.slug}`}
                        className="font-medium text-[var(--brand-purple-deep)]"
                      >
                        {p.name}
                      </Link>
                      <p className="admin-hint">{p.categoryIds.map(categoryName).join(', ')}</p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <StatusBadge status={p.status} />
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
                          aria-label={`${p.name} ürününü çoğalt`}
                        >
                          <Copy size={13} /> Çoğalt
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Sayfalama */}
          {result.pageCount > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                className="admin-btn admin-btn-ghost admin-btn-sm"
                disabled={result.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Önceki
              </button>
              <span className="text-xs text-[var(--admin-ink-soft)]">
                {result.page} / {result.pageCount}
              </span>
              <button
                type="button"
                className="admin-btn admin-btn-ghost admin-btn-sm"
                disabled={result.page >= result.pageCount}
                onClick={() => setPage((p) => Math.min(result.pageCount, p + 1))}
              >
                Sonraki
              </button>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title={`${selected.size} ürünü sil?`}
        description="Bu işlem geri alınamaz. Ürünler katalogdan kaldırılır."
        confirmLabel="Sil"
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
