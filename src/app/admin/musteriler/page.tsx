import { Suspense } from 'react';
import { CustomersList } from '@/components/admin/customers/CustomersList';
import { TableSkeleton } from '@/components/admin/primitives';

export default function AdminCustomersPage() {
  return (
    <Suspense fallback={<TableSkeleton rows={8} />}>
      <CustomersList />
    </Suspense>
  );
}
