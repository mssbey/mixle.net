'use client';

// Checkout yan paneli: kalemler, kupon, toplamlar. Tüm tutarlar sunucudan
// (quote) gelir; burada yalnız biçimlendirilir.

import Image from 'next/image';
import { useState } from 'react';
import { Tag, X } from 'lucide-react';
import { formatMinor, bpsToPercent } from '@/lib/money';
import type { QuoteResponse } from '@/lib/checkout-client';
import { cn } from '@/lib/utils';

interface Props {
  quote: QuoteResponse | null;
  loading: boolean;
  couponCode: string;
  onCouponChange: (code: string) => void;
  /** Kupon alanı yalnız adres girildikten sonra anlamlı. */
  couponEnabled: boolean;
  className?: string;
}

export function OrderSummary({ quote, loading, couponCode, onCouponChange, couponEnabled, className }: Props) {
  const [draft, setDraft] = useState(couponCode);
  const t = quote?.totals;

  return (
    <aside className={cn('rounded-lg border border-line bg-white p-5 shadow-soft', className)} aria-label="Sipariş özeti">
      <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-ink-soft">Sipariş özeti</h2>

      <ul className="mt-4 divide-y divide-line">
        {quote?.lines.map((l) => (
          <li key={l.variantId} className="flex gap-3 py-3">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-mist">
              {l.imageUrl && <Image src={l.imageUrl} alt="" fill sizes="56px" className="object-cover" />}
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1 text-[10px] font-bold text-white">
                {l.quantity}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">{l.name}</p>
              {l.variantLabel && <p className="text-xs text-ink-soft">{l.variantLabel}</p>}
              {l.discountMinor > 0 && (
                <p className="text-xs text-success">−{formatMinor(l.discountMinor)} indirim</p>
              )}
            </div>
            <p className="text-sm font-semibold">{formatMinor(l.netLineMinor)}</p>
          </li>
        ))}
        {!quote && loading && <li className="py-6 text-center text-sm text-ink-soft">Hesaplanıyor…</li>}
      </ul>

      {/* Kupon */}
      <form
        className="mt-4"
        onSubmit={(e) => {
          e.preventDefault();
          onCouponChange(draft.trim());
        }}
      >
        <label htmlFor="checkout-coupon" className="mb-1.5 block text-xs font-semibold text-ink">
          Kupon kodu
        </label>
        <div className="flex gap-2">
          <input
            id="checkout-coupon"
            className="w-full rounded-lg border border-line px-3 py-2 text-sm uppercase outline-none focus:border-line focus-visible:ring-2 focus-visible:ring-brand-200 disabled:bg-mist/50"
            value={draft}
            disabled={!couponEnabled}
            placeholder={couponEnabled ? 'NEFIS10' : 'Önce adres girin'}
            onChange={(e) => setDraft(e.target.value)}
          />
          {couponCode ? (
            <button type="button" className="btn-ghost px-3" aria-label="Kuponu kaldır"
              onClick={() => { setDraft(''); onCouponChange(''); }}>
              <X size={16} />
            </button>
          ) : (
            <button type="submit" className="btn-ghost px-3" disabled={!couponEnabled || !draft.trim()}>
              <Tag size={16} /> Uygula
            </button>
          )}
        </div>
        {quote?.coupon && (
          <p className={cn('mt-1.5 text-xs', quote.coupon.ok ? 'text-success' : 'text-brand-600')} role="status">
            {quote.coupon.ok
              ? quote.coupon.freeShipping
                ? `${quote.coupon.code}: ücretsiz kargo uygulandı`
                : `${quote.coupon.code}: ${formatMinor(quote.coupon.discountMinor)} indirim`
              : quote.coupon.reason}
          </p>
        )}
      </form>

      {/* Toplamlar */}
      <dl className="mt-5 space-y-1.5 border-t border-line pt-4 text-sm">
        <Row label="Ara toplam" value={t ? formatMinor(t.itemsSubtotalMinor) : '—'} />
        {t && t.discountTotalMinor > 0 && (
          <Row label="İndirim" value={`−${formatMinor(t.discountTotalMinor)}`} className="text-success" />
        )}
        <Row
          label="Kargo"
          value={
            !quote?.selectedShippingId
              ? 'Seçilmedi'
              : t?.shippingTotalMinor === 0
                ? 'Ücretsiz'
                : formatMinor(t?.shippingTotalMinor ?? 0)
          }
        />
        {t && t.surchargeMinor > 0 && <Row label="Kapıda ödeme bedeli" value={formatMinor(t.surchargeMinor)} />}
        {t && quote?.pricesIncludeTax && t.taxBreakdown.length > 0 && (
          <div className="pt-1 text-xs text-ink-soft">
            {t.taxBreakdown.map((r) => (
              <div key={r.rateBps} className="flex justify-between">
                <span>KDV %{bpsToPercent(r.rateBps)} (dahil)</span>
                <span>{formatMinor(r.taxMinor)}</span>
              </div>
            ))}
          </div>
        )}
        {t && !quote?.pricesIncludeTax && <Row label="KDV" value={formatMinor(t.taxTotalMinor)} />}
        <div className="flex items-baseline justify-between border-t border-line pt-3">
          <dt className="text-base font-semibold text-ink">Toplam</dt>
          <dd className="text-xl font-bold text-ink" aria-live="polite">
            {t ? formatMinor(t.grandTotalMinor) : '—'}
          </dd>
        </div>
      </dl>
      {quote?.pricesIncludeTax && <p className="mt-1 text-[11px] text-ink-soft">Fiyatlara KDV dahildir.</p>}
    </aside>
  );
}

function Row({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn('flex justify-between', className)}>
      <dt className="text-ink-soft">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
