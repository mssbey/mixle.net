import type { Metadata } from 'next';
import { Hero } from '@/components/home/Hero';
import { HomeRail } from '@/components/home/HomeRail';
import { HomeBanners, type HomeBanner } from '@/components/home/HomeBanners';
import { FadeInUp } from '@/components/home/FadeInUp';
import { getProducts } from '@/data/products';
import { getCategories } from '@/data/categories';

export const metadata: Metadata = { alternates: { canonical: '/' } };

const RAIL_SIZE = 20;

const search = (q: string) => `/arama?q=${encodeURIComponent(q)}`;
const banner = (n: number, alt: string, href: string, width: number, height: number): HomeBanner => ({
  image: `/images/reference/${n}.jpg`,
  alt,
  href,
  width,
  height,
});

// Bloklar ve sıraları mixle.net ana sayfasıyla aynıdır.
const brandsTop = [
  banner(3, 'Santa aromaları', search('Santa'), 289, 165),
  banner(4, 'Halo aromaları', search('Halo'), 289, 165),
  banner(5, 'Twelve Monkeys aromaları', search('Twelve Monkeys'), 289, 165),
  banner(6, 'Cuttwood aromaları', search('Cuttwood'), 289, 165),
];
const brandsMiddle = [
  banner(7, 'Cosmic Fog aromaları', search('Cosmic Fog'), 389, 170),
  banner(8, 'Suicide Bunny aromaları', search('Suicide Bunny'), 389, 170),
  banner(9, 'Capella aromaları', '/kategori/capella', 389, 170),
];
const brandsBottom = [
  banner(10, 'Humble Juice aromaları', search('Humble'), 592, 136),
  banner(11, 'One Hit Wonder aromaları', search('One Hit Wonder'), 592, 136),
];

export default async function HomePage() {
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);
  const available = products.filter((p) => p.stockStatus !== 'out-of-stock');
  const labelOf = Object.fromEntries(categories.map((c) => [c.slug, c.name]));
  const inCategory = (slug: string) => available.filter((p) => p.categories.includes(slug)).slice(0, RAIL_SIZE);

  const newest = [...available].reverse().slice(0, RAIL_SIZE);

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
        <HomeRail products={inCategory('inawera')} labelOf={labelOf} />
      </FadeInUp>
      <FadeInUp>
        <HomeBanners banners={brandsMiddle} columns={3} />
      </FadeInUp>
      <FadeInUp className="py-2">
        <HomeRail products={inCategory('tfa-tpa')} labelOf={labelOf} />
      </FadeInUp>
      <FadeInUp className="py-2">
        <HomeBanners banners={brandsBottom} columns={2} />
      </FadeInUp>
    </div>
  );
}
