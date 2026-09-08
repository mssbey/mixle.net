'use client';

// Panel > Müşteriler > Detay: profil, adresler, siparişler, iadeler, not/etiket, KVKK anonimleştirme.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import { TableSkeleton } from '@/components/admin/primitives';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { OrderStatusChip, SmallChip } from '@/components/admin/orders/status';
import { returnStatusLabels, type ReturnStatus } from '@/server/returns/schema';
import { customersApi, type AdminCustomerDetail } from '@/lib/admin/customers-client';
import { formatMinor } from '@/lib/money';
import { toast } from '@/store/toast';
import { useAdminData } from '@/components/admin/AdminDataProvider';

const dateTime = new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' });

export function CustomerDetail({ id }: { id: string }) {
  const router = useRouter();
  const { can } = useAdminData();
  const canWrite = can('musteri:yaz');
  const [item, setItem] = useState<AdminCustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmAnon, setConfirmAnon] = useState(false);

  useEffect(() => {
    customersApi.get(id)
      .then((r) => { setItem(r.item); setNote(r.item.note); setTagsText(r.item.tags.join(', ')); })
      .catch((err) => toast.error('Müşteri yüklenemedi', err instanceof Error ? err.message : undefined))
      .finally(() => setLoading(false));
  }, [id]);

  const saveMeta = async () => {
    setBusy(true);
    try {
      const tags = tagsText.split(',').map((t) => t.trim()).filter(Boolean);
      const res = await customersApi.updateMeta(id, { note, tags });
      setItem(res.item);
      toast.success('Kaydedildi');
    } catch (err) {
      toast.error('Kaydedilemedi', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const anonymize = async () => {
    setConfirmAnon(false);
    setBusy(true);
    try {
      await customersApi.anonymize(id);
      toast.success('Müşteri anonimleştirildi', 'Kişisel bilgiler silindi; siparişler saklandı.');
      router.refresh();
      const res = await customersApi.get(id);
      setItem(res.item);
    } catch (err) {
      toast.error('Anonimleştirilemedi', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <TableSkeleton rows={6} />;
  if (!item) return <p className="admin-error">Müşteri bulunamadı.</p>;

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold text-[var(--brand-purple-deep)]">{item.name || item.email}</h1>
          <p className="admin-hint mt-0.5">{item.email}{item.phone && ` · ${item.phone}`}</p>
          {item.anonymizedAt && <SmallChip tone="neutral">KVKK: anonimleştirildi ({dateTime.format(new Date(item.anonymizedAt))})</SmallChip>}
        </div>
        <div className="flex gap-3 text-right">
          <div className="admin-stat" style={{ padding: 0 }}><span className="admin-stat-value">{item.orderCount}</span><span className="admin-stat-label">Sipariş</span></div>
          <div className="admin-stat" style={{ padding: 0 }}><span className="admin-stat-value">{formatMinor(item.totalSpentMinor)}</span><span className="admin-stat-label">Toplam harcama</span></div>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <section className="admin-card" style={{ padding: 16 }}>
            <h2 className="text-sm font-semibold text-[var(--brand-purple-deep)]">Son siparişler</h2>
            {item.orders.length === 0 && <p className="admin-hint mt-1">Henüz sipariş yok.</p>}
            <ul className="mt-2 flex flex-col gap-1.5">
              {item.orders.map((o) => (
                <li key={o.id} className="flex items-center justify-between rounded-lg border border-[var(--admin-border)] px-3 py-1.5 text-sm">
                  <Link href={`/admin/siparisler/${o.id}`} className="font-semibold text-[var(--brand-purple)]">{o.orderNumber}</Link>
                  <span className="text-xs text-[var(--admin-ink-soft)]">{dateTime.format(new Date(o.placedAt))}</span>
                  <OrderStatusChip status={o.status} />
                  <span className="font-semibold">{formatMinor(o.grandTotalMinor)}</span>
                </li>
              ))}
            </ul>
          </section>

          {item.returns.length > 0 && (
            <section className="admin-card" style={{ padding: 16 }}>
              <h2 className="text-sm font-semibold text-[var(--brand-purple-deep)]">İade talepleri</h2>
              <ul className="mt-2 flex flex-col gap-1.5">
                {item.returns.map((r) => (
                  <li key={r.id} className="flex items-center justify-between rounded-lg border border-[var(--admin-border)] px-3 py-1.5 text-sm">
                    <span className="text-xs text-[var(--admin-ink-soft)]">{dateTime.format(new Date(r.requestedAt))}</span>
                    <SmallChip tone="neutral">{returnStatusLabels[r.status as ReturnStatus] ?? r.status}</SmallChip>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="admin-card" style={{ padding: 16 }}>
            <h2 className="text-sm font-semibold text-[var(--brand-purple-deep)]">Adres defteri</h2>
            {item.addresses.length === 0 && <p className="admin-hint mt-1">Kayıtlı adres yok.</p>}
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {item.addresses.map((a) => (
                <div key={a.id} className="rounded-lg border border-[var(--admin-border)] p-2.5 text-sm">
                  <p className="font-semibold">{a.title || (a.type === 'fatura' ? 'Fatura adresi' : 'Teslimat adresi')}{a.isDefault && <span className="ml-1 text-xs text-[var(--brand-purple)]">(varsayılan)</span>}</p>
                  <p>{a.firstName} {a.lastName}</p>
                  <p className="text-xs text-[var(--admin-ink-soft)]">{a.addressLine}, {a.district} / {a.city}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-4">
          <section className="admin-card" style={{ padding: 16 }}>
            <h2 className="text-sm font-semibold text-[var(--brand-purple-deep)]">Not ve etiketler</h2>
            <label className="admin-field mt-2">
              <span className="admin-label">Panel notu</span>
              <textarea className="admin-input" rows={4} disabled={!canWrite} value={note} onChange={(e) => setNote(e.target.value)} />
            </label>
            <label className="admin-field mt-2">
              <span className="admin-label">Etiketler (virgülle)</span>
              <input className="admin-input" disabled={!canWrite} value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="toptan, VIP" />
            </label>
            {canWrite && <button type="button" className="admin-btn admin-btn-primary admin-btn-sm mt-2" disabled={busy} onClick={() => void saveMeta()}>Kaydet</button>}
          </section>

          {canWrite && !item.anonymizedAt && (
            <section className="admin-card" style={{ padding: 16, borderColor: '#f4b9b2' }}>
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-[#b42318]"><ShieldAlert size={16} /> KVKK — Kişisel verileri sil</h2>
              <p className="admin-hint mt-1">
                Ad, e-posta, telefon ve adres defteri kalıcı olarak anonimleştirilir; oturumlar kapatılır.
                Geçmiş sipariş kayıtları yasal saklama süresi nedeniyle korunur. Bu işlem geri alınamaz.
              </p>
              <button type="button" className="admin-btn admin-btn-danger admin-btn-sm mt-2" disabled={busy} onClick={() => setConfirmAnon(true)}>Müşteriyi anonimleştir</button>
            </section>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmAnon}
        title="Müşteriyi anonimleştir?"
        description="Bu işlem geri alınamaz. Müşteri artık giriş yapamaz; ad, e-posta, telefon ve adresleri silinir. Sipariş kayıtları saklanır."
        confirmLabel="Anonimleştir"
        destructive
        onConfirm={() => void anonymize()}
        onCancel={() => setConfirmAnon(false)}
      />
    </div>
  );
}
