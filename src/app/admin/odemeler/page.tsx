import { Suspense } from 'react';
import { PaymentsList } from '@/components/admin/payments/PaymentsList';
import { TableSkeleton } from '@/components/admin/primitives';

export default function AdminPaymentsPage() {
  return (
    <Suspense fallback={<TableSkeleton rows={8} />}>
      <PaymentsList />
    </Suspense>
  );
}
