'use client';

// Sipariş detayı — WooCommerce düzeni.
// Üst: no, tarih, durum, hızlı aksiyonlar. Sol: kalemler + toplamlar.
// Sağ: müşteri kartı, adresler, ödeme, kargo. Alt: zaman çizelgesi + notlar.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft, RefreshCw, CreditCard, Truck, RotateCcw, XCircle, Pencil, Mail, Printer, Copy, StickyNote, ExternalLink,
} from 'lucide-react';
import type { AdminOrderView } from '@/server/orders/admin-view';
import { ordersApi } from '@/lib/admin/orders-client';
import { ApiError } from '@/lib/admin/client';
import { useAdminData } from '@/components/admin/AdminDataProvider';
import { formatMinor, bpsToPercent } from '@/lib/money';
import { formatPhoneTR } from '@/lib/validators/phone';
import { carrierLabels, type Carrier } from '@/server/shipping/carriers';
import { toast } from '@/store/toast';
import { TableSkeleton } from '@/components/admin/primitives';
import { OrderStatusChip, SmallChip, dateTime, fulfillmentLabels } from './status';
import { PaymentStatusMenu } from './PaymentStatusMenu';
import { StatusDialog, PaymentDialog, ShipmentDialog, ShipmentUpdateDialog, NoteDialog, ResendEmailDialog } from './ActionDialogs';
import { RefundDialog } from './RefundDialog';
import { ItemsEditorDialog } from './ItemsEditorDialog';
import { AddressDialog } from './AddressDialog';
import { cn } from '@/lib/utils';

type DialogKind = 'status' | 'payment' | 'shipment' | 'refund' | 'items' | 'note' | 'email' | 'ship-addr' | 'bill-addr' | null;

