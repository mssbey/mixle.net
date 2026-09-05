'use client';

import { useEffect, useState } from 'react';
import type { AdminProduct } from '@/types/admin';
import { useAdminData } from '@/components/admin/AdminDataProvider';
import { ProductEditor, blankProduct } from '@/components/admin/ProductEditor';
import { TableSkeleton } from '@/components/admin/primitives';

export default function NewProductPage() {
  const { status, categories } = useAdminData();
  const [initial, setInitial] = useState<AdminProduct | null>(null);

  useEffect(() => {
    if (!initial && status === 'ready') {
      setInitial(blankProduct(categories[0]?.id));
    }
  }, [initial, status, categories]);

  if (status === 'loading' || !initial) return <TableSkeleton rows={6} />;

  return <ProductEditor key={initial.id} initial={initial} mode="create" />;
}
