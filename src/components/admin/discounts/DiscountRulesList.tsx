'use client';

// Panel > İndirimler: gelişmiş indirim kuralları — liste, oluştur/düzenle/sil.
// Kupon kodu GEREKTİRMEZ; checkout'ta uygun sepete otomatik uygulanır.

import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { EmptyState, TableSkeleton } from '@/components/admin/primitives';
import { SmallChip } from '@/components/admin/orders/status';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { useAdminData } from '@/components/admin/AdminDataProvider';
import {
  discountRulesApi,
  type AdminDiscountRule,
  type DiscountRuleListResult,
  type DiscountRuleType,
} from '@/lib/admin/discount-rules-client';
import { formatMinor, bpsToPercent } from '@/lib/money';
import { toast } from '@/store/toast';
import { DiscountRuleEditor } from './DiscountRuleEditor';

const TYPE_LABEL: Record<DiscountRuleType, string> = {
  'sepet-yuzde': 'Sepet Tutarı İndirimi',
  'x-al-y-ode': 'X Al Y Öde',
};

function conditionText(r: AdminDiscountRule): string {
  if (r.type === 'sepet-yuzde') {
    return `Minimum ${formatMinor(r.minCartTotalMinor ?? 0)} sepet tutarı`;
  }
  const min = r.minQuantity ?? r.buyQuantity ?? 0;
  return `Minimum ${min} ürün`;
}

function detailText(r: AdminDiscountRule): string {
  if (r.type === 'sepet-yuzde') return `%${bpsToPercent(r.percentBps)} İndirim`;
  return `${r.buyQuantity ?? 0} Al ${r.payQuantity ?? 0} Öde`;
}

export function DiscountRulesList() {
  const { can, categoryName } = useAdminData();
  const canWrite = can('kupon:yaz');
  const [data, setData] = useState<DiscountRuleListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [type, setType] = useState<'' | DiscountRuleType>('');
  const [active, setActive] = useState<'' | 'aktif' | 'pasif'>('');
  const [editing, setEditing] = useState<AdminDiscountRule | null | 'new'>(null);
  const [deleting, setDeleting] = useState<AdminDiscountRule | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(
        await discountRulesApi.list({
          q: q || undefined,
          type: type || undefined,
          active: active || undefined,
        }),
      );
    } catch (err) {
      toast.error('İndirim kuralları yüklenemedi', err instanceof Error ? err.message : undefined);
    } finally {
      setLoading(false);
    }
  }, [q, type, active]);

  useEffect(() => {
    void load();
  }, [load]);

  const remove = async () => {
    if (!deleting) return;
    try {
      await discountRulesApi.remove(deleting.id);
      toast.success('İndirim kuralı silindi');
      setDeleting(null);
      void load();
    } catch (err) {
      toast.error('Silinemedi', err instanceof Error ? err.message : undefined);
    }
  };

  const categoriesLabel = (ids: string[]) =>
    ids.length === 0 ? 'Tümü' : ids.map((id) => categoryName(id)).join(', ');

  return (
    <div className="flex flex-col gap-3">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold text-[var(--brand-purple-deep)]">İndirimler</h1>
          <p className="admin-hint mt-0.5">
            Kod gerektirmeyen otomatik kurallar: sepet tutarı yüzdesi, X Al Y Öde
          </p>
        </div>
        {canWrite && (
          <button type="button" className="admin-btn admin-btn-primary" onClick={() => setEditing('new')}>
            <Plus size={14} /> Yeni kural
          </button>
        )}
      </header>

      <form
        className="admin-card flex flex-wrap items-end gap-2"
        style={{ padding: 10 }}
        onSubmit={(e) => e.preventDefault()}
      >
        <label className="admin-field" style={{ minWidth: 200 }}>
          <span className="admin-label">Ara</span>
          <input
            className="admin-input"
            placeholder="Kural adı"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <label className="admin-field" style={{ minWidth: 180 }}>
          <span className="admin-label">Tür</span>
          <select
            className="admin-select"
            value={type}
            onChange={(e) => setType(e.target.value as typeof type)}
          >
            <option value="">Tümü</option>
            <option value="sepet-yuzde">Sepet Tutarı İndirimi</option>
            <option value="x-al-y-ode">X Al Y Öde</option>
          </select>
        </label>
        <label className="admin-field" style={{ minWidth: 140 }}>
          <span className="admin-label">Durum</span>
          <select
            className="admin-select"
            value={active}
            onChange={(e) => setActive(e.target.value as typeof active)}
          >
            <option value="">Tümü</option>
            <option value="aktif">Aktif</option>
            <option value="pasif">Pasif</option>
          </select>
        </label>
      </form>

      {loading && !data ? (
        <TableSkeleton rows={6} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="İndirim kuralı bulunamadı" hint="Yeni bir otomatik indirim kuralı oluşturun." />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Ad</th>
                <th>İndirim Tipi</th>
                <th>Kategoriler</th>
                <th>Koşul</th>
                <th>İndirim Detayı</th>
                <th>Öncelik</th>
                <th>Durum</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.items.map((r) => (
                <tr key={r.id}>
                  <td>
                    <button
                      type="button"
                      className="font-semibold text-[var(--brand-purple)]"
                      onClick={() => setEditing(r)}
                    >
                      {r.name}
                    </button>
                  </td>
                  <td>{TYPE_LABEL[r.type] ?? r.type}</td>
                  <td className="max-w-[240px] text-xs leading-snug">{categoriesLabel(r.includeCategoryIds)}</td>
                  <td className="text-xs">{conditionText(r)}</td>
                  <td className="text-xs">{detailText(r)}</td>
                  <td className="text-xs">{r.priority}</td>
                  <td>
                    <SmallChip tone={r.isActive ? 'ok' : 'neutral'}>
                      {r.isActive ? 'Aktif' : 'Pasif'}
                    </SmallChip>
                  </td>
                  <td>
                    {canWrite && (
                      <button
                        type="button"
                        className="admin-btn admin-btn-ghost admin-btn-sm"
                        onClick={() => setDeleting(r)}
                        aria-label={`${r.name} sil`}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <DiscountRuleEditor
          rule={editing === 'new' ? null : editing}
          open
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void load();
          }}
        />
      )}
      <ConfirmDialog
        open={Boolean(deleting)}
        title="İndirim kuralını sil?"
        description={deleting ? `"${deleting.name}" kalıcı olarak silinecek.` : ''}
        confirmLabel="Sil"
        destructive
        onConfirm={() => void remove()}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
