'use client';

// Sipariş detayı diyalogları: durum değiştir, ödeme al, kargo oluştur,
// sevkiyat güncelle, e-posta yeniden gönder, not ekle.

import { useState } from 'react';
import type { AdminOrderView } from '@/server/orders/admin-view';
import { orderStatusLabels, type OrderStatus } from '@/server/orders/state-machine';
import { CARRIERS, SHIPMENT_STATUSES, carrierLabels, type Carrier, type ShipmentStatus } from '@/server/shipping/carriers';
import { ordersApi } from '@/lib/admin/orders-client';
import { ApiError } from '@/lib/admin/client';
import { formatMinor, minorToInput, parseMajorInput } from '@/lib/money';
import { toast } from '@/store/toast';
import { Field } from '@/components/admin/primitives';
import { Dialog } from './Dialog';

interface Base {
  order: AdminOrderView;
  open: boolean;
  onClose: () => void;
  onUpdated: (o: AdminOrderView) => void;
}

function useAction(onUpdated: (o: AdminOrderView) => void, onClose: () => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (fn: () => Promise<{ order: AdminOrderView }>, ok: string) => {
    setBusy(true);
    setError(null);
    try {
      const r = await fn();
      onUpdated(r.order);
      toast.success(ok);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'İşlem başarısız');
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, run };
}

// ------------------------------------------------------------- durum -------

export function StatusDialog({ order, open, onClose, onUpdated }: Base) {
  const [to, setTo] = useState<OrderStatus | ''>('');
  const [note, setNote] = useState('');
  const [visible, setVisible] = useState(false);
  const { busy, error, run } = useAction(onUpdated, onClose);
  const irreversible = to === 'iptal' || to === 'iade-edildi';

  return (
    <Dialog open={open} onClose={onClose} title="Durum değiştir" description={`Şu an: ${order.statusLabel}. Yalnız izinli geçişler listelenir.`}
      footer={<>
        <button type="button" className="admin-btn admin-btn-ghost" onClick={onClose} disabled={busy}>Vazgeç</button>
        <button type="button" className={`admin-btn ${irreversible ? 'admin-btn-danger' : 'admin-btn-primary'}`} disabled={busy || !to}
          onClick={() => to && run(() => ordersApi.transition(order.id, to, note, visible), 'Durum güncellendi')}>
          {busy ? 'Uygulanıyor…' : irreversible ? 'Evet, uygula' : 'Uygula'}
        </button>
      </>}>
      <Field label="Yeni durum" htmlFor="st-to" required>
        <select id="st-to" className="admin-select" value={to} onChange={(e) => setTo(e.target.value as OrderStatus)}>
          <option value="">Seçin</option>
          {order.allowedTransitions.map((s) => <option key={s} value={s}>{orderStatusLabels[s]}</option>)}
        </select>
      </Field>
      {irreversible && <p className="admin-error mt-2">Bu işlem geri alınamaz. Stok geri verilir, kupon kullanımı iptal edilir, müşteriye e-posta gider.</p>}
      <Field label="Not" htmlFor="st-note" hint="Zaman çizelgesine yazılır." className="mt-3">
        <textarea id="st-note" className="admin-textarea" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} /> Not müşteriye görünsün</label>
      {error && <p className="admin-error mt-2" role="alert">{error}</p>}
    </Dialog>
  );
}

// ------------------------------------------------------------- ödeme -------

