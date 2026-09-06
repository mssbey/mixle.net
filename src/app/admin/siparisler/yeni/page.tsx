import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { NewOrderForm } from '@/components/admin/orders/NewOrderForm';

export default async function NewOrderPage({ searchParams }: { searchParams: Promise<{ kopya?: string }> }) {
  const { kopya } = await searchParams;
  return (
    <div className="flex flex-col gap-4">
      <Link href="/admin/siparisler" className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand-purple)] hover:underline"><ArrowLeft size={14} /> Siparişler</Link>
      <h1 className="text-lg font-semibold text-[var(--brand-purple-deep)]">{kopya ? 'Siparişi kopyala' : 'Yeni sipariş'}</h1>
      <NewOrderForm copyFrom={kopya} />
    </div>
  );
}
