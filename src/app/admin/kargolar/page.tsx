import { Suspense } from 'react';
import { ShipmentsList } from '@/components/admin/shipping/ShipmentsList';
import { TableSkeleton } from '@/components/admin/primitives';

export default function AdminShipmentsPage() {
  return (
    <Suspense fallback={<TableSkeleton rows={8} />}>
      <ShipmentsList />
    </Suspense>
  );
}