export function OrderDetail({ id }: { id: string }) {
  const { can } = useAdminData();
  const canWrite = can('siparis:yaz');
  const canRefund = can('siparis:iade');
  const canShip = can('kargo:yaz');

  const [order, setOrder] = useState<AdminOrderView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [shipmentEdit, setShipmentEdit] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [noteBusy, setNoteBusy] = useState(false);

  useEffect(() => {
    ordersApi
      .get(id)
      .then((r) => { setOrder(r.order); setAdminNote(r.order.adminNote ?? ''); })
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : 'Sipariş yüklenemedi'));
  }, [id]);

  if (error) return <div className="admin-card" style={{ padding: 24 }}><p className="admin-error">{error}</p><Link href="/admin/siparisler" className="admin-btn admin-btn-ghost mt-3">Listeye dön</Link></div>;
  if (!order) return <TableSkeleton rows={8} />;

  const o = order;
  const editable = ['ödeme-bekliyor', 'ödendi', 'hazırlanıyor'].includes(o.status);
  const cancellable = o.allowedTransitions.includes('iptal');
  const canPay = o.paymentStatus !== 'ödendi' && !['iptal', 'iade-edildi', 'başarısız'].includes(o.status);
  const canCreateShipment = ['ödendi', 'hazırlanıyor', 'kargolandı'].includes(o.status) && o.items.some((i) => i.quantity - i.refundedQuantity - i.shippedQuantity > 0);
  const refundable = o.refundableMinor > 0 && !['ödeme-bekliyor', 'başarısız', 'iptal', 'iade-edildi'].includes(o.status);
  const sameAddress = JSON.stringify(o.shippingAddress) === JSON.stringify(o.billingAddress);

  const saveAdminNote = async () => {
    setNoteBusy(true);
    try {
      const r = await ordersApi.updateMeta(o.id, { adminNote });
      setOrder(r.order);
      toast.success('Admin notu kaydedildi');
    } catch (err) {
      toast.error('Kaydedilemedi', err instanceof ApiError ? err.message : undefined);
    } finally {
      setNoteBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Link href="/admin/siparisler" className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand-purple)] hover:underline"><ArrowLeft size={14} /> Siparişler</Link>

      {/* Üst */}
      <header className="admin-card flex flex-wrap items-start justify-between gap-3" style={{ padding: 16 }}>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-semibold text-[var(--brand-purple-deep)]">{o.orderNumber}</h1>
            <OrderStatusChip status={o.status} />
            <PaymentStatusMenu
              orderId={o.id}
              orderNumber={o.orderNumber}
              paymentStatus={o.paymentStatus}
              orderStatus={o.status}
              canWrite={canWrite}
              onChanged={() => void ordersApi.get(o.id).then((r) => setOrder(r.order))}
            />
            <SmallChip>{fulfillmentLabels[o.fulfillmentStatus] ?? o.fulfillmentStatus}</SmallChip>
          </div>
          <p className="admin-hint mt-1">{dateTime.format(new Date(o.placedAt))} · kaynak: {o.source} · {o.paymentMethodLabel}{o.ipAddress ? ` · IP ${o.ipAddress}` : ''}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {canWrite && <Action icon={RefreshCw} label="Durum" onClick={() => setDialog('status')} disabled={o.allowedTransitions.length === 0} />}
          {canWrite && canPay && <Action icon={CreditCard} label="Ödeme al" onClick={() => setDialog('payment')} />}
          {canShip && canCreateShipment && <Action icon={Truck} label="Kargo oluştur" onClick={() => setDialog('shipment')} />}
          {canRefund && refundable && <Action icon={RotateCcw} label="İade" onClick={() => setDialog('refund')} />}
          {canWrite && <Action icon={Mail} label="E-posta" onClick={() => setDialog('email')} />}
          <Action icon={Printer} label="Bilgi fişi" href={`/admin/siparisler/${o.id}/yazdir?tip=fatura`} />
          <Action icon={Printer} label="İrsaliye" href={`/admin/siparisler/${o.id}/yazdir?tip=irsaliye`} />
          {canWrite && <Action icon={Copy} label="Kopyala" href={`/admin/siparisler/yeni?kopya=${o.id}`} title="Aynı kalemlerle yeni sipariş" />}
          {canWrite && cancellable && <Action icon={XCircle} label="İptal" danger onClick={() => setDialog('status')} />}
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        {/* SOL */}
        <div className="flex flex-col gap-4">
          <section className="admin-card" style={{ padding: 0 }} aria-labelledby="od-items">
            <header className="flex items-center justify-between border-b border-[var(--admin-border)] px-4 py-3">
              <h2 id="od-items" className="text-sm font-semibold text-[var(--brand-purple-deep)]">Kalemler</h2>
              {canWrite && editable && <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => setDialog('items')}><Pencil size={14} /> Düzenle / yeniden hesapla</button>}
            </header>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr><th>Ürün</th><th className="text-right">Birim</th><th className="text-right">Adet</th><th className="text-right">İndirim</th><th className="text-right">KDV</th><th className="text-right">Satır</th></tr></thead>
                <tbody>
                  {o.items.map((i) => (
                    <tr key={i.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded bg-[#f1ece4]">{i.imageUrl && <Image src={i.imageUrl} alt="" fill sizes="36px" className="object-cover" />}</span>
                          <div>
                            <div className="text-sm">{i.productId ? <Link href={`/admin/urunler/${i.productId}`} className="hover:underline">{i.name}</Link> : i.name}</div>
                            <div className="text-[11px] text-[var(--admin-ink-soft)]">{i.variantLabel}{i.sku ? ` · ${i.sku}` : ''}{i.refundedQuantity > 0 ? ` · ${i.refundedQuantity} iade` : ''}{i.shippedQuantity > 0 ? ` · ${i.shippedQuantity} sevk` : ''}</div>
                          </div>
                        </div>
                      </td>
                      <td className="text-right">{formatMinor(i.unitPriceMinor)}</td>
                      <td className="text-right">{i.quantity}</td>
                      <td className="text-right">{i.discountMinor ? `−${formatMinor(i.discountMinor)}` : '—'}</td>
                      <td className="text-right text-xs">%{bpsToPercent(i.taxRateBps)} · {formatMinor(i.taxMinor)}</td>
                      <td className="text-right font-semibold">{formatMinor(i.lineTotalMinor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <dl className="grid gap-1 border-t border-[var(--admin-border)] px-4 py-3 text-sm sm:ml-auto sm:w-80">
              <Row k="Ara toplam" v={formatMinor(o.totals.itemsSubtotalMinor)} />
              {o.totals.discountTotalMinor > 0 && <Row k={`İndirim${o.couponCode ? ` (${o.couponCode})` : ''}`} v={`−${formatMinor(o.totals.discountTotalMinor)}`} tone="ok" />}
              <Row k={`Kargo${o.shippingMethod ? ` · ${o.shippingMethod.name}` : ''}`} v={o.totals.shippingTotalMinor === 0 ? 'Ücretsiz' : formatMinor(o.totals.shippingTotalMinor)} />
              {o.totals.surchargeMinor > 0 && <Row k="Kapıda ödeme bedeli" v={formatMinor(o.totals.surchargeMinor)} />}
              {o.totals.taxBreakdown.map((t) => <Row key={t.rateBps} k={`KDV %${bpsToPercent(t.rateBps)} (dahil) · matrah ${formatMinor(t.netMinor)}`} v={formatMinor(t.taxMinor)} muted />)}
              <div className="flex justify-between border-t border-[var(--admin-border)] pt-2 text-base font-bold text-[var(--brand-purple-deep)]"><dt>Toplam</dt><dd>{formatMinor(o.totals.grandTotalMinor)}</dd></div>
              {o.totals.refundedTotalMinor > 0 && <Row k="İade edilen" v={`−${formatMinor(o.totals.refundedTotalMinor)}`} tone="bad" />}
            </dl>
          </section>

          {/* Zaman çizelgesi */}
          <section className="admin-card" style={{ padding: 16 }} aria-labelledby="od-timeline">
            <header className="flex items-center justify-between">
              <h2 id="od-timeline" className="text-sm font-semibold text-[var(--brand-purple-deep)]">Zaman çizelgesi</h2>
              {canWrite && <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => setDialog('note')}><StickyNote size={14} /> Not ekle</button>}
            </header>
            <ol className="mt-3 space-y-2.5 border-l border-[var(--admin-border)] pl-4 text-sm">
              {o.timeline.map((t, i) => (
                <li key={i} className="relative">
                  <span className={cn('absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full', { durum: 'bg-[var(--brand-purple)]', odeme: 'bg-[#0f6b3d]', iade: 'bg-[#b42318]', kargo: 'bg-[#0b5394]', eposta: 'bg-[#8a5a00]', not: 'bg-[#c88d19]', sistem: 'bg-[#999]' }[t.kind])} aria-hidden />
                  <p><span className="font-semibold">{t.title}</span>{t.detail && <span className="text-[var(--admin-ink-soft)]"> — {t.detail}</span>}</p>
                  <p className="text-[11px] text-[var(--admin-ink-soft)]">{dateTime.format(new Date(t.at))} · {t.actor}{t.visibleToCustomer ? ' · müşteriye görünür' : ''}</p>
                </li>
              ))}
            </ol>
          </section>

          {/* Notlar */}
          <section className="admin-card" style={{ padding: 16 }}>
            <h2 className="text-sm font-semibold text-[var(--brand-purple-deep)]">Admin notu</h2>
            <p className="admin-hint">Yalnız panelde görünür.</p>
            <textarea className="admin-textarea mt-2" rows={3} value={adminNote} disabled={!canWrite} onChange={(e) => setAdminNote(e.target.value)} />
            {canWrite && <div className="mt-2 flex justify-end"><button type="button" className="admin-btn admin-btn-primary admin-btn-sm" disabled={noteBusy || adminNote === (o.adminNote ?? '')} onClick={saveAdminNote}>{noteBusy ? 'Kaydediliyor…' : 'Kaydet'}</button></div>}
            {o.customerNote && <div className="mt-3 rounded-lg bg-[#f7f4ef] p-3 text-sm"><p className="text-xs font-semibold text-[var(--admin-ink-soft)]">Müşteri notu</p><p className="mt-1">{o.customerNote}</p></div>}
          </section>
        </div>

        {/* SAĞ */}
        <div className="flex flex-col gap-4">
          <section className="admin-card" style={{ padding: 16 }}>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-ink-soft)]">Müşteri</h2>
            <p className="mt-1 font-semibold">{o.customer.name || '—'} {o.customer.isGuest && <span className="admin-chip ml-1">misafir</span>}</p>
            <p className="text-sm"><a href={`mailto:${o.customer.email}`} className="text-[var(--brand-purple)] hover:underline">{o.customer.email}</a></p>
            {o.customer.phone && <p className="text-sm">{formatPhoneTR(o.customer.phone)}</p>}
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-[#f7f4ef] p-2"><div className="text-[var(--admin-ink-soft)]">Sipariş</div><div className="font-semibold">{o.customer.orderCount}</div></div>
              <div className="rounded-lg bg-[#f7f4ef] p-2"><div className="text-[var(--admin-ink-soft)]">Toplam harcama</div><div className="font-semibold">{formatMinor(o.customer.totalSpentMinor)}</div></div>
            </div>
            {o.customer.id && <Link href={`/admin/musteriler/${o.customer.id}`} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand-purple)] hover:underline">Profil <ExternalLink size={12} /></Link>}
          </section>

          <AddressCard title="Teslimat adresi" a={o.shippingAddress} onEdit={canWrite && editable ? () => setDialog('ship-addr') : undefined} />
          {!sameAddress && <AddressCard title="Fatura adresi" a={o.billingAddress} onEdit={canWrite && editable ? () => setDialog('bill-addr') : undefined} />}
          {sameAddress && canWrite && editable && <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm self-start" onClick={() => setDialog('bill-addr')}>Fatura adresi farklı gir</button>}

          <section className="admin-card" style={{ padding: 16 }}>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-ink-soft)]">Ödeme</h2>
            <p className="mt-1 text-sm font-semibold">{o.paymentMethodLabel}</p>
            {o.payments.length === 0 && <p className="admin-hint">Ödeme kaydı yok.</p>}
            <ul className="mt-2 space-y-2 text-xs">
              {o.payments.map((p) => (
                <li key={p.id} className="rounded-lg bg-[#f7f4ef] p-2">
                  <div className="flex justify-between"><span className="font-semibold">{p.provider} · {p.status}</span><span>{formatMinor(p.amountMinor)}</span></div>
                  <div className="text-[var(--admin-ink-soft)]">{p.cardBrand ? `${p.cardBrand} •••• ${p.cardLast4}${p.threeDS ? ' · 3DS' : ''}` : ''}{p.installment > 1 ? ` · ${p.installment} taksit` : ''}{p.providerPaymentId ? ` · ${p.providerPaymentId}` : ''}</div>
                  <div className="text-[var(--admin-ink-soft)]">{dateTime.format(new Date(p.capturedAt ?? p.createdAt))}{p.errorMessage ? ` · ${p.errorMessage}` : ''}</div>
                </li>
              ))}
            </ul>
            {o.refunds.length > 0 && (
              <>
                <h3 className="mt-3 text-xs font-semibold uppercase tracking-wide text-[var(--admin-ink-soft)]">İadeler</h3>
                <ul className="mt-1 space-y-1 text-xs">
                  {o.refunds.map((r) => <li key={r.id} className="flex justify-between rounded-lg bg-[#fdecec] p-2"><span>{r.type} · {r.status} · {r.by}</span><span className="font-semibold">−{formatMinor(r.amountMinor)}</span></li>)}
                </ul>
              </>
            )}
          </section>

          <section className="admin-card" style={{ padding: 16 }}>
            <header className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-ink-soft)]">Kargo</h2>
              {canShip && canCreateShipment && <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => setDialog('shipment')}><Truck size={14} /> Oluştur</button>}
            </header>
            <p className="mt-1 text-sm">{o.shippingMethod?.name ?? '—'}{o.shippingMethod?.estimatedDays ? <span className="text-[var(--admin-ink-soft)]"> · {o.shippingMethod.estimatedDays}</span> : null}</p>
            {o.shipments.length === 0 && <p className="admin-hint">Sevkiyat yok.</p>}
            <ul className="mt-2 space-y-2 text-xs">
              {o.shipments.map((s) => (
                <li key={s.id} className="rounded-lg bg-[#f7f4ef] p-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{carrierLabels[s.carrier as Carrier] ?? s.carrier} · {s.status}</span>
                    {canShip && <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => setShipmentEdit(s.id)}><Pencil size={12} /></button>}
                  </div>
                  <div className="text-[var(--admin-ink-soft)]">{s.items.reduce((n, i) => n + i.quantity, 0)} adet · {dateTime.format(new Date(s.shippedAt ?? s.createdAt))}</div>
                  {s.trackingNumber && <div>Takip: {s.trackingUrl ? <a href={s.trackingUrl} target="_blank" rel="noreferrer" className="text-[var(--brand-purple)] hover:underline">{s.trackingNumber}</a> : s.trackingNumber}</div>}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      {/* Diyaloglar */}
      <StatusDialog order={o} open={dialog === 'status'} onClose={() => setDialog(null)} onUpdated={setOrder} />
      <PaymentDialog order={o} open={dialog === 'payment'} onClose={() => setDialog(null)} onUpdated={setOrder} />
      <ShipmentDialog order={o} open={dialog === 'shipment'} onClose={() => setDialog(null)} onUpdated={setOrder} />
      <RefundDialog order={o} open={dialog === 'refund'} onClose={() => setDialog(null)} onUpdated={setOrder} />
      {dialog === 'items' && <ItemsEditorDialog order={o} open onClose={() => setDialog(null)} onUpdated={setOrder} />}
      <NoteDialog order={o} open={dialog === 'note'} onClose={() => setDialog(null)} onUpdated={setOrder} />
      <ResendEmailDialog order={o} open={dialog === 'email'} onClose={() => setDialog(null)} onUpdated={setOrder} />
      {dialog === 'ship-addr' && <AddressDialog order={o} kind="shipping" open onClose={() => setDialog(null)} onUpdated={setOrder} />}
      {dialog === 'bill-addr' && <AddressDialog order={o} kind="billing" open onClose={() => setDialog(null)} onUpdated={setOrder} />}
      {shipmentEdit && <ShipmentUpdateDialog order={o} shipmentId={shipmentEdit} open onClose={() => setShipmentEdit(null)} onUpdated={setOrder} />}
    </div>
  );
}

