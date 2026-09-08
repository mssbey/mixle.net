'use client';

// Panel > Stok: hareket dökümü ve düşük stok raporu (+ manuel düzeltme).

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { EmptyState, TableSkeleton } from '@/components/admin/primitives';
import { SmallChip, dateTime } from '@/components/admin/orders/status';
import { useAdminData } from '@/components/admin/AdminDataProvider';
import { stockApi, type LowStockReport, type StockMovementListParams, type StockMovementListResult, type LowStockRow } from '@/lib/admin/stock-client';
import { toast } from '@/store/toast';
import { AdjustStockDialog } from './AdjustStockDialog';

const REASON_LABEL: Record<string, string> = {
  sipariş: 'Sipariş', iptal: 'İptal', iade: 'İade', manuel: 'Manuel', sayım: 'Sayım', fire: 'Fire', 'rezervasyon-iptal': 'Rezervasyon iptali',
};

export function StockPanel() {
  const router = useRouter();
  const sp = useSearchParams();
  const { can } = useAdminData();
  const canWrite = can('stok:yaz');
  const view = (sp.get('view') as 'hareketler' | 'dusuk') || 'dusuk';

  const setView = (v: 'hareketler' | 'dusuk') => {
    const next = new URLSearchParams(sp.toString());
    next.set('view', v);
    router.replace(`/admin/stok?${next.toString()}`);
  };

  return (
    <div className="flex flex-col gap-3">
      <header>
        <h1 className="text-lg font-semibold text-[var(--brand-purple-deep)]">Stok</h1>
        <p className="admin-hint mt-0.5">Düşük stok uyarısı ve tüm stok hareketlerinin dökümü</p>
      </header>

      <div role="tablist" aria-label="Görünüm" className="flex flex-wrap gap-1 border-b border-[var(--admin-border)]">
        {([['dusuk', 'Düşük stok'], ['hareketler', 'Hareketler']] as const).map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={view === id}
            className={`admin-focusable -mb-px border-b-2 px-3 py-2 text-sm ${view === id ? 'border-[var(--brand-purple)] font-semibold text-[var(--brand-purple-deep)]' : 'border-transparent text-[var(--admin-ink-soft)]'}`}
            onClick={() => setView(id)}>
            {label}
          </button>
        ))}
      </div>

      {view === 'dusuk' ? <LowStockTab canWrite={canWrite} /> : <MovementsTab />}
    </div>
  );
}

function LowStockTab({ canWrite }: { canWrite: boolean }) {
  const [data, setData] = useState<LowStockReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [adjusting, setAdjusting] = useState<LowStockRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await stockApi.lowStock());
    } catch (err) {
      toast.error('Düşük stok raporu yüklenemedi', err instanceof Error ? err.message : undefined);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !data) return <TableSkeleton rows={6} />;
  if (!data || data.items.length === 0) return <EmptyState title="Düşük stoklu ürün yok" hint={data ? `Eşik: ${data.threshold} adet ve altı` : undefined} />;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="admin-hint">Eşik: {data.threshold} adet ve altı (yayındaki ürünler)</p>
        <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => void load()}><RefreshCw size={14} /> Yenile</button>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Ürün</th><th>SKU</th><th className="text-right">Stok</th><th></th></tr></thead>
          <tbody>
            {data.items.map((r) => (
              <tr key={r.variantId}>
                <td><Link href={`/admin/urunler/${r.productSlug}`} className="font-semibold text-[var(--brand-purple)]">{r.productName}</Link></td>
                <td className="text-xs text-[var(--admin-ink-soft)]">{r.sku || '—'}</td>
                <td className="text-right"><SmallChip tone={r.stock <= 0 ? 'bad' : 'warn'}>{r.stock}</SmallChip></td>
                <td>{canWrite && <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => setAdjusting(r)}>Düzelt</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {adjusting && <AdjustStockDialog row={adjusting} open onClose={() => setAdjusting(null)} onSaved={() => { setAdjusting(null); void load(); }} />}
    </div>
  );
}

function MovementsTab() {
  const sp = useSearchParams();
  const router = useRouter();
  const params: StockMovementListParams = {
    q: sp.get('q') ?? undefined,
    reason: sp.get('reason') ?? undefined,
    page: Number(sp.get('page') ?? 1),
    pageSize: Number(sp.get('pageSize') ?? 25),
  };
  const [data, setData] = useState<StockMovementListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(params.q ?? '');

  const setParams = (patch: Partial<StockMovementListParams>, resetPage = true) => {
    const next = new URLSearchParams(sp.toString());
    next.set('view', 'hareketler');
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined || v === '' || v === null) next.delete(k);
      else next.set(k, String(v));
    }
    if (resetPage) next.delete('page');
    router.replace(`/admin/stok?${next.toString()}`);
  };

  const key = sp.toString();
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = Object.fromEntries(new URLSearchParams(key).entries()) as unknown as StockMovementListParams;
      setData(await stockApi.movements(p));
    } catch (err) {
      toast.error('Hareketler yüklenemedi', err instanceof Error ? err.message : undefined);
    } finally {
      setLoading(false);
    }
  }, [key]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="flex flex-col gap-3">
      <form className="admin-card flex flex-wrap items-end gap-2" style={{ padding: 10 }} onSubmit={(e) => { e.preventDefault(); setParams({ q: q || undefined }); }}>
        <label className="admin-field" style={{ minWidth: 160 }}>
          <span className="admin-label">Sebep</span>
          <select className="admin-select" value={params.reason ?? ''} onChange={(e) => setParams({ reason: e.target.value || undefined })}>
            <option value="">Tümü</option>
            {Object.entries(REASON_LABEL).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </label>
        <label className="admin-field" style={{ minWidth: 220 }}>
          <span className="admin-label">Ara</span>
          <input className="admin-input" placeholder="Ürün, SKU, sipariş no" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <button type="submit" className="admin-btn admin-btn-ghost admin-btn-sm">Uygula</button>
      </form>

      {loading && !data ? (
        <TableSkeleton rows={8} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="Stok hareketi bulunamadı" />
      ) : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Tarih</th><th>Ürün</th><th>SKU</th><th className="text-right">Değişim</th><th className="text-right">Sonrası</th><th>Sebep</th><th>Sipariş</th><th>Kullanıcı</th></tr></thead>
              <tbody>
                {data.items.map((m) => (
                  <tr key={m.id}>
                    <td className="whitespace-nowrap text-xs">{dateTime.format(new Date(m.createdAt))}</td>
                    <td>{m.productName}</td>
                    <td className="text-xs text-[var(--admin-ink-soft)]">{m.sku || '—'}</td>
                    <td className={`text-right font-semibold ${m.delta < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>{m.delta > 0 ? `+${m.delta}` : m.delta}</td>
                    <td className="text-right">{m.stockAfter}</td>
                    <td>{REASON_LABEL[m.reason] ?? m.reason}{m.note && <span className="block text-xs text-[var(--admin-ink-soft)]">{m.note}</span>}</td>
                    <td>{m.orderNumber ? <Link href={`/admin/siparisler/${m.orderId}`} className="text-[var(--brand-purple)]">{m.orderNumber}</Link> : '—'}</td>
                    <td className="text-xs">{m.createdByName ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
