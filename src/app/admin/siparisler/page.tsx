import { Suspense } from 'react';
import { OrderList } from '@/components/admin/orders/OrderList';
import { TableSkeleton } from '@/components/admin/primitives';

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<TableSkeleton rows={8} />}>
      <OrderList />
    </Suspense>
  );
}
