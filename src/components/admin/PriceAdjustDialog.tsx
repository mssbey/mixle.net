'use client';

import { useEffect, useState } from 'react';
import type { AdminCategory } from '@/types/admin';
import { Dialog } from '@/components/admin/orders/Dialog';
import { adminApi, ApiError } from '@/lib/admin/client';
import { categoryTree } from '@/lib/admin/mutations';
import type { PriceAdjustInput, PriceMode, PriceScope } from '@/lib/admin/pricing';
import { toast } from '@/store/toast';

const MODES: { id: PriceMode; label: string; hint: string }[] = [
  { id: 'indirim', label: '% İndirim', hint: 'Orijinal fiyat üstü çizili görünür; indirimli ürüne tekrar uygulanırsa orijinal fiyattan hesaplanır.' },
  { id: 'zam', label: '% Zam', hint: 'Satış fiyatı (ve varsa üstü çizili fiyat) aynı oranda artar.' },
  { id: 'indirim-kaldir', label: 'İndirimi kaldır', hint: 'Üstü çizili fiyat yeniden satış fiyatı olur.' },
];

/**
 * Toplu fiyat güncelleme: seçili ürünler, kategoriler (alt kategoriler dahil)
 * ya da tüm ürünler için yüzde indirim / zam.
 */
export function PriceAdjustDialog({
  open,
  onClose,
  selectedIds,
  categories,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  selectedIds: string[];
  categories: AdminCategory[];
  onDone: () => void | Promise<void>;
}) {
  const [scope, setScope] = useState<PriceScope>('tumu');
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [mode, setMode] = useState<PriceMode>('indirim');
  const [percent, setPercent] = useState('10');
  const [roundLira, setRoundLira] = useState(false);
  const [preview, setPreview] = useState<{ products: number; variants: number } | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Diyalog açılırken seçim varsa kapsam "seçili ürünler" olur.
  useEffect(() => {
    if (open) setScope(selectedIds.length > 0 ? 'secili' : 'tumu');
  }, [open, selectedIds.length]);

  const input: PriceAdjustInput = {
    scope,
    ids: scope === 'secili' ? selectedIds : [],
    categoryIds: scope === 'kategori' ? categoryIds : [],
    mode,
    percent: Number(percent.replace(',', '.')) || 0,
    roundLira,
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
        .then((r) => setPreview({ products: r.products, variants: r.variants }))
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

  const modeInfo = MODES.find((m) => m.id === mode);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Toplu fiyat güncelle"
      description="Belirli ürünlere, kategorilere ya da tüm ürünlere yüzde indirim veya zam uygulayın."
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
        <fieldset>
          <legend className="admin-label mb-1.5">Hangi ürünler?</legend>
          <div className="flex flex-col gap-1.5 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="pa-scope"
                checked={scope === 'secili'}
                disabled={selectedIds.length === 0}
                onChange={() => setScope('secili')}
              />
              Seçili ürünler ({selectedIds.length})
              {selectedIds.length === 0 && (
                <span className="admin-hint">— listeden ürün işaretleyin</span>
              )}
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="pa-scope" checked={scope === 'kategori'} onChange={() => setScope('kategori')} />
              Belirli kategoriler (alt kategoriler dahil)
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="pa-scope" checked={scope === 'tumu'} onChange={() => setScope('tumu')} />
              Tüm ürünler
            </label>
          </div>
          {scope === 'kategori' && (
            <div className="mt-2 max-h-48 overflow-y-auto rounded border border-[var(--admin-line)] p-2">
              {categoryTree(categories).map(({ category: c, depth }) => (
                <label key={c.id} className="flex items-center gap-2 py-0.5 text-sm" style={{ paddingLeft: depth * 16 }}>
                  <input
                    type="checkbox"
                    checked={categoryIds.includes(c.id)}
                    onChange={(e) =>
                      setCategoryIds((prev) =>
                        e.target.checked ? [...prev, c.id] : prev.filter((x) => x !== c.id),
                      )
                    }
                  />
                  {c.name}
                </label>
              ))}
            </div>
          )}
        </fieldset>

        <fieldset>
          <legend className="admin-label mb-1.5">İşlem</legend>
          <div className="flex flex-wrap gap-1.5">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                className="admin-chip"
                aria-pressed={mode === m.id}
                style={
                  mode === m.id
                    ? { background: 'var(--brand-purple)', color: '#fff', borderColor: 'transparent' }
                    : undefined
                }
                onClick={() => setMode(m.id)}
              >
                {m.label}
              </button>
            ))}
          </div>
          {modeInfo && <p className="admin-hint mt-1">{modeInfo.hint}</p>}
        </fieldset>

        {mode !== 'indirim-kaldir' && (
          <div className="flex flex-wrap items-end gap-4">
            <label className="admin-field" style={{ width: 140 }}>
              <span className="admin-label">Oran (%)</span>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                max={mode === 'indirim' ? 99 : 500}
                step="0.5"
                className="admin-input"
                value={percent}
                onChange={(e) => setPercent(e.target.value)}
              />
            </label>
            <label className="flex items-center gap-2 pb-2 text-sm">
              <input type="checkbox" checked={roundLira} onChange={(e) => setRoundLira(e.target.checked)} />
              Tam liraya yuvarla
            </label>
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
                : `${preview.products} ürünün ${preview.variants} varyantının fiyatı değişecek.`
              : 'Hesaplanıyor…'}
        </p>
      </div>
    </Dialog>
  );
}
