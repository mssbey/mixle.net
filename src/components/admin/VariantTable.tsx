'use client';

import { Fragment, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { AdminProduct, AdminVariant } from '@/types/admin';
import {
  applyToAll,
  comboLabel,
  ensureSingleDefault,
  priceRangeOf,
  setDefaultVariant,
  type BulkVariantPatch,
} from '@/lib/admin/variants';
import { formatMinor, fromMinor, toMinor } from '@/lib/admin/format';

interface Props {
  product: AdminProduct;
  variants: AdminVariant[];
  disabled?: boolean;
  onChange: (variants: AdminVariant[]) => void;
}

export function VariantTable({ product, variants, disabled, onChange }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [bulkPrice, setBulkPrice] = useState('');
  const [bulkStock, setBulkStock] = useState('');
  const [bulkDiscount, setBulkDiscount] = useState('');

  const range = priceRangeOf(variants);

  const patch = (id: string, fields: Partial<AdminVariant>) => {
    onChange(variants.map((v) => (v.id === id ? { ...v, ...fields } : v)));
  };

  const applyBulk = (p: BulkVariantPatch) => {
    onChange(ensureSingleDefault(applyToAll(variants, p), variants));
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const num = (v: string) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Hızlı işlemler */}
      <div className="flex flex-wrap items-end gap-2 rounded-xl bg-[#f7f4ef] p-2.5">
        <span className="text-xs font-semibold text-[var(--admin-ink-soft)]">
          Tüm satırlara uygula:
        </span>
        <label className="flex items-center gap-1 text-xs">
          Fiyat
          <input
            type="number"
            min={0}
            step="0.01"
            className="admin-input admin-btn-sm"
            style={{ width: 90 }}
            value={bulkPrice}
            disabled={disabled}
            onChange={(e) => setBulkPrice(e.target.value)}
          />
          <button
            type="button"
            className="admin-btn admin-btn-ghost admin-btn-sm"
            disabled={disabled || bulkPrice === ''}
            onClick={() => {
              applyBulk({ kind: 'priceMinor', value: toMinor(num(bulkPrice)) });
              setBulkPrice('');
            }}
          >
            Uygula
          </button>
        </label>
        <label className="flex items-center gap-1 text-xs">
          Stok
          <input
            type="number"
            min={0}
            className="admin-input admin-btn-sm"
            style={{ width: 80 }}
            value={bulkStock}
            disabled={disabled}
            onChange={(e) => setBulkStock(e.target.value)}
          />
          <button
            type="button"
            className="admin-btn admin-btn-ghost admin-btn-sm"
            disabled={disabled || bulkStock === ''}
            onClick={() => {
              applyBulk({ kind: 'stock', value: num(bulkStock) });
              setBulkStock('');
            }}
          >
            Uygula
          </button>
        </label>
        <label className="flex items-center gap-1 text-xs">
          İndirim %
          <input
            type="number"
            min={0}
            max={90}
            className="admin-input admin-btn-sm"
            style={{ width: 70 }}
            value={bulkDiscount}
            disabled={disabled}
            onChange={(e) => setBulkDiscount(e.target.value)}
          />
          <button
            type="button"
            className="admin-btn admin-btn-ghost admin-btn-sm"
            disabled={disabled || bulkDiscount === ''}
            onClick={() => {
              applyBulk({ kind: 'discountPercent', value: num(bulkDiscount) });
              setBulkDiscount('');
            }}
          >
            Uygula
          </button>
        </label>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: 30 }} aria-label="Genişlet" />
              <th style={{ width: 60 }}>Varsayılan</th>
              <th style={{ width: 50 }}>Aktif</th>
              <th>Varyant</th>
              <th>SKU</th>
              <th style={{ width: 110 }}>Fiyat</th>
              <th style={{ width: 120 }}>İndirim öncesi</th>
              <th style={{ width: 90 }}>Stok</th>
            </tr>
          </thead>
          <tbody>
            {variants.map((v) => {
              const isOpen = expanded.has(v.id);
              return (
                <Fragment key={v.id}>
                  <tr data-selected={v.isDefault}>
                    <td>
                      <button
                        type="button"
                        onClick={() => toggleExpand(v.id)}
                        aria-label={isOpen ? 'Satırı kapat' : 'Satırı genişlet'}
                        aria-expanded={isOpen}
                        className="text-[var(--admin-ink-soft)]"
                      >
                        {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                      </button>
                    </td>
                    <td>
                      <input
                        type="radio"
                        name={`default-${product.id}`}
                        aria-label={`${comboLabel(product, v)} varsayılan`}
                        checked={v.isDefault}
                        disabled={disabled}
                        onChange={() => onChange(setDefaultVariant(variants, v.id))}
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`${comboLabel(product, v)} aktif`}
                        checked={v.isActive}
                        disabled={disabled || v.isDefault}
                        onChange={(e) => patch(v.id, { isActive: e.target.checked })}
                      />
                    </td>
                    <td className="font-medium text-[var(--brand-purple-deep)]">
                      {comboLabel(product, v)}
                    </td>
                    <td>
                      <input
                        className="admin-input admin-btn-sm"
                        style={{ width: 150 }}
                        value={v.sku}
                        disabled={disabled}
                        aria-label="SKU"
                        onChange={(e) => patch(v.id, { sku: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        className="admin-input admin-btn-sm"
                        style={{ width: 90 }}
                        value={fromMinor(v.priceMinor)}
                        disabled={disabled}
                        aria-label="Fiyat"
                        onChange={(e) => patch(v.id, { priceMinor: toMinor(num(e.target.value)) })}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        className="admin-input admin-btn-sm"
                        style={{ width: 100 }}
                        value={
                          v.compareAtPriceMinor == null ? '' : fromMinor(v.compareAtPriceMinor)
                        }
                        disabled={disabled}
                        aria-label="İndirim öncesi fiyat"
                        placeholder="—"
                        onChange={(e) =>
                          patch(v.id, {
                            compareAtPriceMinor:
                              e.target.value === '' ? null : toMinor(num(e.target.value)),
                          })
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min={0}
                        className="admin-input admin-btn-sm"
                        style={{ width: 70 }}
                        value={v.stock}
                        disabled={disabled}
                        aria-label="Stok"
                        onChange={(e) =>
                          patch(v.id, { stock: Math.max(0, Math.round(num(e.target.value))) })
                        }
                      />
                    </td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td />
                      <td colSpan={7}>
                        <div className="grid gap-3 py-1 sm:grid-cols-2">
                          <label className="admin-field">
                            <span className="admin-label">Barkod</span>
                            <input
                              className="admin-input"
                              value={v.barcode ?? ''}
                              disabled={disabled}
                              onChange={(e) =>
                                patch(v.id, { barcode: e.target.value || null })
                              }
                            />
                          </label>
                          <label className="admin-field">
                            <span className="admin-label">Varyant görseli (yol)</span>
                            <input
                              className="admin-input"
                              placeholder="/images/…"
                              value={v.image ?? ''}
                              disabled={disabled}
                              onChange={(e) => patch(v.id, { image: e.target.value || null })}
                            />
                          </label>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="admin-hint">
        Fiyat aralığı:{' '}
        {range.min === range.max
          ? formatMinor(range.min)
          : `${formatMinor(range.min)} – ${formatMinor(range.max)}`}{' '}
        · {variants.filter((v) => v.isActive).length}/{variants.length} varyant aktif
      </p>
    </div>
  );
}
