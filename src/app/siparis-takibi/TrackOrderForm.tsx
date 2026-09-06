'use client';

import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { checkoutApi, CheckoutApiError } from '@/lib/checkout-client';
import type { PublicOrder } from '@/server/orders/view';
import { OrderDetail } from '@/components/orders/OrderDetail';

export function TrackOrderForm({ initialNo, initialEmail }: { initialNo: string; initialEmail: string }) {
  const [no, setNo] = useState(initialNo);
  const [email, setEmail] = useState(initialEmail);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<PublicOrder | null>(null);

  const lookup = async () => {
    setBusy(true);
    setError(null);
    setOrder(null);
    try {
      const r = await checkoutApi.trackOrder(no.trim(), email.trim());
      setOrder(r.order);
    } catch (err) {
      setError(err instanceof CheckoutApiError ? err.message : 'Sorgu başarısız');
    } finally {
      setBusy(false);
    }
  };

  // E-posta bağlantısından gelindiyse (no + e-posta dolu) otomatik sorgula.
  useEffect(() => {
    if (initialNo && initialEmail) void lookup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const input =
    'w-full rounded-lg border border-purple-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-purple-400 focus-visible:ring-2 focus-visible:ring-purple-300';

  return (
    <>
      <form
        className="mt-6 grid max-w-xl gap-3 rounded-2xl border border-purple-100 bg-white p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          void lookup();
        }}
      >
        <div>
          <label htmlFor="track-no" className="mb-1.5 block text-xs font-semibold text-purple-800">Sipariş numarası</label>
          <input id="track-no" className={`${input} uppercase`} placeholder="NA-2026-000123" value={no} onChange={(e) => setNo(e.target.value)} required />
        </div>
        <div>
          <label htmlFor="track-email" className="mb-1.5 block text-xs font-semibold text-purple-800">E-posta</label>
          <input id="track-email" type="email" className={input} value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <button type="submit" className="btn-primary" disabled={busy}>
          <Search size={16} /> {busy ? 'Sorgulanıyor…' : 'Sorgula'}
        </button>
        <p className="min-h-5 text-sm text-rose-600 sm:col-span-3" role="alert" aria-live="polite">{error ?? ''}</p>
      </form>

      {order && (
        <div className="mt-8">
          <OrderDetail order={order} />
        </div>
      )}
    </>
  );
}
