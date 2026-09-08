'use client';

// Kupon oluştur/düzenle diyaloğu.

import { useState } from 'react';
import { Dialog } from '@/components/admin/orders/Dialog';
import { Field } from '@/components/admin/primitives';
import { useAdminData } from '@/components/admin/AdminDataProvider';
import { couponsApi, type AdminCoupon, type CouponInput } from '@/lib/admin/coupons-client';
import { ApiError } from '@/lib/admin/client';
import { minorToInput, parseMajorInput, bpsToPercent } from '@/lib/money';
import { toast } from '@/store/toast';

function empty(): CouponInput {
  return {
    code: '', type: 'yüzde', value: 1000, minCartTotalMinor: null, maxDiscountMinor: null,
    startsAt: null, endsAt: null, usageLimit: null, usageLimitPerCustomer: null,
    includeProductIds: [], excludeProductIds: [], includeCategoryIds: [],
    firstOrderOnly: false, isActive: true, stackable: false,
  };
}

function toDateInput(iso: string | null): string {
  return iso ? iso.slice(0, 10) : '';
}
function fromDateInput(v: string, endOfDay: boolean): string | null {
  if (!v) return null;
  return new Date(`${v}T${endOfDay ? '23:59:59' : '00:00:00'}`).toISOString();
}

