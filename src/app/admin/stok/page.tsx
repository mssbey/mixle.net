import { Suspense } from 'react';
import { StockPanel } from '@/components/admin/stock/StockPanel';
import { TableSkeleton } from '@/components/admin/primitives';

export default function AdminStockPage() {
  return (
    <Suspense fallback={<TableSkeleton rows={6} />}>
      <StockPanel />
    </Suspense>
  );
}