export function PaymentDialog({ order, open, onClose, onUpdated }: Base) {
  const paid = order.payments.filter((p) => p.status === 'başarılı').reduce((s, p) => s + p.amountMinor, 0);
  const remaining = Math.max(0, order.totals.grandTotalMinor - paid);
  const [amount, setAmount] = useState(minorToInput(remaining));
  const [method, setMethod] = useState('havale');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const { busy, error, run } = useAction(onUpdated, onClose);
  const minor = parseMajorInput(amount);

  return (
    <Dialog open={open} onClose={onClose} title="Ödeme al" description={`Kalan: ${formatMinor(remaining)}. Havale eşleştirme, kapıda tahsilat veya manuel kayıt.`}
      footer={<>
        <button type="button" className="admin-btn admin-btn-ghost" onClick={onClose} disabled={busy}>Vazgeç</button>
        <button type="button" className="admin-btn admin-btn-primary" disabled={busy || !minor}
          onClick={() => minor && run(() => ordersApi.recordPayment(order.id, { amountMinor: minor, method, reference, note }), 'Ödeme kaydedildi')}>
          {busy ? 'Kaydediliyor…' : 'Ödemeyi kaydet'}
        </button>
      </>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Tutar (₺)" htmlFor="pay-amount" required error={amount && !minor ? 'Geçerli tutar girin' : undefined}>
          <input id="pay-amount" className="admin-input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="Yöntem" htmlFor="pay-method" required>
          <select id="pay-method" className="admin-select" value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="havale">Havale / EFT</option>
            <option value="kapida">Kapıda ödeme (tahsil edildi)</option>
            <option value="nakit">Nakit</option>
            <option value="pos">POS</option>
            <option value="diger">Diğer</option>
          </select>
        </Field>
        <Field label="Referans / dekont no" htmlFor="pay-ref" className="sm:col-span-2">
          <input id="pay-ref" className="admin-input" value={reference} onChange={(e) => setReference(e.target.value)} />
        </Field>
        <Field label="Not" htmlFor="pay-note" className="sm:col-span-2">
          <input id="pay-note" className="admin-input" value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>
      {error && <p className="admin-error mt-2" role="alert">{error}</p>}
    </Dialog>
  );
}

// ------------------------------------------------------------- kargo -------

export function ShipmentDialog({ order, open, onClose, onUpdated }: Base) {
  const remainingOf = (i: AdminOrderView['items'][number]) => i.quantity - i.refundedQuantity - i.shippedQuantity;
  const [carrier, setCarrier] = useState<Carrier>('yurtici');
  const [tracking, setTracking] = useState('');
  const [qty, setQty] = useState<Record<string, number>>(() => Object.fromEntries(order.items.map((i) => [i.id, remainingOf(i)])));
  const [markShipped, setMarkShipped] = useState(true);
  const [note, setNote] = useState('');
  const { busy, error, run } = useAction(onUpdated, onClose);
  const items = order.items.filter((i) => remainingOf(i) > 0);
  const chosen = items.map((i) => ({ orderItemId: i.id, quantity: Math.min(qty[i.id] ?? 0, remainingOf(i)) })).filter((x) => x.quantity > 0);

  return (
    <Dialog open={open} onClose={onClose} title="Kargo oluştur" description="Kısmi sevkiyat için adetleri düşürün. Takip numarası girilirse müşteriye e-posta gider." wide
      footer={<>
        <button type="button" className="admin-btn admin-btn-ghost" onClick={onClose} disabled={busy}>Vazgeç</button>
        <button type="button" className="admin-btn admin-btn-primary" disabled={busy || chosen.length === 0}
          onClick={() => run(() => ordersApi.createShipment(order.id, { carrier, trackingNumber: tracking, items: chosen, note, markShipped }), 'Sevkiyat oluşturuldu')}>
          {busy ? 'Oluşturuluyor…' : 'Kargoyu oluştur'}
        </button>
      </>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Kargo firması" htmlFor="sh-carrier" required>
          <select id="sh-carrier" className="admin-select" value={carrier} onChange={(e) => setCarrier(e.target.value as Carrier)}>
            {CARRIERS.map((c) => <option key={c} value={c}>{carrierLabels[c]}</option>)}
          </select>
        </Field>
        <Field label="Takip numarası" htmlFor="sh-track" hint="Firma API'si yoksa elle girin (F4'te otomatik).">
          <input id="sh-track" className="admin-input" value={tracking} onChange={(e) => setTracking(e.target.value)} />
        </Field>
      </div>
      <div className="admin-table-wrap mt-3">
        <table className="admin-table">
          <thead><tr><th>Ürün</th><th className="text-right">Kalan</th><th className="text-right" style={{ width: 90 }}>Sevk</th></tr></thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id}>
                <td>{i.name}{i.variantLabel && <span className="text-xs text-[var(--admin-ink-soft)]"> · {i.variantLabel}</span>}</td>
                <td className="text-right">{remainingOf(i)}</td>
                <td className="text-right">
                  <input type="number" min={0} max={remainingOf(i)} className="admin-input admin-btn-sm" style={{ width: 70 }} aria-label={`${i.name} sevk adedi`}
                    value={qty[i.id] ?? 0} onChange={(e) => setQty({ ...qty, [i.id]: Math.max(0, Math.min(remainingOf(i), Number(e.target.value) || 0)) })} />
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={3} className="text-center text-[var(--admin-ink-soft)]">Sevk edilecek kalem kalmadı.</td></tr>}
          </tbody>
        </table>
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={markShipped} onChange={(e) => setMarkShipped(e.target.checked)} /> Hemen “kargoya verildi” olarak işaretle ve müşteriye bildir</label>
      <Field label="Not" htmlFor="sh-note" className="mt-3"><input id="sh-note" className="admin-input" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      {error && <p className="admin-error mt-2" role="alert">{error}</p>}
    </Dialog>
  );
}

