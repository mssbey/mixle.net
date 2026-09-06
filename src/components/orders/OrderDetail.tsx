// Müşteriye gösterilen sipariş detayı — teşekkür sayfası, sipariş takibi ve
// hesap sayfası ortak kullanır. Sunucu veya istemci bileşeni olarak çalışır
// (hook yok, yalnız veri → görünüm).

import Image from 'next/image';
import Link from 'next/link';
import { Package, Truck, CreditCard, MapPin, Clock } from 'lucide-react';
import type { PublicOrder } from '@/server/orders/view';
import { formatMinor } from '@/lib/money';
import { formatPhoneTR } from '@/lib/validators/phone';
import { cn } from '@/lib/utils';

const dateFmt = new Intl.DateTimeFormat('tr-TR', {
  day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  timeZone: 'Europe/Istanbul',
});

const STATUS_TONE: Record<string, string> = {
  'ödeme-bekliyor': 'bg-amber-50 text-amber-700 border-amber-200',
  ödendi: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  hazırlanıyor: 'bg-purple-50 text-purple-700 border-purple-200',
  kargolandı: 'bg-sky-50 text-sky-700 border-sky-200',
  'teslim-edildi': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  tamamlandı: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  iptal: 'bg-rose-50 text-rose-700 border-rose-200',
  başarısız: 'bg-rose-50 text-rose-700 border-rose-200',
  'iade-talebi': 'bg-amber-50 text-amber-700 border-amber-200',
  'iade-edildi': 'bg-slate-50 text-slate-700 border-slate-200',
};

export function OrderStatusBadge({ status, label }: { status: string; label: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold', STATUS_TONE[status] ?? 'bg-purple-50 text-purple-700 border-purple-200')}>
      {label}
    </span>
  );
}

function AddressBlock({ title, a, icon }: { title: string; a: PublicOrder['shippingAddress']; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-purple-100 bg-white p-4">
      <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-gold-500">
        {icon} {title}
      </h3>
      <address className="mt-2 text-sm not-italic leading-6">
        <strong>{a.firstName} {a.lastName}</strong>
        {a.isCorporate && a.companyName && (
          <>
            <br />{a.companyName}
            <br /><span className="text-ink-soft">{a.taxOffice} VD · VKN {a.taxNumber}</span>
          </>
        )}
        {!a.isCorporate && a.identityNumberMasked && (
          <><br /><span className="text-ink-soft">TCKN {a.identityNumberMasked}</span></>
        )}
        <br />{a.addressLine}
        <br />{a.neighborhood ? `${a.neighborhood} Mah., ` : ''}{a.district} / {a.city}{a.postalCode ? ` ${a.postalCode}` : ''}
        <br /><span className="text-ink-soft">{formatPhoneTR(a.phone)}</span>
      </address>
    </div>
  );
}

