'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { Plus } from 'lucide-react';
import { useAdminData } from '@/components/admin/AdminDataProvider';
import { EmptyState, StatusBadge, TableSkeleton } from '@/components/admin/primitives';
import { outOfStockCount } from '@/lib/admin/variants';
import { formatRelative } from '@/lib/admin/format';

export default function AdminDashboardPage() {
  const { status, products, categoryName } = useAdminData();

  const stats = useMemo(() => {
    const byStatus = { yayında: 0, taslak: 0, arşiv: 0 };
    let oos = 0;
    let variantTotal = 0;
    for (const p of products) {
      byStatus[p.status] += 1;
      oos += outOfStockCount(p);
      variantTotal += p.variants.filter((v) => v.isActive).length;
    }
    return { total: products.length, byStatus, oos, variantTotal };
  }, [products]);

  const recent = useMemo(
    () =>
      [...products]
        .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
        .slice(0, 8),
    [products],
  );

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-[var(--brand-purple-deep)]">Özet</h1>
          <p className="admin-hint mt-0.5">Katalog durumuna hızlı bakış</p>
        </div>
        <Link href="/admin/urunler/yeni" className="admin-btn admin-btn-primary">
          <Plus size={15} aria-hidden="true" /> Yeni ürün
        </Link>
      </header>

      {status === 'loading' ? (
        <TableSkeleton rows={4} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="admin-card admin-stat">
              <span className="admin-stat-value">{stats.total}</span>
              <span className="admin-stat-label">Toplam ürün</span>
            </div>
            <div className="admin-card admin-stat">
              <span className="admin-stat-value">{stats.byStatus.yayında}</span>
              <span className="admin-stat-label">Yayında</span>
            </div>
            <div className="admin-card admin-stat">
              <span className="admin-stat-value">
                {stats.byStatus.taslak}
                <span className="text-base font-medium text-[var(--admin-ink-soft)]">
                  {' '}
                  / {stats.byStatus.arşiv}
                </span>
              </span>
              <span className="admin-stat-label">Taslak / Arşiv</span>
            </div>
            <div className="admin-card admin-stat">
              <span
                className="admin-stat-value"
                style={{ color: stats.oos > 0 ? '#b4232f' : undefined }}
              >
                {stats.oos}
              </span>
              <span className="admin-stat-label">Stokta olmayan varyant</span>
            </div>
          </div>

          <section className="admin-card" style={{ padding: 16 }}>
            <header className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--brand-purple-deep)]">
                Son düzenlenenler
              </h2>
              <Link
                href="/admin/urunler"
                className="text-xs font-semibold text-[var(--brand-purple)] hover:underline"
              >
                Tüm ürünler
              </Link>
            </header>

            {recent.length === 0 ? (
              <EmptyState title="Henüz ürün yok" hint="İlk ürünü ekleyerek başlayın." />
            ) : (
              <div className="admin-table-wrap" style={{ border: 0 }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Ürün</th>
                      <th>Kategori</th>
                      <th>Durum</th>
                      <th>Güncellendi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <Link
                            href={`/admin/urunler/${p.slug}`}
                            className="font-medium text-[var(--brand-purple-deep)] hover:underline"
                          >
                            {p.name}
                          </Link>
                          <span className="admin-hint block">{p.series || '—'}</span>
                        </td>
                        <td>{p.categoryIds.map(categoryName).join(', ') || '—'}</td>
                        <td>
                          <StatusBadge status={p.status} />
                        </td>
                        <td className="whitespace-nowrap text-[var(--admin-ink-soft)]">
                          {formatRelative(p.updatedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
