'use client';

// Tam / kısmi iade — kalem seçerek. Tutar kalemlerden hesaplanır (sunucuda da
// yeniden hesaplanır); istenirse elle değiştirilebilir.

import { useState } from 'react';
import type { AdminOrderView } from '@/server/orders/admin-view';
import { ordersApi } from '@/lib/admin/orders-client';
import { ApiError } from '@/lib/admin/client';
import { formatMinor, minorToInput, parseMajorInput } from '@/lib/money';
import { toast } from '@/store/toast';
import { Field } from '@/components/admin/primitives';
import { Dialog } from './Dialog';

interface Props {
  order: AdminOrderView;
  open: boolean;
  onClose: () => void;
  onUpdated: (o: AdminOrderView) => void;
}

export function RefundDialog({ order, open, onClose, onUpdated }: Props) {
  const refundableOf = (i: AdminOrderView['items'][number]) => i.quantity - i.refundedQuantity;
  const [qty, setQty] = useState<Record<string, number>>({});
  const [includeShipping, setIncludeShipping] = useState(false);
  const [restock, setRestock] = useState(true);
  const [reason, setReason] = useState('');
  const [override, setOverride] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const items = order.items.filter((i) => refundableOf(i) > 0);
  const chosen = items.map((i) => ({ orderItemId: i.id, quantity: qty[i.id] ?? 0 })).filter((x) => x.quantity > 0);

  // Ön izleme (sunucu aynı formülle hesaplar).
  const preview = chosen.reduce((s, c) => {
    const i = order.items.find((x) => x.id === c.orderItemId)!;
    return s + Math.round((i.lineTotalMinor / i.quantity) * c.quantity);
  }, 0) + (includeShipping ? order.totals.shippingTotalMinor : 0);
  const overrideMinor = override ? parseMajorInput(override) : null;
  const amount = overrideMinor ?? preview;
  const isFull = amount >= order.refundableMinor;

  const selectAll = () => setQty(Object.fromEntries(items.map((i) => [i.id, refundableOf(i)])));

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await ordersApi.refund(order.id, {
        items: chosen,
        amountMinor: overrideMinor ?? undefined,
        reason: reason.trim(),
        restock,
        includeShipping,
      });
      onUpdated(r.order);
      toast.success(isFull ? 'Tam iade yapıldı' : 'Kısmi iade yapıldı');
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'İade başarısız');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="İade" description={`İade edilebilir: ${formatMinor(order.refundableMinor)}. Kart iadeleri F3 ile sağlayıcıya iletilecek; şimdilik kayıt tutulur.`} wide
      footer={<>
        <button type="button" className="admin-btn admin-btn-ghost" onClick={onClose} disabled={busy}>Vazgeç</button>
        <button type="button" className="admin-btn admin-btn-danger" disabled={busy || amount <= 0 || reason.trim().length < 2} onClick={submit}>
          {busy ? 'İade ediliyor…' : `${isFull ? 'Tam' : 'Kısmi'} iade · ${formatMinor(amount)}`}
        </button>
      </>}>
      <div className="mb-2 flex justify-end">
        <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={selectAll}>Tümünü seç</button>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Ürün</th><th className="text-right">Birim (net)</th><th className="text-right">İade edilebilir</th><th className="text-right" style={{ width: 90 }}>Adet</th></tr></thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id}>
                <td>{i.name}{i.variantLabel && <span className="text-xs text-[var(--admin-ink-soft)]"> · {i.variantLabel}</span>}</td>
                <td className="text-right">{formatMinor(Math.round(i.lineTotalMinor / i.quantity))}</td>
                <td className="text-right">{refundableOf(i)}</td>
                <td className="text-right">
                  <input type="number" min={0} max={refundableOf(i)} className="admin-input admin-btn-sm" style={{ width: 70 }} aria-label={`${i.name} iade adedi`}
                    value={qty[i.id] ?? 0} onChange={(e) => setQty({ ...qty, [i.id]: Math.max(0, Math.min(refundableOf(i), Number(e.target.value) || 0)) })} />
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={4} className="text-center text-[var(--admin-ink-soft)]">Tüm kalemler iade edilmiş.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={includeShipping} disabled={order.totals.shippingTotalMinor === 0} onChange={(e) => setIncludeShipping(e.target.checked)} /> Kargo ücretini de iade et ({formatMinor(order.totals.shippingTotalMinor)})</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={restock} onChange={(e) => setRestock(e.target.checked)} /> İade edilen adetleri stoka geri ekle</label>
        <Field label="Tutarı elle belirle (₺)" htmlFor="rf-amount" hint={`Boş bırakılırsa kalemlerden hesaplanır: ${formatMinor(preview)}`} error={override && !overrideMinor ? 'Geçerli tutar girin' : undefined}>
          <input id="rf-amount" className="admin-input" inputMode="decimal" placeholder={minorToInput(preview)} value={override} onChange={(e) => setOverride(e.target.value)} />
        </Field>
        <Field label="İade sebebi" htmlFor="rf-reason" required>
          <input id="rf-reason" className="admin-input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ör. hasarlı ürün, müşteri vazgeçti" />
        </Field>
      </div>
      <p className="admin-error mt-3">Geri alınamaz: iade kaydı oluşur, sipariş toplamına işlenir{isFull ? ' ve sipariş kapanır' : ''}.</p>
      {error && <p className="admin-error mt-2" role="alert">{error}</p>}
    </Dialog>
  );
}
