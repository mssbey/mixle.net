'use client';

import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import type { AdminCategory, AdminProduct } from '@/types/admin';
import { Dialog } from '@/components/admin/orders/Dialog';
import { adminApi, ApiError } from '@/lib/admin/client';
import { categoryTree } from '@/lib/admin/mutations';
import { formatMinor } from '@/lib/admin/format';
import type { PriceAdjustInput, PriceMode, PriceScope, PriceValueType } from '@/lib/admin/pricing';
import { toast } from '@/store/toast';

const MODES: { id: PriceMode; label: string; hint: string }[] = [
  {
    id: 'dusur',
    label: 'Fiyatı düşür',
    hint: 'Satış fiyatı doğrudan düşer; üstü çizili eski fiyat ya da indirim rozeti görünmez. Ör. %10: 100 ₺ → 90 ₺, tekrar uygulanırsa 90 ₺ → 81 ₺.',
  },
  { id: 'artir', label: 'Fiyatı artır', hint: 'Satış fiyatı doğrudan artar. Ör. %10: 100 ₺ → 110 ₺.' },
  {
    id: 'indirim-kaldir',
    label: 'Üstü çizili indirimi kaldır',
    hint: 'Önceden girilmiş üstü çizili fiyat yeniden satış fiyatı olur ve indirim rozeti kalkar.',
  },
];

const lower = (s: string) => s.toLocaleLowerCase('tr');

/**
 * Toplu fiyat güncelleme: seçilen ürünlere, kategorilere (alt kategoriler
 * dahil) ya da tüm ürünlere yüzde / sabit tutar kadar fiyat düşürme veya artırma.
 */
