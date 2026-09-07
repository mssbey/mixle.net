'use client';

// Sipariş listesi: durum sekmeleri, arama, filtreler, sıralama, sayfalama,
// toplu işlemler, CSV dışa aktarım. Mobilde kart görünümü.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Download, Plus, ChevronLeft, ChevronRight, Filter, X } from 'lucide-react';
import { ordersApi, type OrderListParams } from '@/lib/admin/orders-client';
import { ApiError } from '@/lib/admin/client';
import { useAdminData } from '@/components/admin/AdminDataProvider';
import { EmptyState, TableSkeleton } from '@/components/admin/primitives';
import { toast } from '@/store/toast';
import { formatMinor } from '@/lib/money';
import type { OrderListResult } from '@/server/orders/admin-view';
import { ORDER_TABS, type OrderTab } from '@/server/orders/order-tabs';
import { ORDER_STATUSES, orderStatusLabels, type OrderStatus } from '@/server/orders/state-machine';
import { CARRIERS, carrierLabels } from '@/server/shipping/carriers';
import { OrderStatusChip, SmallChip, dateTime, paymentStatusLabels } from './status';
import { cn } from '@/lib/utils';

const PAYMENT_METHODS = [
  { id: 'kart', label: 'Kart' },
  { id: 'havale', label: 'Havale / EFT' },
  { id: 'kapida', label: 'Kapıda' },
];

function readParams(sp: URLSearchParams): OrderListParams {
  const num = (k: string) => (sp.get(k) ? Number(sp.get(k)) : undefined);
  return {
    tab: (sp.get('tab') as OrderTab) || 'tumu',
    q: sp.get('q') || undefined,
    from: sp.get('from') || undefined,
    to: sp.get('to') || undefined,
    minMinor: num('minMinor'),
    maxMinor: num('maxMinor'),
    paymentMethod: sp.get('paymentMethod') || undefined,
    carrier: sp.get('carrier') || undefined,
    source: sp.get('source') || undefined,
    sort: (sp.get('sort') as OrderListParams['sort']) || 'placedAt',
    dir: (sp.get('dir') as OrderListParams['dir']) || 'desc',
    page: num('page') ?? 1,
    pageSize: num('pageSize') ?? 25,
  };
}

