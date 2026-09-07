'use client';

// "Ödemeyi tamamla": sağlayıcıda ödemeyi (yeniden) başlatır ve yönlendirir.
// DEMO_MODE'da mock sayfasına, canlıda sağlayıcının hosted sayfasına gider.

import { useState } from 'react';
import { CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';

export function RetryPaymentButton({ orderId, token, className }: { orderId: string; token?: string; className?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/payments/yeniden', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ orderId, token }),
      });
      const body = (await res.json()) as { url?: string; message?: string };
      if (!res.ok || !body.url) throw new Error(body.message ?? 'Ödeme başlatılamadı');
      window.location.assign(body.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ödeme başlatılamadı');
      setBusy(false);
    }
  };

  return (
    <span className="inline-flex flex-col gap-1">
      <button type="button" className={cn('btn-primary', className)} onClick={start} disabled={busy}>
        <CreditCard size={16} /> {busy ? 'Yönlendiriliyor…' : 'Ödemeyi tamamla'}
      </button>
      {error && <span className="text-xs text-rose-600" role="alert">{error}</span>}
    </span>
  );
}
