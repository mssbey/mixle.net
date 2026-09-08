'use client';

// Panel > Kuponlar: liste, oluştur/düzenle/sil.

import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { EmptyState, TableSkeleton } from '@/components/admin/primitives';
import { SmallChip, dateOnly } from '@/components/admin/orders/status';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { useAdminData } from '@/components/admin/AdminDataProvider';
import { couponsApi, type AdminCoupon, type CouponListResult } from '@/lib/admin/coupons-client';
import { formatMinor, bpsToPercent } from '@/lib/money';
import { toast } from '@/store/toast';
import { CouponEditor } from './CouponEditor';

const TYPE_LABEL: Record<string, string> = { yüzde: 'Yüzde', tutar: 'Tutar', 'ücretsiz-kargo': 'Ücretsiz kargo' };

function summarize(c: AdminCoupon): string {
  if (c.type === 'yüzde') return `%${bpsToPercent(c.value)}${c.maxDiscountMinor ? ` (en çok ${formatMinor(c.maxDiscountMinor)})` : ''}`;
  if (c.type === 'tutar') return formatMinor(c.value);
  return 'Ücretsiz kargo';
}

export function CouponsList() {
  const { can } = useAdminData();
  const canWrite = can('kupon:yaz');
  const [data, setData] = useState<CouponListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [active, setActive] = useState<'' | 'aktif' | 'pasif'>('');
  const [editing, setEditing] = useState<AdminCoupon | null | 'new'>(null);
  const [deleting, setDeleting] = useState<AdminCoupon | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await couponsApi.list({ q: q || undefined, active: active || undefined }));
    } catch (err) {
      toast.error('Kuponlar yüklenemedi', err instanceof Error ? err.message : undefined);
    } finally {
      setLoading(false);
    }
  }, [q, active]);

  useEffect(() => {
    void load();
  }, [load]);

  const remove = async () => {
    if (!deleting) return;
    try {
      await couponsApi.remove(deleting.id);
      toast.success('Kupon silindi');
      setDeleting(null);
      void load();
    } catch (err) {
      toast.error('Silinemedi', err instanceof Error ? err.message : undefined);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold text-[var(--brand-purple-deep)]">Kuponlar</h1>
          <p className="admin-hint mt-0.5">İndirim kodları: yüzde, sabit tutar, ücretsiz kargo</p>
        </div>
        {canWrite && <button type="button" className="admin-btn admin-btn-primary" onClick={() => setEditing('new')}><Plus size={14} /> Yeni kupon</button>}
      </header>

      <form className="admin-card flex flex-wrap items-end gap-2" style={{ padding: 10 }} onSubmit={(e) => e.preventDefault()}>
        <label className="admin-field" style={{ minWidth: 200 }}>
          <span className="admin-label">Ara</span>
          <input className="admin-input" placeholder="Kod" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <label className="admin-field" style={{ minWidth: 140 }}>
          <span className="admin-label">Durum</span>
          <select className="admin-select" value={active} onChange={(e) => setActive(e.target.value as typeof active)}>
            <option value="">Tümü</option>
            <option value="aktif">Aktif</option>
            <option value="pasif">Pasif</option>
          </select>
        </label>
      </form>

      {loading && !data ? (
        <TableSkeleton rows={6} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="Kupon bulunamadı" hint="Yeni bir indirim kodu oluşturun." />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Kod</th><th>Tür</th><th>Değer</th><th>Kullanım</th><th>Geçerlilik</th><th>Durum</th><th></th></tr></thead>
            <tbody>
              {data.items.map((c) => (
                <tr key={c.id}>
                  <td><button type="button" className="font-mono font-semibold text-[var(--brand-purple)]" onClick={() => setEditing(c)}>{c.code}</button></td>
                  <td>{TYPE_LABEL[c.type] ?? c.type}</td>
                  <td>{summarize(c)}</td>
                  <td>{c.usedCount}{c.usageLimit ? ` / ${c.usageLimit}` : ''}</td>
                  <td className="text-xs">{c.startsAt ? dateOnly.format(new Date(c.startsAt)) : '—'} – {c.endsAt ? dateOnly.format(new Date(c.endsAt)) : '—'}</td>
                  <td><SmallChip tone={c.isActive ? 'ok' : 'neutral'}>{c.isActive ? 'Aktif' : 'Pasif'}</SmallChip></td>
                  <td>{canWrite && <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => setDeleting(c)} aria-label={`${c.code} sil`}><Trash2 size={14} /></button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <CouponEditor
          coupon={editing === 'new' ? null : editing}
          open
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); void load(); }}
        />
      )}
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Kuponu sil?"
        description={deleting ? `"${deleting.code}" kalıcı olarak silinecek.` : ''}
        confirmLabel="Sil"
        destructive
        onConfirm={() => void remove()}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