export function OrderDetail({
  order,
  children,
}: {
  order: PublicOrder;
  /** Eylem düğmeleri (iptal, yeniden öde, iade) — bağlama göre çağıran verir. */
  children?: React.ReactNode;
}) {
  const sameAddress = JSON.stringify(order.shippingAddress) === JSON.stringify(order.billingAddress);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        {/* Başlık */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-gold-500">Sipariş</p>
            <h1 className="mt-1 font-display text-2xl font-semibold text-purple-900">{order.orderNumber}</h1>
            <p className="mt-1 text-sm text-ink-soft">{dateFmt.format(new Date(order.placedAt))}</p>
          </div>
          <OrderStatusBadge status={order.status} label={order.statusLabel} />
        </div>

        {children && <div className="flex flex-wrap gap-2">{children}</div>}

        {/* Kalemler */}
        <section className="rounded-xl border border-purple-100 bg-white" aria-labelledby="order-items">
          <h2 id="order-items" className="flex items-center gap-2 border-b border-purple-50 px-4 py-3 text-sm font-semibold text-purple-900">
            <Package size={16} /> Ürünler
          </h2>
          <ul className="divide-y divide-purple-50">
            {order.items.map((i) => (
              <li key={i.id} className="flex gap-3 px-4 py-3">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-purple-50">
                  {i.imageUrl && <Image src={i.imageUrl} alt="" fill sizes="64px" className="object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-purple-900">
                    {i.productId ? <Link href={`/urun/${i.productId}`} className="hover:underline">{i.name}</Link> : i.name}
                  </p>
                  {i.variantLabel && <p className="text-xs text-ink-soft">{i.variantLabel}</p>}
                  <p className="mt-1 text-xs text-ink-soft">
                    {i.quantity} × {formatMinor(i.unitPriceMinor)}
                    {i.discountMinor > 0 && <span className="text-emerald-600"> · −{formatMinor(i.discountMinor)}</span>}
                    {i.refundedQuantity > 0 && <span className="text-rose-600"> · {i.refundedQuantity} adet iade</span>}
                  </p>
                </div>
                <p className="text-sm font-semibold">{formatMinor(i.lineTotalMinor)}</p>
              </li>
            ))}
          </ul>
          <dl className="space-y-1 border-t border-purple-50 px-4 py-3 text-sm">
            <div className="flex justify-between"><dt className="text-ink-soft">Ara toplam</dt><dd>{formatMinor(order.itemsSubtotalMinor)}</dd></div>
            {order.discountTotalMinor > 0 && (
              <div className="flex justify-between text-emerald-600"><dt>İndirim{order.couponCode ? ` (${order.couponCode})` : ''}</dt><dd>−{formatMinor(order.discountTotalMinor)}</dd></div>
            )}
            <div className="flex justify-between"><dt className="text-ink-soft">Kargo</dt><dd>{order.shippingTotalMinor === 0 ? 'Ücretsiz' : formatMinor(order.shippingTotalMinor)}</dd></div>
            {order.surchargeMinor > 0 && <div className="flex justify-between"><dt className="text-ink-soft">Kapıda ödeme bedeli</dt><dd>{formatMinor(order.surchargeMinor)}</dd></div>}
            <div className="flex justify-between text-xs text-ink-soft"><dt>KDV (dahil)</dt><dd>{formatMinor(order.taxTotalMinor)}</dd></div>
            <div className="flex justify-between border-t border-purple-100 pt-2 text-base font-bold text-purple-900"><dt>Toplam</dt><dd>{formatMinor(order.grandTotalMinor)}</dd></div>
            {order.refundedTotalMinor > 0 && (
              <div className="flex justify-between text-rose-600"><dt>İade edilen</dt><dd>−{formatMinor(order.refundedTotalMinor)}</dd></div>
            )}
          </dl>
        </section>

        {/* Zaman çizelgesi */}
        {order.events.length > 0 && (
          <section className="rounded-xl border border-purple-100 bg-white p-4" aria-labelledby="order-timeline">
            <h2 id="order-timeline" className="flex items-center gap-2 text-sm font-semibold text-purple-900">
              <Clock size={16} /> Sipariş geçmişi
            </h2>
            <ol className="mt-3 space-y-3 border-l border-purple-100 pl-4 text-sm">
              {order.events.map((e, i) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-purple-400" aria-hidden />
                  <p>{e.message}</p>
                  <p className="text-xs text-ink-soft">{dateFmt.format(new Date(e.at))}</p>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-purple-100 bg-white p-4">
          <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-gold-500">
            <CreditCard size={14} /> Ödeme
          </h3>
          <p className="mt-2 text-sm">{order.paymentMethodLabel}</p>
          <p className="text-xs text-ink-soft">
            {order.paymentStatus === 'ödendi' ? 'Ödendi' : order.paymentStatus === 'bekliyor' ? 'Ödeme bekleniyor' : order.paymentStatus}
            {order.paidAt && ` · ${dateFmt.format(new Date(order.paidAt))}`}
          </p>
        </div>

        <div className="rounded-xl border border-purple-100 bg-white p-4">
          <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-gold-500">
            <Truck size={14} /> Kargo
          </h3>
          <p className="mt-2 text-sm">{order.shippingMethod?.name ?? '—'}</p>
          {order.shippingMethod?.estimatedDays && <p className="text-xs text-ink-soft">Tahmini {order.shippingMethod.estimatedDays}</p>}
          {order.shipments.map((s) => (
            <div key={s.id} className="mt-2 rounded-lg bg-purple-50/60 p-2 text-xs">
              <p className="font-semibold">{s.carrier} · {s.status}</p>
              {s.trackingNumber && (
                <p>
                  Takip: {s.trackingUrl ? <a href={s.trackingUrl} target="_blank" rel="noreferrer" className="link-underline text-purple-700">{s.trackingNumber}</a> : s.trackingNumber}
                </p>
              )}
            </div>
          ))}
        </div>

        <AddressBlock title="Teslimat adresi" a={order.shippingAddress} icon={<MapPin size={14} />} />
        {!sameAddress && <AddressBlock title="Fatura adresi" a={order.billingAddress} icon={<MapPin size={14} />} />}

        {order.customerNote && (
          <div className="rounded-xl border border-purple-100 bg-white p-4 text-sm">
            <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-gold-500">Sipariş notunuz</h3>
            <p className="mt-2 text-ink-soft">{order.customerNote}</p>
          </div>
        )}
      </div>
    </div>
  );
}
