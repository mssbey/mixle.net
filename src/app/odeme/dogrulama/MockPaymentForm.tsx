'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X } from 'lucide-react';
import { useCart } from '@/store/cart';

export function MockPaymentForm({
  orderId,
  token,
  attempt,
  doneUrl,
}: {
  orderId: string;
  token: string;
  /** Deneme sayacı — yeniden denemede webhook olay kimliği değişsin. */
  attempt: string;
  /** İmzalı teşekkür sayfası adresi. */
  doneUrl: string;
}) {
  const router = useRouter();
  const clearCart = useCart((s) => s.clear);
  const [busy, setBusy] = useState<'basarili' | 'basarisiz' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (outcome: 'basarili' | 'basarisiz') => {
    setBusy(outcome);
    setError(null);
    try {
      const res = await fetch('/api/checkout/mock-odeme', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ orderId, token, outcome, attempt }),
      });
      const body = (await res.json()) as { message?: string; status?: string };
      if (!res.ok) throw new Error(body.message ?? 'Ödeme sonucu işlenemedi');
      if (outcome === 'basarili') clearCart();
      router.replace(doneUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
      setBusy(null);
    }
  };

  return (
    <div className="mt-5" data-token={token}>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="btn-primary justify-center" disabled={busy !== null} onClick={() => submit('basarili')}>
          <Check size={16} /> {busy === 'basarili' ? 'İşleniyor…' : 'Ödemeyi onayla'}
        </button>
        <button type="button" className="btn-ghost justify-center" disabled={busy !== null} onClick={() => submit('basarisiz')}>
          <X size={16} /> {busy === 'basarisiz' ? 'İşleniyor…' : 'Reddet'}
        </button>
      </div>
      <p className="mt-2 min-h-5 text-sm text-rose-600" role="alert" aria-live="polite">{error ?? ''}</p>
    </div>
  );
}
