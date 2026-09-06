import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { db } from '@/server/db';
import { requireCustomer } from '@/server/customers/auth';
import { publicOrderInclude, publicOrderView } from '@/server/orders/view';
import { OrderDetail } from '@/components/orders/OrderDetail';
import { OrderActions } from '@/components/account/OrderActions';

export const metadata: Metadata = { title: 'Sipariş Detayı', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function MyOrderPage({ params }: { params: Promise<{ no: string }> }) {
  const { no } = await params;
  const me = await requireCustomer();
  const row = await db.order.findFirst({
    where: { customerId: me.id, orderNumber: no.toUpperCase() },
    include: publicOrderInclude,
  });
  if (!row) notFound();

  const order = publicOrderView(row);

  return (
    <div>
      <Link href="/hesabim/siparisler" className="inline-flex items-center gap-1.5 text-sm font-semibold text-purple-700 link-underline">
        <ArrowLeft size={16} /> Siparişlerim
      </Link>
      <div className="mt-4">
        <OrderDetail order={order}>
          <OrderActions order={order} orderId={row.id} />
        </OrderDetail>
      </div>
    </div>
  );
}