type ActionProps = {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
  href?: string;
  title?: string;
};

function Action({ icon: Icon, label, onClick, disabled, danger, href, title }: ActionProps) {
  const cls = cn('admin-btn admin-btn-sm', danger ? 'admin-btn-danger' : 'admin-btn-ghost');
  if (href) return <Link href={href} className={cls} target="_blank" rel="noreferrer" title={title}><Icon size={14} /> {label}</Link>;
  return <button type="button" className={cls} onClick={onClick} disabled={disabled} title={title}><Icon size={14} /> {label}</button>;
}

function Row({ k, v, tone, muted }: { k: string; v: string; tone?: 'ok' | 'bad'; muted?: boolean }) {
  return (
    <div className={cn('flex justify-between gap-3', muted && 'text-xs text-[var(--admin-ink-soft)]', tone === 'ok' && 'text-[#0f6b3d]', tone === 'bad' && 'text-[#b42318]')}>
      <dt className={cn(!muted && !tone && 'text-[var(--admin-ink-soft)]')}>{k}</dt>
      <dd className="font-medium">{v}</dd>
    </div>
  );
}

function AddressCard({ title, a, onEdit }: { title: string; a: AdminOrderView['shippingAddress']; onEdit?: () => void }) {
  return (
    <section className="admin-card" style={{ padding: 16 }}>
      <header className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-ink-soft)]">{title}</h2>
        {onEdit && <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={onEdit} aria-label={`${title} düzenle`}><Pencil size={12} /></button>}
      </header>
      <address className="mt-1 text-sm not-italic leading-6">
        <strong>{a.firstName} {a.lastName}</strong>
        {a.isCorporate && a.companyName && <><br />{a.companyName}<br /><span className="text-[var(--admin-ink-soft)]">{a.taxOffice} VD · VKN {a.taxNumber}</span></>}
        {!a.isCorporate && a.identityNumberMasked && <><br /><span className="text-[var(--admin-ink-soft)]">TCKN {a.identityNumberMasked}</span></>}
        <br />{a.addressLine}
        <br />{a.neighborhood ? `${a.neighborhood} Mah., ` : ''}{a.district} / {a.city}{a.postalCode ? ` ${a.postalCode}` : ''}
        <br /><span className="text-[var(--admin-ink-soft)]">{a.phone ? formatPhoneTR(a.phone) : ''}</span>
      </address>
    </section>
  );
}
