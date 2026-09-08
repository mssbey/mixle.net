'use client';

// Panel > Raporlar: tarih aralığı seçici, KPI kartları, günlük satış grafiği,
// en çok satan ürünler, kategori kırılımı, ödeme yöntemi dağılımı, iade sebepleri.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Download, RefreshCw } from 'lucide-react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { TableSkeleton, EmptyState } from '@/components/admin/primitives';
import { reportsApi, type ReportsOverview } from '@/lib/admin/reports-client';
import { formatMinor } from '@/lib/money';
import { toast } from '@/store/toast';

const PURPLE = '#672779';
const GOLD = '#D2940B';

const dayLabel = new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'short', timeZone: 'Europe/Istanbul' });
const todayIstanbul = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });
const daysAgoIstanbul = (n: number) => {
  const d = new Date(Date.now() - n * 86_400_000);
  return d.toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });
};

const PRESETS = [
  { id: '7', label: 'Son 7 gün', days: 7 },
  { id: '30', label: 'Son 30 gün', days: 30 },
  { id: '90', label: 'Son 90 gün', days: 90 },
] as const;

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; dataKey: string }[]; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  const revenue = payload.find((p) => p.dataKey === 'revenueMinor')?.value ?? 0;
  const orders = payload.find((p) => p.dataKey === 'orderCount')?.value ?? 0;
  return (
    <div className="admin-card text-xs" style={{ padding: '6px 10px' }}>
      <p className="font-semibold">{label ? dayLabel.format(new Date(label)) : ''}</p>
      <p>{formatMinor(revenue)} · {orders} sipariş</p>
    </div>
  );
}