export function PriceAdjustDialog({
  open,
  onClose,
  selectedIds,
  products,
  categories,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  selectedIds: string[];
  products: AdminProduct[];
  categories: AdminCategory[];
  onDone: () => void | Promise<void>;
}) {
  const [scope, setScope] = useState<PriceScope>('kategori');
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [productIds, setProductIds] = useState<string[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [mode, setMode] = useState<PriceMode>('dusur');
  const [valueType, setValueType] = useState<PriceValueType>('yuzde');
  const [value, setValue] = useState('10');
  const [roundUp, setRoundUp] = useState(false);
  const [preview, setPreview] = useState<{
    products: number;
    variants: number;
    skipped: number;
    sample: { before: number; after: number } | null;
  } | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Diyalog açılırken listede işaretli ürün varsa "ürünlere göre" ile başlar.
  useEffect(() => {
    if (!open) return;
    setProductIds(selectedIds);
    setProductSearch('');
    setScope(selectedIds.length > 0 ? 'secili' : 'kategori');
  }, [open, selectedIds]);

  const input: PriceAdjustInput = {
    scope,
    ids: scope === 'secili' ? productIds : [],
    categoryIds: scope === 'kategori' ? categoryIds : [],
    mode,
    valueType,
    value: Number(value.replace(',', '.')) || 0,
    roundUp,
  };
  const inputKey = JSON.stringify(input);

  // Uygulamadan önce kaç ürünün etkileneceğini gösterir (yazmadan).
  useEffect(() => {
    if (!open) return;
    setPreview(null);
    setPreviewError(null);
    const t = window.setTimeout(() => {
      adminApi
        .adjustPrices({ ...(JSON.parse(inputKey) as PriceAdjustInput), dryRun: true })
        .then((r) => setPreview(r))
        .catch((err: unknown) =>
          setPreviewError(
            err instanceof ApiError ? (Object.values(err.issues)[0] ?? err.message) : 'Önizleme alınamadı',
          ),
        );
    }, 300);
    return () => window.clearTimeout(t);
  }, [open, inputKey]);

  const apply = async () => {
    setBusy(true);
    try {
      const r = await adminApi.adjustPrices(input);
      toast.success('Fiyatlar güncellendi', `${r.products} ürün · ${r.variants} varyant`);
      await onDone();
      onClose();
    } catch (err) {
      toast.error(
        'Fiyat güncellenemedi',
        err instanceof ApiError ? (Object.values(err.issues)[0] ?? err.message) : undefined,
      );
    } finally {
      setBusy(false);
    }
  };

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const productMatches = useMemo(() => {
    const term = lower(productSearch.trim());
    if (!term) return [];
    return products
      .filter((p) => lower(p.name).includes(term) || p.variants.some((v) => v.sku && lower(v.sku).includes(term)))
      .slice(0, 40);
  }, [products, productSearch]);

  const toggleProduct = (id: string, on: boolean) =>
    setProductIds((prev) => (on ? (prev.includes(id) ? prev : [...prev, id]) : prev.filter((x) => x !== id)));

  const modeInfo = MODES.find((m) => m.id === mode);
  const needsValue = mode !== 'indirim-kaldir';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Toplu fiyat güncelle"
      description="Kategorilere, belirli ürünlere ya da tüm ürünlere fiyat düşürme veya artırma uygulayın. Tüm varyantların fiyatı birlikte değişir."
      footer={
        <>
          <button type="button" className="admin-btn admin-btn-ghost" onClick={onClose}>
            Vazgeç
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            disabled={busy || !preview || preview.variants === 0}
            onClick={() => void apply()}
          >
            {busy ? 'Uygulanıyor…' : 'Uygula'}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <label className="admin-field">
          <span className="admin-label">İşlem türü</span>
          <select className="admin-select" value={mode} onChange={(e) => setMode(e.target.value as PriceMode)}>
            {MODES.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
          {modeInfo && <span className="admin-hint">{modeInfo.hint}</span>}
        </label>

        {needsValue && (
          <>
            <div className="flex flex-wrap items-end gap-3">
              <label className="admin-field" style={{ width: 180 }}>
                <span className="admin-label">Değer türü</span>
                <select
                  className="admin-select"
                  value={valueType}
                  onChange={(e) => setValueType(e.target.value as PriceValueType)}
                >
                  <option value="yuzde">Yüzde (%)</option>
                  <option value="tutar">Sabit tutar (₺)</option>
                </select>
              </label>
              <label className="admin-field" style={{ width: 160 }}>
                <span className="admin-label">
                  {valueType === 'yuzde' ? (mode === 'dusur' ? 'Yüzde (0–99)' : 'Yüzde') : 'Tutar (₺)'}
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={valueType === 'yuzde' ? (mode === 'dusur' ? 99 : 500) : undefined}
                  step={valueType === 'yuzde' ? '0.5' : '0.01'}
                  className="admin-input"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                />
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={roundUp} onChange={(e) => setRoundUp(e.target.checked)} />
              Küsüratı bir üst liraya yuvarla
              <span className="admin-hint">(ör. 183,56 ₺ → 184 ₺)</span>
            </label>
          </>
        )}

        <label className="admin-field">
          <span className="admin-label">Ürün seçimi</span>
          <select className="admin-select" value={scope} onChange={(e) => setScope(e.target.value as PriceScope)}>
            <option value="kategori">Kategorilere göre (alt kategoriler dahil)</option>
            <option value="secili">Ürünlere göre</option>
            <option value="tumu">Tüm ürünler</option>
          </select>
        </label>

        {scope === 'kategori' && (
          <div className="max-h-56 overflow-y-auto rounded border border-[var(--admin-line)] p-2">
            {categoryTree(categories).map(({ category: c, depth }) => (
              <label key={c.id} className="flex items-center gap-2 py-0.5 text-sm" style={{ paddingLeft: depth * 16 }}>
                <input
                  type="checkbox"
                  checked={categoryIds.includes(c.id)}
                  onChange={(e) =>
                    setCategoryIds((prev) => (e.target.checked ? [...prev, c.id] : prev.filter((x) => x !== c.id)))
                  }
                />
                {c.name}
              </label>
            ))}
          </div>
        )}

        {scope === 'secili' && (
          <div className="flex flex-col gap-2">
            {productIds.length > 0 && (
              <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
                {productIds.map((id) => (
                  <span key={id} className="admin-chip inline-flex items-center gap-1">
                    {productById.get(id)?.name ?? id}
                    <button
                      type="button"
                      aria-label="Seçimden çıkar"
                      className="opacity-60 hover:opacity-100"
                      onClick={() => toggleProduct(id, false)}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <input
              type="search"
              className="admin-input"
              placeholder="Ürün adı ya da SKU ile ara…"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
            />
            {productSearch.trim() && (
              <div className="max-h-48 overflow-y-auto rounded border border-[var(--admin-line)] p-2">
                {productMatches.length === 0 ? (
                  <p className="admin-hint">Eşleşen ürün yok.</p>
                ) : (
                  productMatches.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 py-0.5 text-sm">
                      <input
                        type="checkbox"
                        checked={productIds.includes(p.id)}
                        onChange={(e) => toggleProduct(p.id, e.target.checked)}
                      />
                      <span className="truncate">{p.name}</span>
                      {p.variants.length > 1 && <span className="admin-hint">· {p.variants.length} varyant</span>}
                    </label>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        <p
          className="rounded p-2.5 text-sm"
          style={{ background: previewError ? '#fef2f2' : '#f5f6f8', color: previewError ? '#b4232f' : undefined }}
          aria-live="polite"
        >
          {previewError
            ? previewError
            : preview
              ? preview.variants === 0
                ? 'Bu seçimle değişecek fiyat yok.'
                : `${preview.products} ürünün ${preview.variants} varyantının fiyatı değişecek.${
                    preview.sample
                      ? ` Örnek: ${formatMinor(preview.sample.before)} → ${formatMinor(preview.sample.after)}.`
                      : ''
                  }${preview.skipped ? ` ${preview.skipped} varyant fiyatı 0’ın altına düşeceği için atlanacak.` : ''}`
              : 'Hesaplanıyor…'}
        </p>
      </div>
    </Dialog>
  );
}
