import type { Metadata } from 'next';
import Link from 'next/link';
import { Package, ChevronRight } from 'lucide-react';
import { db } from '@/server/db';
import { requireCustomer } from '@/server/customers/auth';
import { publicOrderInclude, publicOrderView } from '@/server/orders/view';
import { OrderStatusBadge } from '@/components/orders/OrderDetail';
import { EmptyState } from '@/components/ui/EmptyState';
import { ButtonLink } from '@/components/ui/Button';
import { formatMinor } from '@/lib/money';

export const metadata: Metadata = { title: 'Siparişlerim', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const dateFmt = new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Europe/Istanbul' });

export default async function MyOrdersPage() {
  const me = await requireCustomer();
  const rows = await db.order.findMany({
    where: { customerId: me.id, status: { not: 'taslak' } },
    orderBy: { placedAt: 'desc' },
    include: publicOrderInclude,
    take: 100,
  });
  const orders = rows.map(publicOrderView);

  return (
    <div>
      <h1 className="text-display-sm">Siparişlerim</h1>
      {orders.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Henüz siparişiniz yok"
          description="Verdiğiniz siparişler burada listelenir."
          action={<ButtonLink href="/urunler">Aromaları keşfet</ButtonLink>}
          className="mt-6"
        />
      ) : (
        <ul className="mt-6 divide-y divide-purple-50 rounded-2xl border border-purple-100 bg-white">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/hesabim/siparisler/${o.orderNumber}`} className="flex items-center gap-4 px-4 py-4 hover:bg-purple-50/50">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-purple-900">{o.orderNumber}</p>
                  <p className="text-xs text-ink-soft">
                    {dateFmt.format(new Date(o.placedAt))} · {o.items.reduce((s, i) => s + i.quantity, 0)} ürün · {o.paymentMethodLabel}
                  </p>
                </div>
                <OrderStatusBadge status={o.status} label={o.statusLabel} />
                <span className="w-24 text-right font-semibold">{formatMinor(o.grandTotalMinor)}</span>
                <ChevronRight size={18} className="text-ink-soft" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
