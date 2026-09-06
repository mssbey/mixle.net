import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Tag } from 'lucide-react';
import { getOnSaleProducts } from '@/data/products';
import { campaign } from '@/data/content';
import { ProductBrowser } from '@/components/commerce/ProductBrowser';
import { ProductGridSkeleton } from '@/components/ui/Skeleton';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';

export const metadata: Metadata = {
  title: 'Kampanyalar',
  description: 'Nefis Aroma’da güncel indirimli ürünler ve örnek kampanya kodları.',
  alternates: { canonical: '/kampanyalar' },
};

export default async function CampaignsPage() {
  const list = await getOnSaleProducts();
  return (
    <div>
      <section className="surface-dark relative overflow-hidden">
        <div className="grain absolute inset-0" aria-hidden />
        <Image src={campaign.image} alt="" fill sizes="100vw" className="object-cover opacity-35" />
        <div className="absolute inset-0 bg-gradient-to-r from-purple-900 via-purple-900/85 to-purple-900/45" />
        <div className="container-page relative py-16 sm:py-20">
          <Breadcrumbs items={[{ label: 'Kampanyalar' }]} className="[&_*]:text-cream/70 [&_span[aria-current]]:text-cream" />
          <h1 className="mt-4 font-display text-3xl font-semibold text-cream sm:text-4xl">Kampanyalar</h1>
          <p className="mt-3 max-w-xl text-cream/75">
            İndirimli aromalar ve örnek kampanya kodları. Kodlar sepet sayfasında uygulanabilir.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {['NEFIS10', 'ILKAROMA', 'GOLDENDROP'].map((code) => (
              <span key={code} className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-gold-200/50 px-3 py-1.5 text-xs font-semibold text-gold-200">
                <Tag size={12} /> {code}
              </span>
            ))}
          </div>
          <Link href={campaign.cta.href} className="mt-6 inline-block text-sm font-semibold text-gold-200 link-underline">
            {campaign.title} koleksiyonunu incele →
          </Link>
        </div>
      </section>

      <div className="container-page section !pt-10">
        <h2 className="text-display-sm">İndirimli Aromalar</h2>
        <p className="mt-2 text-ink-soft">{list.length} üründe kampanyalı fiyat.</p>
        <div className="mt-8">
          <Suspense fallback={<ProductGridSkeleton count={8} />}>
            <ProductBrowser baseProducts={list} emptyTitle="Şu anda aktif kampanya yok" />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
