'use client';

// Panel > Ödemeler: işlem listesi, başarısız ödemeler, mutabakat, iade kuyruğu, webhook günlüğü.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { EmptyState, TableSkeleton } from '@/components/admin/primitives';
import { SmallChip, dateTime, paymentStatusLabels } from '@/components/admin/orders/status';
import { paymentsApi, type PaymentRow, type PaymentsListParams, type PaymentsListResult, type PaymentsView, type ReconRow, type RefundRow, type WebhookRow } from '@/lib/admin/payments-client';
import { PROVIDER_LABELS } from '@/lib/payment-labels';
import { formatMinor } from '@/lib/money';
import { toast } from '@/store/toast';

const VIEWS: { id: PaymentsView; label: string }[] = [
  { id: 'tumu', label: 'Tüm işlemler' },
  { id: 'basarisiz', label: 'Başarısız' },
  { id: 'iadeler', label: 'İadeler' },
  { id: 'mutabakat', label: 'Mutabakat' },
  { id: 'webhooks', label: 'Webhook günlüğü' },
];

const PAY_STATUS_LABEL: Record<string, string> = {
  başlatıldı: 'Başlatıldı', bekliyor: 'Bekliyor', başarılı: 'Başarılı', başarısız: 'Başarısız', 'iade-edildi': 'İade edildi', 'kısmi-iade': 'Kısmi iade',
};
const REFUND_STATUS_LABEL: Record<string, string> = { bekliyor: 'Bekliyor', tamamlandı: 'Tamamlandı', başarısız: 'Başarısız' };
const REFUND_TYPE_LABEL: Record<string, string> = { tam: 'Tam', kısmi: 'Kısmi', manuel: 'Manuel' };

function tone(status: string): 'ok' | 'warn' | 'bad' | 'neutral' {
  if (status === 'başarılı' || status === 'tamamlandı') return 'ok';
  if (status === 'başarısız') return 'bad';
  if (status === 'başlatıldı' || status === 'bekliyor') return 'warn';
  return 'neutral';
}

type AnyRow = PaymentRow | RefundRow | WebhookRow | ReconRow;

