import type { Metadata } from 'next';
import { Hero } from '@/components/home/Hero';
import { HomeRail } from '@/components/home/HomeRail';
import { HomeBanners, type HomeBanner } from '@/components/home/HomeBanners';
import { FadeInUp } from '@/components/home/FadeInUp';
import { getProducts } from '@/data/products';
import { getCategories } from '@/data/categories';
import { getHomeBannersContent } from '@/server/content/settings';

export const metadata: Metadata = { alternates: { canonical: '/' } };

const RAIL_SIZE = 20;

// Bloklar ve sıraları mixle.net ana sayfasıyla aynıdır; görseller ve bağlantılar
// panelden (Sayfalar > Ana sayfa bannerları) düzenlenir. Boyut satırın oranını verir.
const toBanners = (items: { image: string; alt: string; href: string }[], width: number, height: number): HomeBanner[] =>
  items.map((b) => ({ ...b, width, height }));

export default async function HomePage() {
  const [products, categories, banners] = await Promise.all([getProducts(), getCategories(), getHomeBannersContent()]);
  const brandsTop = toBanners(banners.top, 289, 165);
  const brandsMiddle = toBanners(banners.middle, 389, 170);
  const brandsBottom = toBanners(banners.bottom, 592, 136);
  const available = products.filter((p) => p.stockStatus !== 'out-of-stock');
  const labelOf = Object.fromEntries(categories.map((c) => [c.slug, c.name]));
  const inCategory = (slug: string) => available.filter((p) => p.categories.includes(slug)).slice(0, RAIL_SIZE);

  const newest = [...available].reverse().slice(0, RAIL_SIZE);

  // Alt raylar referanstaki gibi Inawera ve TFA/TPA'dır; bu kategoriler boşsa
  // (ör. ürünler henüz yüklenmemişse) ray kaybolmasın diye en çok ürünü olan
  // diğer kategorilerle doldurulur.
  const bySize = categories
    .map((c) => ({ slug: c.slug, items: inCategory(c.slug) }))
    .sort((a, b) => b.items.length - a.items.length);
  const railCategories = [...new Set(['inawera', 'tfa-tpa', ...bySize.map((c) => c.slug)])]
    .map((slug) => inCategory(slug))
    .filter((items) => items.length > 0)
    .slice(0, 2);
  const [railA = [], railB = []] = railCategories;

  return (
    <div className="home-ref min-h-screen bg-[#f9fafb] pb-4 pt-1">
      <Hero />
      <FadeInUp>
        <HomeRail title="Yeni Eklenenler" products={newest} labelOf={labelOf} />
      </FadeInUp>
      <FadeInUp>
        <HomeBanners banners={brandsTop} columns={4} />
      </FadeInUp>
      <FadeInUp className="py-2">
        <HomeRail products={railA} labelOf={labelOf} />
      </FadeInUp>
      <FadeInUp>
        <HomeBanners banners={brandsMiddle} columns={3} />
      </FadeInUp>
      <FadeInUp className="py-2">
        <HomeRail products={railB} labelOf={labelOf} />
      </FadeInUp>
      <FadeInUp className="py-2">
        <HomeBanners banners={brandsBottom} columns={2} />
      </FadeInUp>
    </div>
  );
}
