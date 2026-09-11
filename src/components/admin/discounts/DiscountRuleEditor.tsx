'use client';

// Gelişmiş indirim kuralı oluştur/düzenle diyaloğu.

import { useState } from 'react';
import { Dialog } from '@/components/admin/orders/Dialog';
import { Field } from '@/components/admin/primitives';
import { useAdminData } from '@/components/admin/AdminDataProvider';
import {
  discountRulesApi,
  type AdminDiscountRule,
  type DiscountRuleInput,
} from '@/lib/admin/discount-rules-client';
import { ApiError } from '@/lib/admin/client';
import { minorToInput, parseMajorInput, bpsToPercent } from '@/lib/money';
import { toast } from '@/store/toast';

function empty(): DiscountRuleInput {
  return {
    name: '',
    type: 'sepet-yuzde',
    isActive: true,
    priority: 0,
    stackable: true,
    includeCategoryIds: [],
    includeProductIds: [],
    percentBps: 3000,
    minCartTotalMinor: null,
    buyQuantity: null,
    payQuantity: null,
    minQuantity: null,
    startsAt: null,
    endsAt: null,
  };
}

function toDateInput(iso: string | null): string {
  return iso ? iso.slice(0, 10) : '';
}
function fromDateInput(v: string, endOfDay: boolean): string | null {
  if (!v) return null;
  return new Date(`${v}T${endOfDay ? '23:59:59' : '00:00:00'}`).toISOString();
}
function numOrNull(v: string): number | null {
  const n = Number(v);
  return v.trim() === '' || !Number.isFinite(n) ? null : Math.trunc(n);
}

