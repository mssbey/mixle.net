'use client';

// Bir varyantın stok geçmişi: "50 → 49 — Sipariş #1548", "48 → 68 — Manuel
// 20 adet eklendi (Mehmet)". Kaynak `StockMovement` — siparişler, iptaller,
// iadeler, panel ve CSV değişiklikleri buraya düşer.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Dialog } from '@/components/admin/orders/Dialog';
import { dateTime } from '@/components/admin/orders/status';
import { stockManagerApi, type VariantHistoryResult } from '@/lib/admin/stock-client';

export const STOCK_REASON_LABEL: Record<string, string> = {
  sipariş: 'Sipariş verildi',
  iptal: 'Sipariş iptal edildi',
  iade: 'İade',
  manuel: 'Manuel değişiklik',
  giriş: 'Yeni stok girişi',
  çıkış: 'Manuel stok çıkışı',
  csv: 'CSV aktarımı',
  sayım: 'Sayım',
  fire: 'Fire',
  'rezervasyon-iptal': 'Ödenmeyen sipariş — stok geri verildi',
};

export function StockHistoryDialog({
  target,
  onClose,
}: {
  target: { variantId: string; title: string } | null;
  onClose: () => void;
}) {
  const [data, setData] = useState<VariantHistoryResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!target) return;
    setData(null);
    setError(null);
    stockManagerApi
      .history(target.variantId)
      .then(setData)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Geçmiş yüklenemedi'));
  }, [target]);

  return (
    <Dialog
      open={!!target}
      onClose={onClose}
      wide
      title="Stok geçmişi"
      description={
        target
          ? `${target.title}${data ? ` · SKU: ${data.variant.sku || '—'} · Şu anki stok: ${data.variant.trackStock ? data.variant.stock : 'takip kapalı'}` : ''}`
          : undefined
      }
    >
      {error ? (
        <p className="admin-error">{error}</p>
      ) : !data ? (
        <p className="admin-hint">Yükleniyor…</p>
      ) : data.items.length === 0 ? (
        <p className="admin-hint">Bu varyant için kayıtlı stok hareketi yok.</p>
      ) : (
        <ol className="flex flex-col">
          {data.items.map((m) => (
            <li key={m.id} className="flex flex-wrap items-start gap-x-3 gap-y-0.5 border-b border-[var(--admin-line)] py-2 text-sm last:border-0">
              <span className="w-[150px] shrink-0 text-xs text-[var(--admin-ink-soft)] tabular-nums">
                {dateTime.format(new Date(m.createdAt))}
              </span>
              <span className="w-[120px] shrink-0 font-medium tabular-nums">
                {m.stockBefore} → {m.stockAfter}{' '}
                <span className={m.delta > 0 ? 'text-[#0f6b3d]' : 'text-[#b42318]'}>
                  ({m.delta > 0 ? '+' : ''}
                  {m.delta})
                </span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="font-medium">{STOCK_REASON_LABEL[m.reason] ?? m.reason}</span>
                {m.orderNumber && m.orderId && (
                  <>
                    {' — '}
                    <Link href={`/admin/siparisler/${m.orderId}`} className="text-[var(--brand-purple)] hover:underline">
                      Sipariş #{m.orderNumber}
                    </Link>
                  </>
                )}
                {m.note && <span className="block text-xs text-[var(--admin-ink-soft)]">{m.note}</span>}
              </span>
              <span className="shrink-0 text-xs text-[var(--admin-ink-soft)]">
                {m.byName ? `İşlemi yapan: ${m.byName}` : m.orderId ? 'Sistem (sipariş)' : 'Sistem'}
              </span>
            </li>
          ))}
        </ol>
      )}
    </Dialog>
  );
}