export function ShipmentUpdateDialog({ order, shipmentId, open, onClose, onUpdated }: Base & { shipmentId: string }) {
  const s = order.shipments.find((x) => x.id === shipmentId);
  const [status, setStatus] = useState<ShipmentStatus>((s?.status as ShipmentStatus) ?? 'kargoya-verildi');
  const [tracking, setTracking] = useState(s?.trackingNumber ?? '');
  const [note, setNote] = useState('');
  const { busy, error, run } = useAction(onUpdated, onClose);
  if (!s) return null;

  return (
    <Dialog open={open} onClose={onClose} title="Sevkiyatı güncelle" description={`${carrierLabels[s.carrier as Carrier] ?? s.carrier} · Teslim edildi seçilirse tüm sevkiyatlar teslimse sipariş otomatik tamamlanır.`}
      footer={<>
        <button type="button" className="admin-btn admin-btn-ghost" onClick={onClose} disabled={busy}>Vazgeç</button>
        <button type="button" className="admin-btn admin-btn-primary" disabled={busy}
          onClick={() => run(() => ordersApi.updateShipment(order.id, shipmentId, { status, trackingNumber: tracking, note }), 'Sevkiyat güncellendi')}>
          {busy ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Durum" htmlFor="shu-status">
          <select id="shu-status" className="admin-select" value={status} onChange={(e) => setStatus(e.target.value as ShipmentStatus)}>
            {SHIPMENT_STATUSES.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </Field>
        <Field label="Takip numarası" htmlFor="shu-track"><input id="shu-track" className="admin-input" value={tracking} onChange={(e) => setTracking(e.target.value)} /></Field>
        <Field label="Not" htmlFor="shu-note" className="sm:col-span-2"><input id="shu-note" className="admin-input" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      </div>
      {error && <p className="admin-error mt-2" role="alert">{error}</p>}
    </Dialog>
  );
}

// ------------------------------------------------------------- not ---------

export function NoteDialog({ order, open, onClose, onUpdated }: Base) {
  const [text, setText] = useState('');
  const [visible, setVisible] = useState(false);
  const { busy, error, run } = useAction(onUpdated, onClose);
  return (
    <Dialog open={open} onClose={onClose} title="Not ekle"
      footer={<>
        <button type="button" className="admin-btn admin-btn-ghost" onClick={onClose} disabled={busy}>Vazgeç</button>
        <button type="button" className="admin-btn admin-btn-primary" disabled={busy || text.trim().length < 1}
          onClick={() => run(() => ordersApi.updateMeta(order.id, visible ? { customerVisibleNote: text.trim() } : { adminNote: [order.adminNote, text.trim()].filter(Boolean).join('\n') }), 'Not eklendi')}>
          {busy ? 'Ekleniyor…' : 'Ekle'}
        </button>
      </>}>
      <Field label="Not" htmlFor="note-text" required>
        <textarea id="note-text" className="admin-textarea" rows={3} value={text} onChange={(e) => setText(e.target.value)} />
      </Field>
      <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} /> Müşteriye görünsün (zaman çizelgesine yazılır; görünmezse admin notuna eklenir)</label>
      {error && <p className="admin-error mt-2" role="alert">{error}</p>}
    </Dialog>
  );
}

// ------------------------------------------------------------- e-posta -----

export function ResendEmailDialog({ order, open, onClose, onUpdated }: Base) {
  const [template, setTemplate] = useState('siparis-alindi');
  const { busy, error, run } = useAction(onUpdated, onClose);
  return (
    <Dialog open={open} onClose={onClose} title="E-posta yeniden gönder" description={`Alıcı: ${order.customer.email}`}
      footer={<>
        <button type="button" className="admin-btn admin-btn-ghost" onClick={onClose} disabled={busy}>Vazgeç</button>
        <button type="button" className="admin-btn admin-btn-primary" disabled={busy}
          onClick={() => run(() => ordersApi.resendEmail(order.id, template), 'E-posta kuyruğa alındı')}>{busy ? 'Gönderiliyor…' : 'Gönder'}</button>
      </>}>
      <Field label="Şablon" htmlFor="mail-tpl">
        <select id="mail-tpl" className="admin-select" value={template} onChange={(e) => setTemplate(e.target.value)}>
          <option value="siparis-alindi">Sipariş alındı</option>
          <option value="odeme-basarili">Ödeme başarılı</option>
          <option value="kargoya-verildi">Kargoya verildi</option>
          <option value="teslim-edildi">Teslim edildi</option>
          <option value="iptal">İptal</option>
        </select>
      </Field>
      {error && <p className="admin-error mt-2" role="alert">{error}</p>}
    </Dialog>
  );
}
