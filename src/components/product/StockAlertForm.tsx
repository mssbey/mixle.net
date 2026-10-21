'use client';

// Tükenen varyant için "Stoğa gelince haber ver" formu (bkz. /api/stok-bildirim).

import { useState } from 'react';
import { BellRing, Check } from 'lucide-react';

export function StockAlertForm({ variantId }: { variantId: string }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [doneFor, setDoneFor] = useState<string | null>(null);

  // Varyant değişince form yeniden açılır.
  const done = state === 'done' && doneFor === variantId;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState('busy');
    setError(null);
    try {
      const res = await fetch('/api/stok-bildirim', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ variantId, email }),
      });
      const body = (await res.json().catch(() => ({}))) as { message?: string; issues?: Record<string, string> };
      if (!res.ok) {
        setError(body.issues?.email ?? body.message ?? 'Kaydedilemedi, tekrar deneyin.');
        setState('idle');
        return;
      }
      setDoneFor(variantId);
      setState('done');
    } catch {
      setError('Bağlantı hatası, tekrar deneyin.');
      setState('idle');
    }
  };

  if (done) {
    return (
      <p className="mt-4 flex items-center gap-2 rounded-lg border border-line bg-mist px-4 py-3 text-sm text-ink">
        <Check size={16} className="shrink-0 text-emerald-600" />
        Ürün stoğa girdiğinde {email} adresine e-posta göndereceğiz.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="mt-4 rounded-lg border border-line bg-mist p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-ink">
        <BellRing size={16} className="shrink-0 text-brand-500" /> Stoğa gelince haber ver
      </p>
      <p className="mt-1 text-xs text-ink-soft">Bu ürün yeniden stoğa girdiğinde size tek seferlik e-posta gönderelim.</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="E-posta adresiniz"
          aria-label="E-posta adresiniz"
          autoComplete="email"
          className="h-11 min-w-0 flex-1 rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-brand-400"
        />
        <button type="submit" disabled={state === 'busy'} className="btn-primary h-11 px-5 disabled:opacity-50">
          {state === 'busy' ? 'Kaydediliyor…' : 'Haber ver'}
        </button>
      </div>
      {error && (
        <p className="mt-2 text-xs text-brand-600" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
