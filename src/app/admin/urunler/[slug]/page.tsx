'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAdminData } from '@/components/admin/AdminDataProvider';
import { ProductEditor } from '@/components/admin/ProductEditor';
import { EmptyState, TableSkeleton } from '@/components/admin/primitives';

export default function EditProductPage() {
  const params = useParams<{ slug: string }>();
  const slug = decodeURIComponent(String(params?.slug ?? ''));
  const { status, productBySlug } = useAdminData();

  if (status === 'loading') return <TableSkeleton rows={6} />;

  const product = productBySlug(slug);
  if (!product) {
    return (
      <div className="admin-card">
        <EmptyState
          title="Ürün bulunamadı"
          hint={`"${slug}" için kayıt yok.`}
          action={
            <Link href="/admin/urunler" className="admin-btn admin-btn-ghost">
              Ürün listesine dön
            </Link>
          }
        />
      </div>
    );
  }

  return <ProductEditor key={product.id} initial={product} mode="edit" />;
}