export function CouponEditor({ coupon, open, onClose, onSaved }: { coupon: AdminCoupon | null; open: boolean; onClose: () => void; onSaved: () => void }) {
  const { products, categories } = useAdminData();
  const [c, setC] = useState<CouponInput>(coupon ?? empty());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [percentText, setPercentText] = useState(coupon && coupon.type === 'yüzde' ? String(bpsToPercent(coupon.value)) : '10');
  const [amountText, setAmountText] = useState(coupon && coupon.type === 'tutar' ? minorToInput(coupon.value) : '');

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const patch = { ...c };
      if (patch.type === 'yüzde') patch.value = Math.round((Number(percentText.replace(',', '.')) || 0) * 100);
      if (patch.type === 'tutar') patch.value = parseMajorInput(amountText) ?? 0;
      const saved = coupon ? await couponsApi.update(coupon.id, patch) : await couponsApi.create(patch);
      toast.success(coupon ? 'Kupon güncellendi' : 'Kupon oluşturuldu', saved.coupon.code);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? (Object.values(err.issues)[0] ?? err.message) : err instanceof Error ? err.message : 'Kaydedilemedi');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title={coupon ? `Kuponu düzenle — ${coupon.code}` : 'Yeni kupon'} wide
      footer={<>
        <button type="button" className="admin-btn admin-btn-ghost" onClick={onClose} disabled={busy}>Vazgeç</button>
        <button type="button" className="admin-btn admin-btn-primary" disabled={busy || !c.code.trim()} onClick={() => void save()}>{busy ? 'Kaydediliyor…' : 'Kaydet'}</button>
      </>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Kod" htmlFor="cp-code" required hint="Büyük/küçük harf ve Türkçe karakter farkı yoksayılır.">
          <input id="cp-code" className="admin-input" style={{ textTransform: 'uppercase' }} value={c.code} onChange={(e) => setC({ ...c, code: e.target.value })} />
        </Field>
        <Field label="Tür" htmlFor="cp-type">
          <select id="cp-type" className="admin-select" value={c.type} onChange={(e) => setC({ ...c, type: e.target.value as CouponInput['type'] })}>
            <option value="yüzde">Yüzde indirim</option>
            <option value="tutar">Sabit tutar indirim</option>
            <option value="ücretsiz-kargo">Ücretsiz kargo</option>
          </select>
        </Field>

        {c.type === 'yüzde' && (
          <Field label="Yüzde (%)" htmlFor="cp-percent" required>
            <input id="cp-percent" className="admin-input" inputMode="decimal" value={percentText} onChange={(e) => setPercentText(e.target.value)} />
          </Field>
        )}
        {c.type === 'tutar' && (
          <Field label="İndirim tutarı" htmlFor="cp-amount" required>
            <input id="cp-amount" className="admin-input" inputMode="decimal" value={amountText} onChange={(e) => setAmountText(e.target.value)} placeholder="0,00" />
          </Field>
        )}
        {c.type === 'yüzde' && (
          <Field label="En çok indirim (opsiyonel)" htmlFor="cp-max">
            <input id="cp-max" className="admin-input" inputMode="decimal" value={c.maxDiscountMinor == null ? '' : minorToInput(c.maxDiscountMinor)}
              onChange={(e) => setC({ ...c, maxDiscountMinor: e.target.value.trim() ? (parseMajorInput(e.target.value) ?? null) : null })} placeholder="Sınırsız" />
          </Field>
        )}

        <Field label="Min. sepet tutarı (opsiyonel)" htmlFor="cp-min">
          <input id="cp-min" className="admin-input" inputMode="decimal" value={c.minCartTotalMinor == null ? '' : minorToInput(c.minCartTotalMinor)}
            onChange={(e) => setC({ ...c, minCartTotalMinor: e.target.value.trim() ? (parseMajorInput(e.target.value) ?? null) : null })} placeholder="Yok" />
        </Field>
        <div />

        <Field label="Başlangıç (opsiyonel)" htmlFor="cp-start">
          <input id="cp-start" type="date" className="admin-input" value={toDateInput(c.startsAt)} onChange={(e) => setC({ ...c, startsAt: fromDateInput(e.target.value, false) })} />
        </Field>
        <Field label="Bitiş (opsiyonel)" htmlFor="cp-end">
          <input id="cp-end" type="date" className="admin-input" value={toDateInput(c.endsAt)} onChange={(e) => setC({ ...c, endsAt: fromDateInput(e.target.value, true) })} />
        </Field>

        <Field label="Toplam kullanım limiti (opsiyonel)" htmlFor="cp-limit">
          <input id="cp-limit" type="number" min={1} className="admin-input" value={c.usageLimit ?? ''} onChange={(e) => setC({ ...c, usageLimit: e.target.value ? Number(e.target.value) : null })} placeholder="Sınırsız" />
        </Field>
        <Field label="Müşteri başına limit (opsiyonel)" htmlFor="cp-limit-c">
          <input id="cp-limit-c" type="number" min={1} className="admin-input" value={c.usageLimitPerCustomer ?? ''} onChange={(e) => setC({ ...c, usageLimitPerCustomer: e.target.value ? Number(e.target.value) : null })} placeholder="Sınırsız" />
        </Field>

        <Field label="Yalnız bu kategorilerde geçerli (opsiyonel)" htmlFor="cp-cats">
          <select id="cp-cats" multiple className="admin-select" style={{ height: 100 }} value={c.includeCategoryIds}
            onChange={(e) => setC({ ...c, includeCategoryIds: [...e.target.selectedOptions].map((o) => o.value) })}>
            {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
          </select>
        </Field>
        <Field label="Yalnız bu ürünlerde geçerli (opsiyonel)" htmlFor="cp-prods">
          <select id="cp-prods" multiple className="admin-select" style={{ height: 100 }} value={c.includeProductIds}
            onChange={(e) => setC({ ...c, includeProductIds: [...e.target.selectedOptions].map((o) => o.value) })}>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="Bu ürünlerde geçersiz (opsiyonel)" htmlFor="cp-excl" className="sm:col-span-2">
          <select id="cp-excl" multiple className="admin-select" style={{ height: 80 }} value={c.excludeProductIds}
            onChange={(e) => setC({ ...c, excludeProductIds: [...e.target.selectedOptions].map((o) => o.value) })}>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
      </div>

      <div className="mt-3 flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" checked={c.isActive} onChange={(e) => setC({ ...c, isActive: e.target.checked })} /> Aktif</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={c.firstOrderOnly} onChange={(e) => setC({ ...c, firstOrderOnly: e.target.checked })} /> Yalnız ilk sipariş</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={c.stackable} onChange={(e) => setC({ ...c, stackable: e.target.checked })} /> Diğer indirimlerle birleşebilir</label>
      </div>

      {error && <p className="admin-error mt-2" role="alert">{error}</p>}
    </Dialog>
  );
}