function Bar25({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return (
    <div className="mt-1 h-1.5 w-full rounded-full bg-[var(--admin-border)]">
      <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export function ReportsPage() {
  const [from, setFrom] = useState(daysAgoIstanbul(29));
  const [to, setTo] = useState(todayIstanbul());
  const [data, setData] = useState<ReportsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    reportsApi
      .overview(from, to)
      .then(setData)
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Rapor yüklenemedi');
        toast.error('Rapor yüklenemedi');
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [from, to]);

  const maxCatRevenue = useMemo(() => Math.max(1, ...(data?.categories.map((c) => c.revenueMinor) ?? [0])), [data]);
  const maxMethodRevenue = useMemo(() => Math.max(1, ...(data?.paymentMethods.map((m) => m.revenueMinor) ?? [0])), [data]);
  const maxReasonCount = useMemo(() => Math.max(1, ...(data?.returnReasons.map((r) => r.count) ?? [0])), [data]);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold text-[var(--brand-purple-deep)]">Raporlar</h1>
          <p className="admin-hint mt-0.5">Satış, ürün, kategori ve iade özeti</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a className="admin-btn admin-btn-ghost admin-btn-sm" href={reportsApi.csvUrl(from, to)} download><Download size={14} /> CSV (günlük seri)</a>
          <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={load}><RefreshCw size={14} /> Yenile</button>
        </div>
      </header>

      <div className="admin-card flex flex-wrap items-end gap-3" style={{ padding: 10 }}>
        <div className="flex gap-1">
          {PRESETS.map((p) => (
            <button key={p.id} type="button" className="admin-btn admin-btn-ghost admin-btn-sm"
              onClick={() => { setFrom(daysAgoIstanbul(p.days - 1)); setTo(todayIstanbul()); }}>
              {p.label}
            </button>
          ))}
        </div>
        <label className="admin-field"><span className="admin-label">Başlangıç</span><input type="date" className="admin-input" value={from} max={to} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="admin-field"><span className="admin-label">Bitiş</span><input type="date" className="admin-input" value={to} min={from} max={todayIstanbul()} onChange={(e) => setTo(e.target.value)} /></label>
      </div>

      {error && <p className="admin-error" role="alert">{error}</p>}
      {loading && !data ? (
        <TableSkeleton rows={6} />
      ) : !data ? null : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6" aria-live="polite">
            <div className="admin-card admin-stat"><span className="admin-stat-value">{formatMinor(data.summary.revenueMinor)}</span><span className="admin-stat-label">Ciro</span></div>
            <div className="admin-card admin-stat"><span className="admin-stat-value">{formatMinor(data.summary.netRevenueMinor)}</span><span className="admin-stat-label">Net ciro (iade sonrası)</span></div>
            <div className="admin-card admin-stat"><span className="admin-stat-value">{data.summary.orderCount}</span><span className="admin-stat-label">Sipariş sayısı</span></div>
            <div className="admin-card admin-stat"><span className="admin-stat-value">{formatMinor(data.summary.avgOrderValueMinor)}</span><span className="admin-stat-label">Ortalama sepet</span></div>
            <div className="admin-card admin-stat"><span className="admin-stat-value">{formatMinor(data.summary.refundedMinor)}</span><span className="admin-stat-label">İade tutarı</span></div>
            <div className="admin-card admin-stat"><span className="admin-stat-value">%{(data.summary.returnRate * 100).toFixed(1)}</span><span className="admin-stat-label">İade oranı ({data.summary.returnRequestCount} talep)</span></div>
          </div>

          <section className="admin-card" style={{ padding: 16 }}>
            <h2 className="text-sm font-semibold text-[var(--brand-purple-deep)]">Günlük ciro ve sipariş sayısı</h2>
            {data.series.length === 0 ? (
              <EmptyState title="Bu aralıkta veri yok" />
            ) : (
              <div style={{ width: '100%', height: 280 }} className="mt-2">
                <ResponsiveContainer>
                  <ComposedChart data={data.series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-border)" />
                    <XAxis dataKey="date" tickFormatter={(d: string) => dayLabel.format(new Date(d))} fontSize={11} stroke="#8a7f8f" />
                    <YAxis yAxisId="revenue" fontSize={11} stroke="#8a7f8f" tickFormatter={(v: number) => `${Math.round(v / 100)}₺`} />
                    <YAxis yAxisId="orders" orientation="right" fontSize={11} stroke="#8a7f8f" allowDecimals={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar yAxisId="revenue" dataKey="revenueMinor" fill={PURPLE} radius={[3, 3, 0, 0]} name="Ciro" />
                    <Line yAxisId="orders" type="monotone" dataKey="orderCount" stroke={GOLD} strokeWidth={2} dot={false} name="Sipariş" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="admin-card" style={{ padding: 16 }}>
              <h2 className="text-sm font-semibold text-[var(--brand-purple-deep)]">En çok satan ürünler</h2>
              {data.topProducts.length === 0 ? <EmptyState title="Veri yok" /> : (
                <ul className="mt-2 flex flex-col gap-2">
                  {data.topProducts.map((p, i) => (
                    <li key={p.productId} className="text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <Link href={`/admin/urunler/${p.slug}`} className="min-w-0 truncate font-medium text-[var(--brand-purple)]">{i + 1}. {p.name}</Link>
                        <span className="whitespace-nowrap text-xs text-[var(--admin-ink-soft)]">{p.quantity} adet</span>
                        <span className="whitespace-nowrap font-semibold">{formatMinor(p.revenueMinor)}</span>
                      </div>
                      <Bar25 value={p.revenueMinor} max={data.topProducts[0]?.revenueMinor ?? 1} color={PURPLE} />
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="admin-card" style={{ padding: 16 }}>
              <h2 className="text-sm font-semibold text-[var(--brand-purple-deep)]">Kategori kırılımı</h2>
              <p className="admin-hint mt-0.5">Bir ürün birden fazla kategoriye aitse tutarı her birine tam yazılır.</p>
              {data.categories.length === 0 ? <EmptyState title="Veri yok" /> : (
                <ul className="mt-2 flex flex-col gap-2">
                  {data.categories.map((c) => (
                    <li key={c.categoryId} className="text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate font-medium">{c.name}</span>
                        <span className="whitespace-nowrap font-semibold">{formatMinor(c.revenueMinor)}</span>
                      </div>
                      <Bar25 value={c.revenueMinor} max={maxCatRevenue} color={GOLD} />
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="admin-card" style={{ padding: 16 }}>
              <h2 className="text-sm font-semibold text-[var(--brand-purple-deep)]">Ödeme yöntemi dağılımı</h2>
              {data.paymentMethods.length === 0 ? <EmptyState title="Veri yok" /> : (
                <ul className="mt-2 flex flex-col gap-2">
                  {data.paymentMethods.map((m) => (
                    <li key={m.method} className="text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{m.label}</span>
                        <span className="text-xs text-[var(--admin-ink-soft)]">{m.count} sipariş</span>
                        <span className="whitespace-nowrap font-semibold">{formatMinor(m.revenueMinor)}</span>
                      </div>
                      <Bar25 value={m.revenueMinor} max={maxMethodRevenue} color={PURPLE} />
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="admin-card" style={{ padding: 16 }}>
              <h2 className="text-sm font-semibold text-[var(--brand-purple-deep)]">İade sebepleri</h2>
              {data.returnReasons.length === 0 ? <EmptyState title="Bu aralıkta iade talebi yok" /> : (
                <ul className="mt-2 flex flex-col gap-2">
                  {data.returnReasons.map((r) => (
                    <li key={r.reason} className="text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{r.reasonLabel}</span>
                        <span className="whitespace-nowrap font-semibold">{r.count}</span>
                      </div>
                      <Bar25 value={r.count} max={maxReasonCount} color={GOLD} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
