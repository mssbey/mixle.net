'use client';

// Panel > Kargolar: tüm siparişlerdeki sevkiyatlar, filtre, toplu etiket/takip.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, ExternalLink, Printer, RefreshCw, Truck } from 'lucide-react';
import { useAdminData } from '@/components/admin/AdminDataProvider';
import { EmptyState, TableSkeleton } from '@/components/admin/primitives';
import { SmallChip, dateTime } from '@/components/admin/orders/status';
import { CARRIERS, carrierLabels } from '@/server/shipping/carriers';
import { SHIPMENT_TABS, type ShipmentTab } from '@/server/shipping/shipment-tabs';
import { shipmentsApi, type ShipmentListParams, type ShipmentListResult } from '@/lib/admin/shipping-client';
import { toast } from '@/store/toast';
import { ShipmentQuickDialog } from './ShipmentQuickDialog';

function tone(status: string): 'ok' | 'warn' | 'bad' | 'neutral' {
  if (status === 'teslim-edildi') return 'ok';
  if (status === 'kayıp' || status === 'iade-yolda') return 'bad';
  if (status === 'kargoya-verildi' || status === 'dağıtımda') return 'warn';
  return 'neutral';
}

export function ShipmentsList() {
  const router = useRouter();
  const sp = useSearchParams();
  const { can } = useAdminData();
  const canShip = can('kargo:yaz');

  const params: ShipmentListParams = {
    tab: (sp.get('tab') as ShipmentTab) || 'tumu',
    carrier: sp.get('carrier') ?? undefined,
    q: sp.get('q') ?? undefined,
    from: sp.get('from') ?? undefined,
    to: sp.get('to') ?? undefined,
    page: Number(sp.get('page') ?? 1),
    pageSize: Number(sp.get('pageSize') ?? 25),
  };
  const [data, setData] = useState<ShipmentListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(params.q ?? '');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editId, setEditId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const setParams = (patch: Partial<ShipmentListParams>, resetPage = true) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined || v === '' || v === null) next.delete(k);
      else next.set(k, String(v));
    }
    if (resetPage) next.delete('page');
    router.replace(`/admin/kargolar?${next.toString()}`);
  };

  const key = sp.toString();
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = Object.fromEntries(new URLSearchParams(key).entries()) as unknown as ShipmentListParams;
      setData(await shipmentsApi.list(p));
    } catch (err) {
      toast.error('Sevkiyatlar yüklenemedi', err instanceof Error ? err.message : undefined);
    } finally {
      setLoading(false);
    }
  }, [key]);

  useEffect(() => {
    void load();
  }, [load]);

  const tab = params.tab as ShipmentTab;
  const toggleAll = () => setSelected((s) => (s.size === data?.items.length ? new Set() : new Set(data?.items.map((i) => i.id) ?? [])));
  const toggleOne = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const runBulkSync = async () => {
    if (selected.size === 0) return;
    setSyncing(true);
    try {
      const res = await shipmentsApi.syncBulk([...selected]);
      toast.info('Takip yenilendi', `${res.updated} / ${res.total} sevkiyat güncellendi (bağlı sağlayıcı yoksa değişmez)`);
      await load();
    } catch (err) {
      toast.error('Takip yenilenemedi', err instanceof Error ? err.message : undefined);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold text-[var(--brand-purple-deep)]">Kargolar</h1>
          <p className="admin-hint mt-0.5">Tüm siparişlerdeki sevkiyatlar</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/ayarlar/kargo" className="admin-btn admin-btn-ghost admin-btn-sm">Kargo ayarları</Link>
          <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => void load()} aria-label="Yenile"><RefreshCw size={14} /> Yenile</button>
        </div>
      </header>

      <div role="tablist" aria-label="Durum" className="flex flex-wrap gap-1 border-b border-[var(--admin-border)]">
        {(Object.keys(SHIPMENT_TABS) as ShipmentTab[]).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t}
            className={`admin-focusable -mb-px border-b-2 px-3 py-2 text-sm ${tab === t ? 'border-[var(--brand-purple)] font-semibold text-[var(--brand-purple-deep)]' : 'border-transparent text-[var(--admin-ink-soft)]'}`}
            onClick={() => setParams({ tab: t })}>
            {SHIPMENT_TABS[t].label}{data ? ` (${data.counts[t] ?? 0})` : ''}
          </button>
        ))}
      </div>

      <form className="admin-card flex flex-wrap items-end gap-2" style={{ padding: 10 }} onSubmit={(e) => { e.preventDefault(); setParams({ q: q || undefined }); }}>
        <label className="admin-field" style={{ minWidth: 160 }}>
          <span className="admin-label">Kargo firması</span>
          <select className="admin-select" value={params.carrier ?? ''} onChange={(e) => setParams({ carrier: e.target.value || undefined })}>
            <option value="">Tümü</option>
            {CARRIERS.map((c) => <option key={c} value={c}>{carrierLabels[c]}</option>)}
          </select>
        </label>
        <label className="admin-field" style={{ minWidth: 220 }}>
          <span className="admin-label">Ara</span>
          <input className="admin-input" placeholder="Sipariş no, takip no, e-posta" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <button type="submit" className="admin-btn admin-btn-ghost admin-btn-sm">Uygula</button>
      </form>

      {canShip && selected.size > 0 && (
        <div className="admin-card flex flex-wrap items-center gap-2" style={{ padding: 10, borderColor: 'var(--brand-purple)' }} role="region" aria-label="Toplu işlemler">
          <span className="text-xs font-semibold text-[var(--brand-purple-deep)]">{selected.size} seçili</span>
          <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" disabled={syncing} onClick={() => void runBulkSync()}>
            <RefreshCw size={14} /> {syncing ? 'Yenileniyor…' : 'Takibi yenile'}
          </button>
          <a className="admin-btn admin-btn-ghost admin-btn-sm" href={`/admin/kargolar/yazdir?ids=${[...selected].join(',')}`} target="_blank" rel="noreferrer">
            <Printer size={14} /> Etiket yazdır
          </a>
          <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => setSelected(new Set())}>Seçimi kaldır</button>
        </div>
      )}

      {loading && !data ? (
        <TableSkeleton rows={8} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="Sevkiyat bulunamadı" hint="Filtreleri değiştirin veya sipariş detayından kargo oluşturun." />
      ) : (
        <>
          <div className="admin-table-wrap admin-view-desktop">
            <table className="admin-table">
              <thead>
                <tr>
                  {canShip && <th style={{ width: 28 }}><input type="checkbox" aria-label="Tümünü seç" checked={selected.size > 0 && selected.size === data.items.length} onChange={toggleAll} /></th>}
                  <th>Sipariş</th><th>Firma</th><th>Takip no</th><th>Alıcı</th><th>Kalem</th><th>Durum</th><th>Tarih</th><th></th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((s) => (
                  <tr key={s.id} data-selected={selected.has(s.id)}>
                    {canShip && <td><input type="checkbox" aria-label={`${s.orderNumber} seç`} checked={selected.has(s.id)} onChange={() => toggleOne(s.id)} /></td>}
                    <td><Link href={`/admin/siparisler/${s.orderId}`} className="font-semibold text-[var(--brand-purple)]">{s.orderNumber}</Link></td>
                    <td>{s.carrierLabel}</td>
                    <td className="text-xs">
                      {s.trackingNumber || '—'}
                      {s.trackingUrl && <a href={s.trackingUrl} target="_blank" rel="noreferrer" className="ml-1 inline-flex align-middle text-[var(--brand-purple)]" aria-label="Takip sayfası"><ExternalLink size={12} /></a>}
                    </td>
                    <td>{s.customerName}{s.customerCity ? <span className="text-xs text-[var(--admin-ink-soft)]"> · {s.customerCity}</span> : null}</td>
                    <td>{s.itemCount}</td>
                    <td><SmallChip tone={tone(s.status)}>{s.status}</SmallChip></td>
                    <td className="whitespace-nowrap text-xs">{dateTime.format(new Date(s.createdAt))}</td>
                    <td>{canShip && <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => setEditId(s.id)}><Truck size={12} /> Güncelle</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="admin-card-list admin-view-mobile">
            {data.items.map((s) => (
              <article key={s.id} className="admin-row-card">
                <div className="flex items-start gap-2">
                  {canShip && <input type="checkbox" aria-label={`${s.orderNumber} seç`} checked={selected.has(s.id)} onChange={() => toggleOne(s.id)} className="mt-1" />}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <Link href={`/admin/siparisler/${s.orderId}`} className="font-semibold text-[var(--brand-purple)]">{s.orderNumber}</Link>
                      <SmallChip tone={tone(s.status)}>{s.status}</SmallChip>
                    </div>
                    <p className="text-xs text-[var(--admin-ink-soft)]">{s.carrierLabel} · {s.trackingNumber || 'takip no yok'}</p>
                    <p className="mt-1 text-sm">{s.customerName} · {s.itemCount} kalem</p>
                    {canShip && <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm mt-2" onClick={() => setEditId(s.id)}><Truck size={12} /> Güncelle</button>}
                  </div>
                </div>
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

      {editId && (
        <ShipmentQuickDialog
          shipment={data?.items.find((s) => s.id === editId) ?? null}
          open
          onClose={() => setEditId(null)}
          onUpdated={() => { setEditId(null); void load(); }}
        />
      )}
    </div>
  );
}
