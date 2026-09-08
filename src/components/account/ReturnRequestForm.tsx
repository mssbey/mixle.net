'use client';

// Sipariş detayında açılan iade talebi formu — inline (modal değil), iptal
// onayıyla aynı görsel dil.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PublicOrder } from '@/server/orders/view';
import { RETURN_REASONS, returnReasonLabels } from '@/server/returns/schema';
import { accountApi, CheckoutApiError } from '@/lib/checkout-client';
import { toast } from '@/store/toast';
import { cn } from '@/lib/utils';

const inputCls = 'w-full rounded-lg border border-purple-200 bg-white px-3 py-2.5 text-sm outline-none transition-colors focus:border-purple-400 focus-visible:ring-2 focus-visible:ring-purple-300';
const labelCls = 'mb-1.5 block text-xs font-semibold text-purple-800';

export function ReturnRequestForm({ order, onClose }: { order: PublicOrder; onClose: () => void }) {
  const router = useRouter();
  const returnable = order.items.filter((i) => i.quantity - i.refundedQuantity > 0);
  const [qty, setQty] = useState<Record<string, number>>(() => Object.fromEntries(returnable.map((i) => [i.id, 0])));
  const [reason, setReason] = useState<(typeof RETURN_REASONS)[number]>('hasarlı-geldi');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const items = returnable
    .map((i) => ({ orderItemId: i.id, quantity: Math.min(qty[i.id] ?? 0, i.quantity - i.refundedQuantity) }))
    .filter((x) => x.quantity > 0);

  const submit = async () => {
    if (items.length === 0) {
      setError('En az bir ürün ve adet seçin.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await accountApi.requestReturn(order.orderNumber, { items, reason, description });
      toast.success('İade talebiniz alındı', 'İnceleme sonucunu e-posta ile bildireceğiz.');
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof CheckoutApiError ? err.message : 'İade talebi gönderilemedi.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-purple-200 bg-purple-50/40 p-4 text-sm" role="region" aria-label="İade talebi formu">
      <p className="font-semibold text-purple-900">İade edilecek ürünler</p>
      <div className="flex flex-col gap-2">
        {returnable.map((i) => {
          const max = i.quantity - i.refundedQuantity;
          return (
            <label key={i.id} className="flex items-center justify-between gap-3 rounded-lg border border-purple-100 bg-white px-3 py-2">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{i.name}</span>
                {i.variantLabel && <span className="block text-xs text-ink-soft">{i.variantLabel}</span>}
              </span>
              <span className="flex items-center gap-2">
                <input type="checkbox" checked={(qty[i.id] ?? 0) > 0} onChange={(e) => setQty({ ...qty, [i.id]: e.target.checked ? max : 0 })} />
                <input
                  type="number"
                  min={0}
                  max={max}
                  className="w-16 rounded-md border border-purple-200 px-2 py-1 text-sm"
                  aria-label={`${i.name} iade adedi`}
                  value={qty[i.id] ?? 0}
                  onChange={(e) => setQty({ ...qty, [i.id]: Math.max(0, Math.min(max, Number(e.target.value) || 0)) })}
                />
                <span className="text-xs text-ink-soft">/ {max}</span>
              </span>
            </label>
          );
        })}
        {returnable.length === 0 && <p className="text-ink-soft">Bu siparişte iade edilebilecek ürün kalmamış.</p>}
      </div>

      <div>
        <label className={labelCls} htmlFor="return-reason">Sebep</label>
        <select id="return-reason" className={cn(inputCls, 'bg-white')} value={reason} onChange={(e) => setReason(e.target.value as typeof reason)}>
          {RETURN_REASONS.map((r) => <option key={r} value={r}>{returnReasonLabels[r]}</option>)}
        </select>
      </div>
      <div>
        <label className={labelCls} htmlFor="return-desc">Açıklama (opsiyonel)</label>
        <textarea id="return-desc" className={inputCls} rows={3} maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      {error && <p className="text-sm font-medium text-rose-600" role="alert">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-primary" disabled={busy} onClick={() => void submit()}>
          {busy ? 'Gönderiliyor…' : 'İade talebini gönder'}
        </button>
        <button type="button" className="btn-ghost" disabled={busy} onClick={onClose}>Vazgeç</button>
      </div>
    </div>
  );
}