export function PaymentsList() {
  const router = useRouter();
  const sp = useSearchParams();
  const params: PaymentsListParams = {
    view: (sp.get('view') as PaymentsView) || 'tumu',
    provider: sp.get('provider') ?? undefined,
    status: sp.get('status') ?? undefined,
    q: sp.get('q') ?? undefined,
    from: sp.get('from') ?? undefined,
    to: sp.get('to') ?? undefined,
    page: Number(sp.get('page') ?? 1),
    pageSize: Number(sp.get('pageSize') ?? 25),
  };
  const [data, setData] = useState<PaymentsListResult<AnyRow> | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(params.q ?? '');
  const [openPayload, setOpenPayload] = useState<string | null>(null);

  const setParams = (patch: Partial<PaymentsListParams>, resetPage = true) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined || v === '' || v === null) next.delete(k);
      else next.set(k, String(v));
    }
    if (resetPage) next.delete('page');
    router.replace(`/admin/odemeler?${next.toString()}`);
  };

  const key = sp.toString();
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = Object.fromEntries(new URLSearchParams(key).entries()) as unknown as PaymentsListParams;
      setData(await paymentsApi.list<AnyRow>(p));
    } catch (err) {
      toast.error('Ödemeler yüklenemedi', err instanceof Error ? err.message : undefined);
    } finally {
      setLoading(false);
    }
  }, [key]);

  useEffect(() => {
    void load();
  }, [load]);

  const view = params.view ?? 'tumu';
  const isoDay = (v: string, end: boolean) => (v ? new Date(`${v}T${end ? '23:59:59.999' : '00:00:00.000'}+03:00`).toISOString() : undefined);
  const dayOf = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' }) : '');

  return (
    <div className="flex flex-col gap-3">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold text-[var(--brand-purple-deep)]">Ödemeler</h1>
          <p className="admin-hint mt-0.5">Sağlayıcı işlemleri, iadeler ve mutabakat</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/ayarlar/odeme" className="admin-btn admin-btn-ghost admin-btn-sm">Ödeme ayarları</Link>
          <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => void load()} aria-label="Yenile"><RefreshCw size={14} /> Yenile</button>
        </div>
      </header>

      <div role="tablist" aria-label="Görünüm" className="flex flex-wrap gap-1 border-b border-[var(--admin-border)]">
        {VIEWS.map((v) => (
          <button key={v.id} type="button" role="tab" aria-selected={view === v.id}
            className={`admin-focusable -mb-px border-b-2 px-3 py-2 text-sm ${view === v.id ? 'border-[var(--brand-purple)] font-semibold text-[var(--brand-purple-deep)]' : 'border-transparent text-[var(--admin-ink-soft)]'}`}
            onClick={() => setParams({ view: v.id, status: undefined, provider: undefined })}>
            {v.label}
          </button>
        ))}
      </div>

      {(view === 'tumu' || view === 'basarisiz' || view === 'webhooks' || view === 'mutabakat') && (
        <form className="admin-card flex flex-wrap items-end gap-2" style={{ padding: 10 }} onSubmit={(e) => { e.preventDefault(); setParams({ q: q || undefined }); }}>
          {view !== 'mutabakat' && (
            <label className="admin-field" style={{ minWidth: 160 }}>
              <span className="admin-label">Sağlayıcı</span>
              <select className="admin-select" value={params.provider ?? ''} onChange={(e) => setParams({ provider: e.target.value || undefined })}>
                <option value="">Tümü</option>
                {Object.entries(PROVIDER_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
              </select>
            </label>
          )}
          {view === 'tumu' && (
            <label className="admin-field" style={{ minWidth: 150 }}>
              <span className="admin-label">Durum</span>
              <select className="admin-select" value={params.status ?? ''} onChange={(e) => setParams({ status: e.target.value || undefined })}>
                <option value="">Tümü</option>
                {Object.entries(PAY_STATUS_LABEL).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
              </select>
            </label>
          )}
          {view !== 'webhooks' && (
            <>
              <label className="admin-field"><span className="admin-label">Başlangıç</span>
                <input type="date" className="admin-input" value={dayOf(params.from)} onChange={(e) => setParams({ from: isoDay(e.target.value, false) })} /></label>
              <label className="admin-field"><span className="admin-label">Bitiş</span>
                <input type="date" className="admin-input" value={dayOf(params.to)} onChange={(e) => setParams({ to: isoDay(e.target.value, true) })} /></label>
            </>
          )}
          {(view === 'tumu' || view === 'basarisiz') && (
            <label className="admin-field" style={{ minWidth: 200 }}><span className="admin-label">Ara</span>
              <input className="admin-input" placeholder="Sipariş no, sağlayıcı kimliği, son 4 hane" value={q} onChange={(e) => setQ(e.target.value)} /></label>
          )}
          <button type="submit" className="admin-btn admin-btn-ghost admin-btn-sm">Uygula</button>
        </form>
      )}

      {data?.summary && data.summary.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5" aria-live="polite">
          {data.summary.map((s) => (
            <div key={s.status} className="admin-card admin-stat" style={{ padding: 12 }}>
              <span className="admin-stat-value text-base">{formatMinor(s.amountMinor)}</span>
              <span className="admin-stat-label">{PAY_STATUS_LABEL[s.status] ?? s.status} · {s.count}</span>
            </div>
          ))}
        </div>
      )}

      {loading && !data ? (
        <TableSkeleton rows={8} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title={view === 'mutabakat' ? 'Uyuşmazlık yok' : 'Kayıt bulunamadı'} hint={view === 'mutabakat' ? 'Tüm siparişlerin ödeme kayıtları tutarlı.' : 'Filtreleri değiştirin.'} />
      ) : (
        <>
          <div className="admin-table-wrap admin-view-desktop">
            <table className="admin-table">
              {(view === 'tumu' || view === 'basarisiz') && (
                <>
                  <thead><tr><th>Tarih</th><th>Sipariş</th><th>Sağlayıcı</th><th>Kart</th><th>Taksit</th><th>Tutar</th><th>Durum</th><th>Sağlayıcı kimliği / hata</th></tr></thead>
                  <tbody>
                    {(data.items as PaymentRow[]).map((p) => (
                      <tr key={p.id}>
                        <td className="whitespace-nowrap">{dateTime.format(new Date(p.createdAt))}</td>
                        <td><Link href={`/admin/siparisler/${p.orderId}`} className="font-semibold text-[var(--brand-purple)]">{p.orderNumber}</Link></td>
                        <td>{PROVIDER_LABELS[p.provider] ?? p.provider}{p.threeDS && <span className="ml-1 text-[10px] text-[var(--admin-ink-soft)]">3DS</span>}</td>
                        <td>{p.cardLast4 ? `${p.cardBrand ?? ''} •••• ${p.cardLast4}` : '—'}</td>
                        <td>{p.installment > 1 ? `${p.installment}` : 'Tek'}</td>
                        <td className="whitespace-nowrap font-semibold">{formatMinor(p.amountMinor)}</td>
                        <td><SmallChip tone={tone(p.status)}>{PAY_STATUS_LABEL[p.status] ?? p.status}</SmallChip></td>
                        <td className="max-w-[260px] truncate text-xs text-[var(--admin-ink-soft)]" title={p.errorMessage ?? p.providerPaymentId ?? ''}>{p.errorMessage ?? p.providerPaymentId ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}
              {view === 'iadeler' && (
                <>
                  <thead><tr><th>Tarih</th><th>Sipariş</th><th>Tür</th><th>Tutar</th><th>Durum</th><th>Gerekçe</th><th>İşleyen</th><th>Sağlayıcı iade no</th></tr></thead>
                  <tbody>
                    {(data.items as RefundRow[]).map((r) => (
                      <tr key={r.id}>
                        <td className="whitespace-nowrap">{dateTime.format(new Date(r.createdAt))}</td>
                        <td><Link href={`/admin/siparisler/${r.orderId}`} className="font-semibold text-[var(--brand-purple)]">{r.orderNumber}</Link></td>
                        <td>{REFUND_TYPE_LABEL[r.type] ?? r.type}</td>
                        <td className="whitespace-nowrap font-semibold">{formatMinor(r.amountMinor)}</td>
                        <td><SmallChip tone={tone(r.status)}>{REFUND_STATUS_LABEL[r.status] ?? r.status}</SmallChip></td>
                        <td className="max-w-[220px] truncate" title={r.reason ?? ''}>{r.reason ?? '—'}</td>
                        <td>{r.by}</td>
                        <td className="text-xs text-[var(--admin-ink-soft)]">{r.providerRefundId ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}
              {view === 'mutabakat' && (
                <>
                  <thead><tr><th>Sipariş</th><th>Tarih</th><th>Yöntem</th><th>Ödeme durumu</th><th>Sipariş toplamı</th><th>Başarılı tahsilat</th><th>Fark</th></tr></thead>
                  <tbody>
                    {(data.items as ReconRow[]).map((m) => (
                      <tr key={m.id}>
                        <td><Link href={`/admin/siparisler/${m.id}`} className="font-semibold text-[var(--brand-purple)]">{m.orderNumber}</Link></td>
                        <td className="whitespace-nowrap">{dateTime.format(new Date(m.placedAt))}</td>
                        <td>{m.paymentMethod}</td>
                        <td>{paymentStatusLabels[m.paymentStatus] ?? m.paymentStatus}</td>
                        <td className="whitespace-nowrap">{formatMinor(m.grandTotalMinor)}</td>
                        <td className="whitespace-nowrap">{formatMinor(m.paidMinor)}</td>
                        <td className="whitespace-nowrap font-semibold"><SmallChip tone={m.diffMinor > 0 ? 'warn' : 'bad'}>{m.diffMinor > 0 ? '+' : ''}{formatMinor(m.diffMinor)}</SmallChip></td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}
              {view === 'webhooks' && (
                <>
                  <thead><tr><th>Tarih</th><th>Sağlayıcı</th><th>Olay kimliği</th><th>Durum</th><th>Hata</th><th></th></tr></thead>
                  <tbody>
                    {(data.items as WebhookRow[]).map((w) => (
                      <tr key={w.id}>
                        <td className="whitespace-nowrap">{dateTime.format(new Date(w.createdAt))}</td>
                        <td>{PROVIDER_LABELS[w.provider] ?? w.provider}</td>
                        <td className="max-w-[260px] truncate text-xs" title={w.externalId}>{w.externalId}</td>
                        <td><SmallChip tone={w.error ? 'bad' : w.processedAt ? 'ok' : 'warn'}>{w.error ? 'Hata' : w.processedAt ? 'İşlendi' : 'Bekliyor'}</SmallChip></td>
                        <td className="max-w-[220px] truncate text-xs text-[var(--admin-ink-soft)]" title={w.error ?? ''}>{w.error ?? '—'}</td>
                        <td><button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => setOpenPayload(openPayload === w.id ? null : w.id)} aria-expanded={openPayload === w.id}>{openPayload === w.id ? 'Gizle' : 'Yük'}</button></td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}
            </table>
          </div>
          {view === 'webhooks' && openPayload && (
            <pre className="admin-card overflow-x-auto text-[11px]" style={{ padding: 12 }}>{JSON.stringify((data.items as WebhookRow[]).find((w) => w.id === openPayload)?.payload, null, 2)}</pre>
          )}

          <div className="admin-card-list admin-view-mobile">
            {data.items.map((row) => {
              if ('externalId' in row) {
                return (
                  <article key={row.id} className="admin-row-card">
                    <div className="flex items-center justify-between gap-2"><strong>{PROVIDER_LABELS[row.provider] ?? row.provider}</strong><SmallChip tone={row.error ? 'bad' : 'ok'}>{row.error ? 'Hata' : 'İşlendi'}</SmallChip></div>
                    <p className="truncate text-xs text-[var(--admin-ink-soft)]">{dateTime.format(new Date(row.createdAt))} · {row.externalId}</p>
                  </article>
                );
              }
              if ('diffMinor' in row) {
                return (
                  <article key={row.id} className="admin-row-card">
                    <div className="flex items-center justify-between gap-2"><Link href={`/admin/siparisler/${row.id}`} className="font-semibold text-[var(--brand-purple)]">{row.orderNumber}</Link><SmallChip tone="bad">{formatMinor(row.diffMinor)}</SmallChip></div>
                    <p className="text-xs text-[var(--admin-ink-soft)]">Toplam {formatMinor(row.grandTotalMinor)} · tahsilat {formatMinor(row.paidMinor)}</p>
                  </article>
                );
              }
              if ('type' in row) {
                return (
                  <article key={row.id} className="admin-row-card">
                    <div className="flex items-center justify-between gap-2"><Link href={`/admin/siparisler/${row.orderId}`} className="font-semibold text-[var(--brand-purple)]">{row.orderNumber}</Link><SmallChip tone={tone(row.status)}>{REFUND_STATUS_LABEL[row.status] ?? row.status}</SmallChip></div>
                    <p className="text-xs text-[var(--admin-ink-soft)]">{dateTime.format(new Date(row.createdAt))} · {REFUND_TYPE_LABEL[row.type] ?? row.type} · {row.by}</p>
                    <p className="mt-1 text-sm font-semibold">{formatMinor(row.amountMinor)}</p>
                  </article>
                );
              }
              return (
                <article key={row.id} className="admin-row-card">
                  <div className="flex items-center justify-between gap-2"><Link href={`/admin/siparisler/${row.orderId}`} className="font-semibold text-[var(--brand-purple)]">{row.orderNumber}</Link><SmallChip tone={tone(row.status)}>{PAY_STATUS_LABEL[row.status] ?? row.status}</SmallChip></div>
                  <p className="text-xs text-[var(--admin-ink-soft)]">{dateTime.format(new Date(row.createdAt))} · {PROVIDER_LABELS[row.provider] ?? row.provider}{row.cardLast4 ? ` · •••• ${row.cardLast4}` : ''}</p>
                  <p className="mt-1 text-sm font-semibold">{formatMinor(row.amountMinor)}{row.installment > 1 ? <span className="text-xs font-normal text-[var(--admin-ink-soft)]"> · {row.installment} taksit</span> : null}</p>
                  {row.errorMessage && <p className="mt-1 text-xs text-[#b42318]">{row.errorMessage}</p>}
                </article>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-[var(--admin-ink-soft)]">Sayfa {data.page} / {data.pageCount} · {data.total} kayıt</span>
            <div className="flex items-center gap-1">
              <select className="admin-select admin-btn-sm" style={{ width: 'auto' }} value={params.pageSize} onChange={(e) => setParams({ pageSize: Number(e.target.value) })} aria-label="Sayfa başına">
                {[25, 50, 100].map((n) => <option key={n} value={n}>{n} / sayfa</option>)}
              </select>
              <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" disabled={data.page <= 1} onClick={() => setParams({ page: data.page - 1 }, false)} aria-label="Önceki"><ChevronLeft size={14} /></button>
              <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" disabled={data.page >= data.pageCount} onClick={() => setParams({ page: data.page + 1 }, false)} aria-label="Sonraki"><ChevronRight size={14} /></button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
