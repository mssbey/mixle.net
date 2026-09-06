import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { TrackOrderForm } from './TrackOrderForm';

export const metadata: Metadata = {
  title: 'Sipariş Takibi',
  description: 'Sipariş numaranız ve e-posta adresinizle siparişinizin durumunu görüntüleyin.',
  alternates: { canonical: '/siparis-takibi' },
};

export default async function TrackOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ no?: string; eposta?: string }>;
}) {
  const { no, eposta } = await searchParams;
  return (
    <div className="container-page section !pt-8">
      <Breadcrumbs items={[{ label: 'Sipariş Takibi' }]} />
      <h1 className="mt-4 text-display-sm">Sipariş takibi</h1>
      <p className="mt-2 max-w-xl text-ink-soft">
        Sipariş numaranızı (NA-YYYY-000000) ve sipariş verirken kullandığınız e-posta adresini girin.
        Hesabınız varsa <Link href="/hesabim/siparisler" className="link-underline font-semibold text-purple-700">Siparişlerim</Link> sayfasından da ulaşabilirsiniz.
      </p>
      <TrackOrderForm initialNo={no ?? ''} initialEmail={eposta ?? ''} />
    </div>
  );
}
