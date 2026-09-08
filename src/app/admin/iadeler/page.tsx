import { Suspense } from 'react';
import { ReturnsList } from '@/components/admin/returns/ReturnsList';
import { TableSkeleton } from '@/components/admin/primitives';

export default function AdminReturnsPage() {
  return (
    <Suspense fallback={<TableSkeleton rows={8} />}>
      <ReturnsList />
    </Suspense>
  );
}