export function DiscountRuleEditor({
  rule,
  open,
  onClose,
  onSaved,
}: {
  rule: AdminDiscountRule | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { products, categories } = useAdminData();
  const [r, setR] = useState<DiscountRuleInput>(rule ?? empty());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [percentText, setPercentText] = useState(
    rule && rule.type === 'sepet-yuzde' ? String(bpsToPercent(rule.percentBps)) : '30',
  );

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const patch: DiscountRuleInput = { ...r };
      if (patch.type === 'sepet-yuzde') {
        patch.percentBps = Math.round((Number(percentText.replace(',', '.')) || 0) * 100);
      }
      const saved = rule
        ? await discountRulesApi.update(rule.id, patch)
        : await discountRulesApi.create(patch);
      toast.success(rule ? 'İndirim kuralı güncellendi' : 'İndirim kuralı oluşturuldu', saved.rule.name);
      onSaved();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? (Object.values(err.issues)[0] ?? err.message)
          : err instanceof Error
            ? err.message
            : 'Kaydedilemedi',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={rule ? `İndirim kuralını düzenle — ${rule.name}` : 'Yeni indirim kuralı'}
      wide
      footer={
        <>
          <button type="button" className="admin-btn admin-btn-ghost" onClick={onClose} disabled={busy}>
            Vazgeç
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            disabled={busy || !r.name.trim()}
            onClick={() => void save()}
          >
            {busy ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Kural adı" htmlFor="dr-name" required>
          <input
            id="dr-name"
            className="admin-input"
            value={r.name}
            onChange={(e) => setR({ ...r, name: e.target.value })}
          />
        </Field>
        <Field label="İndirim Tipi" htmlFor="dr-type">
          <select
            id="dr-type"
            className="admin-select"
            value={r.type}
            onChange={(e) => setR({ ...r, type: e.target.value as DiscountRuleInput['type'] })}
          >
            <option value="sepet-yuzde">Sepet Tutarı İndirimi</option>
            <option value="x-al-y-ode">X Al Y Öde</option>
          </select>
        </Field>

        {r.type === 'sepet-yuzde' && (
          <>
            <Field label="İndirim yüzdesi (%)" htmlFor="dr-percent" required>
              <input
                id="dr-percent"
                className="admin-input"
                inputMode="decimal"
                value={percentText}
                onChange={(e) => setPercentText(e.target.value)}
              />
            </Field>
            <Field
              label="Minimum sepet tutarı (opsiyonel)"
              htmlFor="dr-min-cart"
              hint="Uygun ürünlerin toplamı bu tutarı geçince kural uygulanır."
            >
              <input
                id="dr-min-cart"
                className="admin-input"
                inputMode="decimal"
                value={r.minCartTotalMinor == null ? '' : minorToInput(r.minCartTotalMinor)}
                onChange={(e) =>
                  setR({
                    ...r,
                    minCartTotalMinor: e.target.value.trim()
                      ? (parseMajorInput(e.target.value) ?? null)
                      : null,
                  })
                }
                placeholder="Yok"
              />
            </Field>
          </>
        )}

        {r.type === 'x-al-y-ode' && (
          <>
            <Field label="Alınan adet (X)" htmlFor="dr-buy" required>
              <input
                id="dr-buy"
                type="number"
                min={1}
                className="admin-input"
                value={r.buyQuantity ?? ''}
                onChange={(e) => setR({ ...r, buyQuantity: numOrNull(e.target.value) })}
              />
            </Field>
            <Field label="Ödenen adet (Y)" htmlFor="dr-pay" required hint="Bedava adet = X − Y">
              <input
                id="dr-pay"
                type="number"
                min={0}
                className="admin-input"
                value={r.payQuantity ?? ''}
                onChange={(e) => setR({ ...r, payQuantity: numOrNull(e.target.value) })}
              />
            </Field>
            <Field
              label="Minimum ürün adedi (opsiyonel)"
              htmlFor="dr-min-qty"
              hint="Boşsa alınan adet (X) kadar kabul edilir."
            >
              <input
                id="dr-min-qty"
                type="number"
                min={1}
                className="admin-input"
                value={r.minQuantity ?? ''}
                onChange={(e) => setR({ ...r, minQuantity: numOrNull(e.target.value) })}
                placeholder={r.buyQuantity ? String(r.buyQuantity) : ''}
              />
            </Field>
          </>
        )}

        <Field label="Öncelik" htmlFor="dr-priority" hint="Küçük değer önce uygulanır.">
          <input
            id="dr-priority"
            type="number"
            min={0}
            className="admin-input"
            value={r.priority}
            onChange={(e) => setR({ ...r, priority: Math.max(0, numOrNull(e.target.value) ?? 0) })}
          />
        </Field>
        <div />

        <Field label="Başlangıç (opsiyonel)" htmlFor="dr-start">
          <input
            id="dr-start"
            type="date"
            className="admin-input"
            value={toDateInput(r.startsAt)}
            onChange={(e) => setR({ ...r, startsAt: fromDateInput(e.target.value, false) })}
          />
        </Field>
        <Field label="Bitiş (opsiyonel)" htmlFor="dr-end">
          <input
            id="dr-end"
            type="date"
            className="admin-input"
            value={toDateInput(r.endsAt)}
            onChange={(e) => setR({ ...r, endsAt: fromDateInput(e.target.value, true) })}
          />
        </Field>

        <Field label="Kategoriler (boş = tümü)" htmlFor="dr-cats">
          <select
            id="dr-cats"
            multiple
            className="admin-select"
            style={{ height: 120 }}
            value={r.includeCategoryIds}
            onChange={(e) =>
              setR({ ...r, includeCategoryIds: [...e.target.selectedOptions].map((o) => o.value) })
            }
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Ürünler (boş = tümü)" htmlFor="dr-prods">
          <select
            id="dr-prods"
            multiple
            className="admin-select"
            style={{ height: 120 }}
            value={r.includeProductIds}
            onChange={(e) =>
              setR({ ...r, includeProductIds: [...e.target.selectedOptions].map((o) => o.value) })
            }
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="mt-3 flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={r.isActive}
            onChange={(e) => setR({ ...r, isActive: e.target.checked })}
          />{' '}
          Aktif
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={r.stackable}
            onChange={(e) => setR({ ...r, stackable: e.target.checked })}
          />{' '}
          Diğer kurallarla birleşebilir
        </label>
      </div>

      {error && (
        <p className="admin-error mt-2" role="alert">
          {error}
        </p>
      )}
    </Dialog>
  );
}
