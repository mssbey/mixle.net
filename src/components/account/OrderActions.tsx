'use client';

// Sipariş detayındaki müşteri eylemleri: iptal, ödemeyi tamamla, iade talebi (F5).

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { XCircle, RotateCcw } from 'lucide-react';
import { RetryPaymentButton } from '@/components/orders/RetryPaymentButton';
import { ReturnRequestForm } from '@/components/account/ReturnRequestForm';
import type { PublicOrder } from '@/server/orders/view';
import { returnStatusLabels, OPEN_RETURN_STATUSES, type ReturnStatus } from '@/server/returns/schema';
import { accountApi, CheckoutApiError } from '@/lib/checkout-client';
import { toast } from '@/store/toast';

const CANCELLABLE = new Set(['ödeme-bekliyor', 'başarısız', 'ödendi', 'hazırlanıyor']);
const RETURNABLE = new Set(['teslim-edildi', 'tamamlandı']);

export function OrderActions({ order, orderId }: { order: PublicOrder; orderId: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [returning, setReturning] = useState(false);
  const [busy, setBusy] = useState(false);
  const returnOpen = order.returnRequest && (OPEN_RETURN_STATUSES as readonly string[]).includes(order.returnRequest.status);

  const cancel = async () => {
    setBusy(true);
    try {
      await accountApi.cancelOrder(order.orderNumber);
      toast.success('Sipariş iptal edildi', 'Ödeme yaptıysanız iade işlemi başlatıldı.');
      router.refresh();
    } catch (err) {
      toast.error('İptal edilemedi', err instanceof CheckoutApiError ? err.message : undefined);
    } finally {
      setBusy(false);
      setConfirm(false);
    }
  };

  return (
    <>
      {order.canRetryPayment && <RetryPaymentButton orderId={orderId} />}
      {CANCELLABLE.has(order.status) && !confirm && (
        <button type="button" className="btn-ghost" onClick={() => setConfirm(true)}>
          <XCircle size={16} /> Siparişi iptal et
        </button>
      )}
      {confirm && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm" role="alertdialog" aria-labelledby="cancel-title">
          <span id="cancel-title" className="font-semibold text-rose-700">Siparişi iptal etmek istediğinize emin misiniz? Bu işlem geri alınamaz.</span>
          <button type="button" className="btn-primary !bg-rose-600 hover:!bg-rose-700" disabled={busy} onClick={cancel} autoFocus>
            {busy ? 'İptal ediliyor…' : 'Evet, iptal et'}
          </button>
          <button type="button" className="btn-ghost" disabled={busy} onClick={() => setConfirm(false)}>Vazgeç</button>
        </div>
      )}
      {order.returnRequest && (
        <p className="w-full rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-sm text-purple-900">
          İade talebi: <strong>{returnStatusLabels[order.returnRequest.status as ReturnStatus] ?? order.returnRequest.status}</strong>
          {order.returnRequest.returnCode && <> · Kargo kodu: {order.returnRequest.returnCode}</>}
          {order.returnRequest.resolutionNote && <span className="block text-xs text-purple-700">{order.returnRequest.resolutionNote}</span>}
        </p>
      )}
      {RETURNABLE.has(order.status) && !returnOpen && !returning && (
        <button type="button" className="btn-ghost" onClick={() => setReturning(true)}>
          <RotateCcw size={16} /> İade talebi aç
        </button>
      )}
      {returning && <ReturnRequestForm order={order} onClose={() => setReturning(false)} />}
    </>
  );
}
