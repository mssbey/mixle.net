'use client';

// Panel > Müşteriler: liste, arama, sıralama.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { EmptyState, TableSkeleton } from '@/components/admin/primitives';
import { SmallChip } from '@/components/admin/orders/status';
import { customersApi, type CustomerListParams, type CustomerListResult } from '@/lib/admin/customers-client';
import { formatMinor } from '@/lib/money';
import { toast } from '@/store/toast';

const dateOnly = new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Europe/Istanbul' });

export function CustomersList() {
  const router = useRouter();
  const sp = useSearchParams();
  const params: CustomerListParams = {
    q: sp.get('q') ?? undefined,
    sort: (sp.get('sort') as CustomerListParams['sort']) || 'yeni',
    page: Number(sp.get('page') ?? 1),
    pageSize: Number(sp.get('pageSize') ?? 25),
  };
  const [data, setData] = useState<CustomerListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(params.q ?? '');

  const setParams = (patch: Partial<CustomerListParams>, resetPage = true) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined || v === '' || v === null) next.delete(k);
      else next.set(k, String(v));
    }
    if (resetPage) next.delete('page');
    router.replace(`/admin/musteriler?${next.toString()}`);
  };

  const key = sp.toString();
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = Object.fromEntries(new URLSearchParams(key).entries()) as unknown as CustomerListParams;
      setData(await customersApi.list(p));
    } catch (err) {
      toast.error('Müşteriler yüklenemedi', err instanceof Error ? err.message : undefined);
    } finally {
      setLoading(false);
    }
  }, [key]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="flex flex-col gap-3">
      <header>
        <h1 className="text-lg font-semibold text-[var(--brand-purple-deep)]">Müşteriler</h1>
        <p className="admin-hint mt-0.5">Hesaplı müşteriler: sipariş sayısı, harcama, notlar</p>
      </header>

      <form className="admin-card flex flex-wrap items-end gap-2" style={{ padding: 10 }} onSubmit={(e) => { e.preventDefault(); setParams({ q: q || undefined }); }}>
        <label className="admin-field" style={{ minWidth: 240 }}>
          <span className="admin-label">Ara</span>
          <input className="admin-input" placeholder="Ad, e-posta, telefon" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <label className="admin-field" style={{ minWidth: 160 }}>
          <span className="admin-label">Sırala</span>
          <select className="admin-select" value={params.sort} onChange={(e) => setParams({ sort: e.target.value as CustomerListParams['sort'] })}>
            <option value="yeni">En yeni</option>
            <option value="harcama">En çok harcayan</option>
            <option value="siparis">En çok sipariş</option>
          </select>
        </label>
        <button type="submit" className="admin-btn admin-btn-ghost admin-btn-sm">Uygula</button>
      </form>

      {loading && !data ? (
        <TableSkeleton rows={8} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="Müşteri bulunamadı" hint="Filtreleri değiştirin." />
      ) : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Müşteri</th><th>E-posta</th><th className="text-right">Sipariş</th><th className="text-right">Harcama</th><th>Son sipariş</th><th>Kayıt</th></tr></thead>
              <tbody>
                {data.items.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/admin/musteriler/${c.id}`} className="font-semibold text-[var(--brand-purple)]">{c.name || '—'}</Link>
                      {c.anonymizedAt && <SmallChip tone="neutral">Anonim</SmallChip>}
                      {c.tags.length > 0 && <span className="ml-1 text-xs text-[var(--admin-ink-soft)]">{c.tags.join(', ')}</span>}
                    </td>
                    <td className="text-xs">{c.email}</td>
                    <td className="text-right">{c.orderCount}</td>
                    <td className="text-right font-semibold">{formatMinor(c.totalSpentMinor)}</td>
                    <td className="text-xs">{c.lastOrderAt ? dateOnly.format(new Date(c.lastOrderAt)) : '—'}</td>
                    <td className="text-xs">{dateOnly.format(new Date(c.createdAt))}</td>
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
