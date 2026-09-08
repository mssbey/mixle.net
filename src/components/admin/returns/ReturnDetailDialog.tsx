'use client';

// İade talebi detayı ve aksiyonları: onayla / reddet / ürün alındı / tamamla (iade işler).

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Dialog } from '@/components/admin/orders/Dialog';
import { Field } from '@/components/admin/primitives';
import { SmallChip, dateTime } from '@/components/admin/orders/status';
import { returnsApi, type AdminReturnDetail } from '@/lib/admin/returns-client';
import { ApiError } from '@/lib/admin/client';
import { toast } from '@/store/toast';
import { returnStatusLabels, type ReturnStatus } from '@/server/returns/schema';

function tone(status: string): 'ok' | 'warn' | 'bad' | 'neutral' {
  if (status === 'tamamlandı') return 'ok';
  if (status === 'reddedildi') return 'bad';
  if (status === 'talep') return 'warn';
  return 'neutral';
}

export function ReturnDetailDialog({ id, open, onClose, onChanged }: { id: string; open: boolean; onClose: () => void; onChanged: () => void }) {
  const [item, setItem] = useState<AdminReturnDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [approveNote, setApproveNote] = useState('Ürünü orijinal ambalajıyla aşağıdaki adrese gönderin: …');
  const [returnCode, setReturnCode] = useState('');
  const [rejectNote, setRejectNote] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [restock, setRestock] = useState(true);
  const [includeShipping, setIncludeShipping] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    returnsApi.get(id).then((r) => setItem(r.item)).catch((err) => setError(err instanceof Error ? err.message : 'Yüklenemedi')).finally(() => setLoading(false));
  }, [id, open]);

  const run = async (fn: () => Promise<{ item: AdminReturnDetail }>, ok: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fn();
      setItem(res.item);
      toast.success(ok);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? (Object.values(err.issues)[0] ?? err.message) : err instanceof Error ? err.message : 'İşlem başarısız');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title={item ? `İade talebi — ${item.orderNumber}` : 'İade talebi'} wide
      description={item ? `${item.customerName} · ${dateTime.format(new Date(item.requestedAt))}` : undefined}
      footer={<button type="button" className="admin-btn admin-btn-ghost" onClick={onClose}>Kapat</button>}>
      {loading && <p className="admin-hint">Yükleniyor…</p>}
      {!loading && !item && <p className="admin-error">İade talebi bulunamadı.</p>}
      {item && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <SmallChip tone={tone(item.status)}>{returnStatusLabels[item.status as ReturnStatus] ?? item.status}</SmallChip>
            <Link href={`/admin/siparisler/${item.orderId}`} className="text-sm font-semibold text-[var(--brand-purple)]">Siparişi aç →</Link>
          </div>

          <section>
            <h3 className="text-sm font-semibold text-[var(--brand-purple-deep)]">Talep edilen ürünler</h3>
            <ul className="mt-1.5 flex flex-col gap-1 text-sm">
              {item.items.map((i) => (
                <li key={i.orderItemId} className="flex justify-between rounded-lg border border-[var(--admin-border)] px-3 py-1.5">
                  <span>{i.name}{i.sku && <span className="text-xs text-[var(--admin-ink-soft)]"> · {i.sku}</span>}</span>
                  <span className="font-semibold">× {i.quantity}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="grid gap-2 sm:grid-cols-2">
            <div><span className="admin-label">Sebep</span><p className="text-sm">{item.reasonLabel}</p></div>
            {item.description && <div><span className="admin-label">Açıklama</span><p className="text-sm">{item.description}</p></div>}
            {item.resolutionNote && <div className="sm:col-span-2"><span className="admin-label">Not</span><p className="text-sm">{item.resolutionNote}</p></div>}
            {item.returnCode && <div><span className="admin-label">Kargo kodu</span><p className="text-sm">{item.returnCode}</p></div>}
          </section>

          {error && <p className="admin-error" role="alert">{error}</p>}

          {item.status === 'talep' && !showReject && (
            <section className="rounded-xl border border-[var(--admin-border)] p-3">
              <h3 className="text-sm font-semibold text-[var(--brand-purple-deep)]">Talebi onayla</h3>
              <Field label="Müşteriye iletilecek talimat" htmlFor="ret-approve-note" className="mt-2">
                <textarea id="ret-approve-note" className="admin-input" rows={3} value={approveNote} onChange={(e) => setApproveNote(e.target.value)} />
              </Field>
              <Field label="Kargo/iade kodu (opsiyonel)" htmlFor="ret-code" className="mt-2">
                <input id="ret-code" className="admin-input" value={returnCode} onChange={(e) => setReturnCode(e.target.value)} />
              </Field>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className="admin-btn admin-btn-primary" disabled={busy} onClick={() => void run(() => returnsApi.approve(id, approveNote, returnCode), 'Talep onaylandı')}>Onayla</button>
                <button type="button" className="admin-btn admin-btn-danger" disabled={busy} onClick={() => setShowReject(true)}>Reddet</button>
              </div>
            </section>
          )}

          {(item.status === 'talep' || item.status === 'onaylandı') && showReject && (
            <section className="rounded-xl border border-[#f4b9b2] bg-[#fdecec] p-3">
              <h3 className="text-sm font-semibold text-[#b42318]">Talebi reddet</h3>
              <Field label="Gerekçe (müşteriye gönderilir)" htmlFor="ret-reject-note" required className="mt-2">
                <textarea id="ret-reject-note" className="admin-input" rows={3} value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} />
              </Field>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className="admin-btn admin-btn-danger" disabled={busy || rejectNote.trim().length < 2} onClick={() => void run(() => returnsApi.reject(id, rejectNote), 'Talep reddedildi')}>Reddi onayla</button>
                <button type="button" className="admin-btn admin-btn-ghost" disabled={busy} onClick={() => setShowReject(false)}>Vazgeç</button>
              </div>
            </section>
          )}

          {item.status === 'onaylandı' && !showReject && (
            <section className="rounded-xl border border-[var(--admin-border)] p-3">
              <p className="admin-hint">Müşteri kargoyu gönderdi ve ürün elinize ulaştı mı?</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" className="admin-btn admin-btn-primary" disabled={busy} onClick={() => void run(() => returnsApi.markReceived(id), 'Ürün alındı olarak işaretlendi')}>Ürün alındı</button>
                <button type="button" className="admin-btn admin-btn-danger" disabled={busy} onClick={() => setShowReject(true)}>Reddet</button>
              </div>
            </section>
          )}

          {item.status === 'ürün-alındı' && (
            <section className="rounded-xl border border-[var(--admin-border)] p-3">
              <h3 className="text-sm font-semibold text-[var(--brand-purple-deep)]">İadeyi tamamla</h3>
              <p className="admin-hint mt-1">Talep edilen kalemler için ödeme sağlayıcısında/panelden iade işlenir, stok geri eklenir.</p>
              <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={restock} onChange={(e) => setRestock(e.target.checked)} /> Stoka geri ekle</label>
              <label className="mt-1 flex items-center gap-2 text-sm"><input type="checkbox" checked={includeShipping} onChange={(e) => setIncludeShipping(e.target.checked)} /> Kargo ücretini de iade et</label>
              <div className="mt-3">
                <button type="button" className="admin-btn admin-btn-primary" disabled={busy} onClick={() => void run(() => returnsApi.complete(id, { restock, includeShipping }), 'İade tamamlandı')}>İadeyi tamamla ve ödemeyi iade et</button>
              </div>
            </section>
          )}
        </div>
      )}
    </Dialog>
  );
}
