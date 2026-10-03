import type { Metadata } from 'next';
import { getCategories } from '@/data/categories';
import { getCategoryCards } from '@/data/products';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { SubcategoryGrid } from '@/components/catalog/SubcategoryGrid';

export const metadata: Metadata = {
  title: 'Tüm Kategoriler',
  description: 'Mixle Lezzet Sepeti ana kategorileri: mix aromalar, tekil aromalar, puff aromalar ve bazlar.',
  alternates: { canonical: '/kategori' },
};

/** "Tüm Kategoriler" butonunun açtığı sayfa: ana kategoriler görselli kartlar olarak. */
export default async function AllCategoriesPage() {
  const roots = (await getCategories()).filter((c) => !c.parentSlug);
  const cards = await getCategoryCards(roots);

  return (
    <div className="container-page section !pt-6">
      <Breadcrumbs items={[{ label: 'Tüm Kategoriler' }]} />
      <h1 className="mt-3 text-2xl font-bold text-ink sm:text-3xl">Tüm Kategoriler</h1>
      <p className="mt-2 max-w-3xl text-sm text-ink-soft">
        Aradığın aromayı kategorisinden bul: mix ve tekil aromalardan puff serilerine, bazlara kadar tüm ürünlerimiz
        faturalı olarak gönderilir.
      </p>
      <div className="mt-8">
        <SubcategoryGrid items={cards} />
      </div>
    </div>
  );
}