export function OrderList() {
  const router = useRouter();
  const sp = useSearchParams();
  const { can } = useAdminData();
  const canWrite = can('siparis:yaz');

  const params = readParams(sp);
  const [data, setData] = useState<OrderListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(params.q ?? '');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filtersOpen, setFiltersOpen] = useState(Boolean(params.from || params.to || params.paymentMethod || params.carrier || params.minMinor || params.maxMinor || params.source));
  const [bulkBusy, setBulkBusy] = useState(false);

  const setParams = (patch: Partial<OrderListParams>, resetPage = true) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries({ ...patch, ...(resetPage ? { page: 1 } : {}) })) {
      if (v === undefined || v === '' || v === null) next.delete(k);
      else next.set(k, String(v));
    }
    router.replace(`/admin/siparisler?${next.toString()}`);
  };

  // URL değişince veya `reload()` çağrılınca yeniden yükle (React Compiler ile
  // uyumlu: manuel useCallback yok, tetikleyici sayaç).
  const spKey = sp.toString();
  const [tick, setTick] = useState(0);
  const load = () => setTick((t) => t + 1);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    ordersApi
      .list(readParams(new URLSearchParams(spKey)))
      .then((d) => {
        if (!alive) return;
        setData(d);
        setSelected(new Set());
      })
      .catch((err: unknown) => alive && toast.error('Siparişler yüklenemedi', err instanceof ApiError ? err.message : undefined))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [spKey, tick]);

  const toggleAll = () => {
    if (!data) return;
    setSelected((s) => (s.size === data.items.length ? new Set() : new Set(data.items.map((o) => o.id))));
  };
  const toggleOne = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const runBulk = async (body: Parameters<typeof ordersApi.bulk>[0]) => {
    setBulkBusy(true);
    try {
      const r = await ordersApi.bulk(body);
      if (r.failed === 0) toast.success(`${r.ok} sipariş güncellendi`);
      else toast.error(`${r.ok} başarılı, ${r.failed} başarısız`, r.results.filter((x) => !x.ok).map((x) => `${x.orderNumber}: ${x.message}`).join(' · '));
      load();
    } catch (err) {
      toast.error('Toplu işlem başarısız', err instanceof ApiError ? err.message : undefined);
    } finally {
      setBulkBusy(false);
    }
  };

  const sortBy = (col: NonNullable<OrderListParams['sort']>) =>
    setParams({ sort: col, dir: params.sort === col && params.dir === 'desc' ? 'asc' : 'desc' }, false);
  const sortMark = (col: string) => (params.sort === col ? (params.dir === 'desc' ? ' ↓' : ' ↑') : '');

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-[var(--brand-purple-deep)]">Siparişler</h1>
          <p className="admin-hint">{data ? `${data.total} sipariş` : '…'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a className="admin-btn admin-btn-ghost" href={ordersApi.exportUrl(params)}>
            <Download size={14} /> CSV
          </a>
          {canWrite && (
            <Link href="/admin/siparisler/yeni" className="admin-btn admin-btn-primary">
              <Plus size={14} /> Yeni sipariş
            </Link>
          )}
        </div>
      </header>

      {/* Sekmeler */}
      <nav className="flex flex-wrap gap-1" aria-label="Durum sekmeleri">
        {(Object.keys(ORDER_TABS) as OrderTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setParams({ tab })}
            aria-current={params.tab === tab ? 'page' : undefined}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
              params.tab === tab
                ? 'border-[var(--brand-purple)] bg-[var(--brand-purple)] text-white'
                : 'border-[var(--admin-border)] bg-white text-[var(--admin-ink-soft)] hover:bg-[#f7f4ef]',
            )}
          >
            {ORDER_TABS[tab].label}
            {data && <span className="ml-1.5 opacity-70">{data.tabCounts[tab]}</span>}
          </button>
        ))}
      </nav>

      {/* Arama + filtre */}
      <div className="admin-card flex flex-wrap items-center gap-2" style={{ padding: 10 }}>
        <form
          className="relative flex-1 min-w-[220px]"
          onSubmit={(e) => {
            e.preventDefault();
            setParams({ q: search.trim() || undefined });
          }}
        >
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--admin-ink-soft)]" />
          <input
            className="admin-input"
            style={{ paddingLeft: 28 }}
            placeholder="Sipariş no, ad, e-posta, telefon, ürün, SKU, takip no…"
            aria-label="Sipariş ara"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>
        <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => setFiltersOpen((v) => !v)} aria-expanded={filtersOpen}>
          <Filter size={14} /> Filtreler
        </button>
        {(params.q || params.from || params.to || params.paymentMethod || params.carrier || params.minMinor || params.maxMinor || params.source) && (
          <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => { setSearch(''); router.replace(`/admin/siparisler?tab=${params.tab}`); }}>
            <X size={14} /> Temizle
          </button>
        )}

        {filtersOpen && (
          <div className="grid w-full gap-2 border-t border-[var(--admin-border)] pt-3 sm:grid-cols-3 lg:grid-cols-6">
            <label className="admin-field">
              <span className="admin-label">Başlangıç</span>
              <input type="date" className="admin-input" value={params.from?.slice(0, 10) ?? ''} onChange={(e) => setParams({ from: e.target.value ? new Date(`${e.target.value}T00:00:00`).toISOString() : undefined })} />
            </label>
            <label className="admin-field">
              <span className="admin-label">Bitiş</span>
              <input type="date" className="admin-input" value={params.to?.slice(0, 10) ?? ''} onChange={(e) => setParams({ to: e.target.value ? new Date(`${e.target.value}T23:59:59`).toISOString() : undefined })} />
            </label>
            <label className="admin-field">
              <span className="admin-label">Min tutar (₺)</span>
              <input type="number" min={0} className="admin-input" value={params.minMinor != null ? params.minMinor / 100 : ''} onChange={(e) => setParams({ minMinor: e.target.value ? Math.round(Number(e.target.value) * 100) : undefined })} />
            </label>
            <label className="admin-field">
              <span className="admin-label">Maks tutar (₺)</span>
              <input type="number" min={0} className="admin-input" value={params.maxMinor != null ? params.maxMinor / 100 : ''} onChange={(e) => setParams({ maxMinor: e.target.value ? Math.round(Number(e.target.value) * 100) : undefined })} />
            </label>
            <label className="admin-field">
              <span className="admin-label">Ödeme</span>
              <select className="admin-select" value={params.paymentMethod ?? ''} onChange={(e) => setParams({ paymentMethod: e.target.value || undefined })}>
                <option value="">Tümü</option>
                {PAYMENT_METHODS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </label>
            <label className="admin-field">
              <span className="admin-label">Kargo</span>
              <select className="admin-select" value={params.carrier ?? ''} onChange={(e) => setParams({ carrier: e.target.value || undefined })}>
                <option value="">Tümü</option>
                {CARRIERS.map((c) => <option key={c} value={c}>{carrierLabels[c]}</option>)}
              </select>
            </label>
            <label className="admin-field">
              <span className="admin-label">Kaynak</span>
              <select className="admin-select" value={params.source ?? ''} onChange={(e) => setParams({ source: e.target.value || undefined })}>
                <option value="">Tümü</option>
                <option value="web">Web</option>
                <option value="panel">Panel</option>
                <option value="telefon">Telefon</option>
              </select>
            </label>
          </div>
        )}
      </div>

      {/* Toplu işlem */}
      {selected.size > 0 && canWrite && (
        <div className="admin-card flex flex-wrap items-center gap-2" style={{ padding: 10, borderColor: 'var(--brand-purple)' }} role="region" aria-label="Toplu işlemler">
          <span className="text-xs font-semibold text-[var(--brand-purple-deep)]">{selected.size} seçili</span>
          <select className="admin-select admin-btn-sm" style={{ width: 'auto' }} defaultValue="" disabled={bulkBusy} aria-label="Toplu durum"
            onChange={(e) => { const to = e.target.value as OrderStatus; e.currentTarget.value = ''; if (to) void runBulk({ action: 'durum', ids: [...selected], to }); }}>
            <option value="" disabled>Durum değiştir…</option>
            {ORDER_STATUSES.filter((s) => s !== 'taslak').map((s) => <option key={s} value={s}>{orderStatusLabels[s]}</option>)}
          </select>
          <select className="admin-select admin-btn-sm" style={{ width: 'auto' }} defaultValue="" disabled={bulkBusy} aria-label="Toplu kargoya ver"
            onChange={(e) => { const c = e.target.value as (typeof CARRIERS)[number]; e.currentTarget.value = ''; if (c) void runBulk({ action: 'kargo', ids: [...selected], carrier: c }); }}>
            <option value="" disabled>Kargoya ver…</option>
            {CARRIERS.map((c) => <option key={c} value={c}>{carrierLabels[c]}</option>)}
          </select>
          <a className="admin-btn admin-btn-ghost admin-btn-sm" href={`/admin/siparisler/yazdir?ids=${[...selected].join(',')}`} target="_blank" rel="noreferrer">
            Fatura / irsaliye yazdır
          </a>
          <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => setSelected(new Set())}>Seçimi kaldır</button>
        </div>
      )}

      {/* Tablo */}
      {loading && !data ? (
        <TableSkeleton rows={8} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="Sipariş bulunamadı" hint="Filtreleri değiştirin veya yeni sipariş oluşturun." />
      ) : (
        <>
          <div className="admin-table-wrap admin-table-wrap--sticky admin-view-desktop">
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: 32 }}>
                    <input type="checkbox" aria-label="Tümünü seç" checked={selected.size === data.items.length} onChange={toggleAll} />
                  </th>
                  <th><button type="button" className="font-semibold" onClick={() => sortBy('orderNumber')}>Sipariş{sortMark('orderNumber')}</button></th>
                  <th><button type="button" className="font-semibold" onClick={() => sortBy('placedAt')}>Tarih{sortMark('placedAt')}</button></th>
                  <th>Müşteri</th>
                  <th><button type="button" className="font-semibold" onClick={() => sortBy('status')}>Durum{sortMark('status')}</button></th>
                  <th>Ödeme</th>
                  <th>Kargo</th>
                  <th className="text-right"><button type="button" className="font-semibold" onClick={() => sortBy('grandTotalMinor')}>Toplam{sortMark('grandTotalMinor')}</button></th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((o) => (
                  <tr key={o.id} data-selected={selected.has(o.id)}>
                    <td><input type="checkbox" aria-label={`${o.orderNumber} seç`} checked={selected.has(o.id)} onChange={() => toggleOne(o.id)} /></td>
                    <td>
                      <Link href={`/admin/siparisler/${o.id}`} className="font-semibold text-[var(--brand-purple)] hover:underline">{o.orderNumber}</Link>
                      <div className="text-[11px] text-[var(--admin-ink-soft)]">{o.itemCount} ürün · {o.source}</div>
                    </td>
                    <td className="whitespace-nowrap text-xs">{dateTime.format(new Date(o.placedAt))}</td>
                    <td>
                      <div className="text-sm">{o.customerName || '—'}</div>
                      <div className="text-[11px] text-[var(--admin-ink-soft)]">{o.customerEmail}</div>
                    </td>
                    <td><OrderStatusChip status={o.status} /></td>
                    <td>
                      <div className="text-xs">{o.paymentMethodLabel}</div>
                      <SmallChip tone={o.paymentStatus === 'ödendi' ? 'ok' : o.paymentStatus === 'bekliyor' ? 'warn' : 'neutral'}>{paymentStatusLabels[o.paymentStatus] ?? o.paymentStatus}</SmallChip>
                    </td>
                    <td className="text-xs">
                      {o.carrier ? <>{carrierLabels[o.carrier as keyof typeof carrierLabels] ?? o.carrier}<div className="text-[11px] text-[var(--admin-ink-soft)]">{o.trackingNumber ?? '—'}</div></> : <span className="text-[var(--admin-ink-soft)]">—</span>}
                    </td>
                    <td className="text-right font-semibold whitespace-nowrap">
                      {formatMinor(o.grandTotalMinor)}
                      {o.refundedTotalMinor > 0 && <div className="text-[11px] font-normal text-[#b42318]">−{formatMinor(o.refundedTotalMinor)} iade</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="admin-card-list admin-view-mobile">
            {data.items.map((o) => (
              <article key={o.id} className="admin-row-card" data-selected={selected.has(o.id)}>
                <div className="flex items-start gap-2">
                  <input type="checkbox" aria-label={`${o.orderNumber} seç`} checked={selected.has(o.id)} onChange={() => toggleOne(o.id)} className="mt-1" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <Link href={`/admin/siparisler/${o.id}`} className="font-semibold text-[var(--brand-purple)]">{o.orderNumber}</Link>
                      <OrderStatusChip status={o.status} />
                    </div>
                    <p className="text-xs text-[var(--admin-ink-soft)]">{dateTime.format(new Date(o.placedAt))} · {o.customerName || o.customerEmail}</p>
                    <p className="mt-1 text-sm font-semibold">{formatMinor(o.grandTotalMinor)} <span className="text-xs font-normal text-[var(--admin-ink-soft)]">· {o.paymentMethodLabel}</span></p>
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
    </div>
  );
}
