'use client';

// Panel > İadeler: talep listesi, durum sekmeleri, arama, detay/aksiyon diyaloğu.

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { EmptyState, TableSkeleton } from '@/components/admin/primitives';
import { SmallChip, dateTime } from '@/components/admin/orders/status';
import { returnsApi, type AdminReturnRow, type ReturnListParams, type ReturnListResult } from '@/lib/admin/returns-client';
import { returnStatusLabels, RETURN_STATUSES, type ReturnStatus } from '@/server/returns/schema';
import { toast } from '@/store/toast';
import { ReturnDetailDialog } from './ReturnDetailDialog';

const TABS: { id: ReturnStatus | 'tumu'; label: string }[] = [
  { id: 'tumu', label: 'Tümü' },
  ...RETURN_STATUSES.map((s) => ({ id: s, label: returnStatusLabels[s] })),
];

function tone(status: string): 'ok' | 'warn' | 'bad' | 'neutral' {
  if (status === 'tamamlandı') return 'ok';
  if (status === 'reddedildi') return 'bad';
  if (status === 'talep') return 'warn';
  return 'neutral';
}

export function ReturnsList() {
  const router = useRouter();
  const sp = useSearchParams();
  const params: ReturnListParams = {
    status: sp.get('status') ?? 'tumu',
    q: sp.get('q') ?? undefined,
    page: Number(sp.get('page') ?? 1),
    pageSize: Number(sp.get('pageSize') ?? 25),
  };
  const [data, setData] = useState<ReturnListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(params.q ?? '');
  const [openId, setOpenId] = useState<string | null>(null);

  const setParams = (patch: Partial<ReturnListParams>, resetPage = true) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined || v === '' || v === null) next.delete(k);
      else next.set(k, String(v));
    }
    if (resetPage) next.delete('page');
    router.replace(`/admin/iadeler?${next.toString()}`);
  };

  const key = sp.toString();
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = Object.fromEntries(new URLSearchParams(key).entries()) as unknown as ReturnListParams;
      setData(await returnsApi.list(p));
    } catch (err) {
      toast.error('İadeler yüklenemedi', err instanceof Error ? err.message : undefined);
    } finally {
      setLoading(false);
    }
  }, [key]);

  useEffect(() => {
    void load();
  }, [load]);

  const status = params.status as ReturnStatus | 'tumu';

  return (
    <div className="flex flex-col gap-3">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold text-[var(--brand-purple-deep)]">İadeler</h1>
          <p className="admin-hint mt-0.5">Müşteri iade talepleri: onay, ürün kabulü, iade işleme</p>
        </div>
        <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => void load()} aria-label="Yenile"><RefreshCw size={14} /> Yenile</button>
      </header>

      <div role="tablist" aria-label="Durum" className="flex flex-wrap gap-1 border-b border-[var(--admin-border)]">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={status === t.id}
            className={`admin-focusable -mb-px border-b-2 px-3 py-2 text-sm ${status === t.id ? 'border-[var(--brand-purple)] font-semibold text-[var(--brand-purple-deep)]' : 'border-transparent text-[var(--admin-ink-soft)]'}`}
            onClick={() => setParams({ status: t.id })}>
            {t.label}{data && t.id !== 'tumu' ? ` (${data.counts[t.id] ?? 0})` : ''}
          </button>
        ))}
      </div>

      <form className="admin-card flex flex-wrap items-end gap-2" style={{ padding: 10 }} onSubmit={(e) => { e.preventDefault(); setParams({ q: q || undefined }); }}>
        <label className="admin-field" style={{ minWidth: 240 }}>
          <span className="admin-label">Ara</span>
          <input className="admin-input" placeholder="Sipariş no, e-posta" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <button type="submit" className="admin-btn admin-btn-ghost admin-btn-sm">Uygula</button>
      </form>

      {loading && !data ? (
        <TableSkeleton rows={8} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="İade talebi bulunamadı" hint="Filtreleri değiştirin." />
      ) : (
        <>
          <div className="admin-table-wrap admin-view-desktop">
            <table className="admin-table">
              <thead><tr><th>Tarih</th><th>Sipariş</th><th>Müşteri</th><th>Sebep</th><th>Kalem</th><th>Durum</th></tr></thead>
              <tbody>
                {data.items.map((r: AdminReturnRow) => (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap">{dateTime.format(new Date(r.requestedAt))}</td>
                    <td><button type="button" className="font-semibold text-[var(--brand-purple)]" onClick={() => setOpenId(r.id)}>{r.orderNumber}</button></td>
                    <td>{r.customerName}</td>
                    <td>{r.reasonLabel}</td>
                    <td>{r.itemCount}</td>
                    <td><SmallChip tone={tone(r.status)}>{returnStatusLabels[r.status as ReturnStatus] ?? r.status}</SmallChip></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="admin-card-list admin-view-mobile">
            {data.items.map((r) => (
              <article key={r.id} className="admin-row-card">
                <button type="button" className="w-full text-left" onClick={() => setOpenId(r.id)}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-[var(--brand-purple)]">{r.orderNumber}</span>
                    <SmallChip tone={tone(r.status)}>{returnStatusLabels[r.status as ReturnStatus] ?? r.status}</SmallChip>
                  </div>
                  <p className="text-xs text-[var(--admin-ink-soft)]">{dateTime.format(new Date(r.requestedAt))} · {r.customerName}</p>
                  <p className="mt-1 text-sm">{r.reasonLabel} · {r.itemCount} kalem</p>
                </button>
              </article>
            ))}
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

      {openId && <ReturnDetailDialog id={openId} open onClose={() => setOpenId(null)} onChanged={() => void load()} />}
    </div>
  );
}
