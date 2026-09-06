// Mock 3D Secure sayfası — YALNIZ DEMO_MODE.
//
// Gerçek sağlayıcıda müşteri bankanın 3DS sayfasına gider ve sonuç webhook ile
// döner. Test modunda bu sayfa o adımı taklit eder: müşteri "onayla" ya da
// "reddet" der, sonuç aynı durum makinesinden geçer. F3'te kart seçildiğinde
// buraya değil sağlayıcıya yönlendirilecek.

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { mockPaymentContext, MockPaymentError } from '@/server/payments/mock';
import { formatMinor } from '@/lib/money';
import { thankYouUrl } from '@/server/orders/access';
import { MockPaymentForm } from './MockPaymentForm';

export const metadata: Metadata = {
  title: 'Ödeme Doğrulama (Test)',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function MockPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ siparis?: string; d?: string }>;
}) {
  const { siparis, d } = await searchParams;
  if (!siparis) notFound();

  let ctx;
  try {
    ctx = await mockPaymentContext(siparis);
  } catch (err) {
    if (err instanceof MockPaymentError && err.status === 404) notFound();
    throw err;
  }

  const alreadyDone = ctx.status !== 'ödeme-bekliyor' && ctx.status !== 'başarısız';

  return (
    <div className="container-page section flex justify-center !pt-12">
      <div className="w-full max-w-md rounded-2xl border border-purple-100 bg-white p-6 shadow-soft">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-purple-50 text-purple-600">
            <ShieldCheck size={22} aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-lg font-semibold text-purple-900">3D Secure doğrulama</h1>
            <p className="text-xs text-ink-soft">Test modu — gerçek ödeme alınmaz</p>
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          <dt className="text-ink-soft">Sipariş</dt>
          <dd className="font-semibold">{ctx.orderNumber}</dd>
          <dt className="text-ink-soft">Tutar</dt>
          <dd className="font-semibold">{formatMinor(ctx.grandTotalMinor)}</dd>
          <dt className="text-ink-soft">Kart</dt>
          <dd>TEST •••• 0000</dd>
        </dl>

        <p className="mt-4 rounded-xl bg-purple-50 p-3 text-xs leading-5 text-ink-soft">
          Gerçek mağazada burada bankanızın doğrulama ekranı açılır. Test modunda sonucu siz seçersiniz;
          her iki seçenek de sipariş akışını gerçek sistemdeki gibi ilerletir.
        </p>

        {alreadyDone ? (
          <p className="mt-5 text-sm" role="status">
            Bu siparişin ödemesi zaten sonuçlanmış (durum: {ctx.status}).
          </p>
        ) : (
          <MockPaymentForm
            orderId={ctx.id}
            token={ctx.token}
            // Yalnız site içi teşekkür adresi kabul edilir; dış URL'ye yönlendirilmez.
            doneUrl={d && d.startsWith('/siparis/tamamlandi') ? d : thankYouUrl(ctx.orderNumber, ctx.id)}
          />
        )}
      </div>
    </div>
  );
}
