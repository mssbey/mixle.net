// Sipariş teşekkür sayfası — gerçek siparişi gösterir.
//
// Erişim: `?no=` + imzalı `?t=` jetonu (createOrder üretir). Jeton yoksa veya
// geçersizse yalnız "alındı" mesajı gösterilir; detay için sipariş takibi
// (no + e-posta) kullanılır. Böylece sıralı sipariş numaraları tahmin edilerek
// başkasının siparişi görülemez. Giriş yapmış müşteri kendi siparişini
// jetonsuz da görebilir.

import type { Metadata } from 'next';
import { CheckCircle2, Clock, Landmark, Info } from 'lucide-react';
import { db } from '@/server/db';
import { getCurrentCustomer } from '@/server/customers/auth';
import { verifyOrderAccessToken } from '@/server/orders/access';
import { publicOrderInclude, publicOrderView } from '@/server/orders/view';
import { getStoreInfo } from '@/server/settings';
import { OrderDetail } from '@/components/orders/OrderDetail';
import { ButtonLink } from '@/components/ui/Button';
import { formatMinor } from '@/lib/money';
import { RetryPaymentButton } from '@/components/orders/RetryPaymentButton';

export const metadata: Metadata = {
  title: 'Siparişiniz Alındı',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function OrderCompletePage({
  searchParams,
}: {
  searchParams: Promise<{ no?: string; t?: string }>;
}) {
  const { no, t } = await searchParams;
  const orderNumber = (no ?? '').toUpperCase();

  const row = orderNumber
    ? await db.order.findUnique({
        where: { orderNumber },
        include: { ...publicOrderInclude, customer: { select: { email: true } } },
      })
    : null;

  const me = await getCurrentCustomer();
  const authorized =
    row != null && (verifyOrderAccessToken(row.id, t) || (me != null && row.customerId === me.id));

  if (!row || !authorized) {
    return (
      <div className="container-page section flex justify-center !pt-16">
        <div className="max-w-md text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-500">
            <CheckCircle2 size={32} />
          </span>
          <h1 className="mt-5 text-display-sm">Siparişiniz alındı</h1>
          <p className="mt-3 text-ink-soft">
            {orderNumber ? `${orderNumber} numaralı siparişiniz için teşekkürler.` : 'Teşekkürler.'} Sipariş
            detaylarını sipariş numaranız ve e-posta adresinizle görüntüleyebilirsiniz.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink href={`/siparis-takibi${orderNumber ? `?no=${encodeURIComponent(orderNumber)}` : ''}`}>Siparişi takip et</ButtonLink>
            <ButtonLink href="/urunler" variant="ghost">Alışverişe devam et</ButtonLink>
          </div>
        </div>
      </div>
    );
  }

  const order = publicOrderView(row);
  const info = await getStoreInfo();
  const email = row.customer?.email ?? row.guestEmail ?? '';

  return (
    <div className="container-page section !pt-8">
      <div className="mb-8 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-600">
            {order.status === 'ödeme-bekliyor' || order.status === 'başarısız' ? <Clock size={24} /> : <CheckCircle2 size={24} />}
          </span>
          <div className="min-w-0">
            <h1 className="text-display-sm">
              {order.status === 'başarısız'
                ? 'Ödeme alınamadı'
                : order.status === 'ödeme-bekliyor'
                  ? 'Siparişiniz alındı — ödeme bekleniyor'
                  : 'Teşekkürler, siparişiniz alındı!'}
            </h1>
            <p className="mt-1 text-sm text-ink-soft">
              Sipariş numaranız <strong className="text-purple-900">{order.orderNumber}</strong>.
              {email && <> Onay e-postası <strong>{email}</strong> adresine gönderildi.</>}
            </p>

            {order.paymentMethod === 'havale' && order.status === 'ödeme-bekliyor' && (
              <div className="mt-4 rounded-xl border border-purple-100 bg-white p-4 text-sm">
                <p className="flex items-center gap-2 font-semibold text-purple-900"><Landmark size={16} /> Havale / EFT bilgileri</p>
                <p className="mt-2 text-ink-soft">
                  Alıcı: <strong className="text-ink">{info.legalName}</strong><br />
                  Tutar: <strong className="text-ink">{formatMinor(order.grandTotalMinor)}</strong><br />
                  Açıklama: <strong className="text-ink">{order.orderNumber}</strong>
                </p>
                <p className="mt-2 flex items-start gap-1.5 text-xs text-ink-soft">
                  <Info size={14} className="mt-0.5 shrink-0" />
                  IBAN bilgisi mağaza ayarlarından tanımlanacak (F7). Ödemeniz onaylandığında siparişiniz hazırlanmaya başlar.
                </p>
              </div>
            )}

            {order.canRetryPayment && (
              <div className="mt-4">
                <RetryPaymentButton orderId={row.id} token={t} />
              </div>
            )}
          </div>
        </div>
      </div>

      <OrderDetail order={order} />

      <div className="mt-8 flex flex-wrap gap-3">
        <ButtonLink href="/urunler" variant="ghost">Alışverişe devam et</ButtonLink>
        {me ? (
          <ButtonLink href="/hesabim/siparisler">Siparişlerim</ButtonLink>
        ) : (
          <ButtonLink href={`/kayit?eposta=${encodeURIComponent(email)}`}>Hesap oluştur, siparişlerini takip et</ButtonLink>
        )}
      </div>
    </div>
  );
}
