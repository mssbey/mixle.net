import type { Metadata } from 'next';
import { Hero } from '@/components/home/Hero';
import { BrandBanners } from '@/components/home/BrandBanners';
import { ProductRail } from '@/components/product/ProductRail';
import { getProducts } from '@/data/products';

export const metadata: Metadata = { alternates: { canonical: '/' } };

export default async function HomePage() {
  const products = await getProducts();
  const newest = [...products.filter(p => p.newArrival), ...products.filter(p => !p.newArrival)].slice(0, 15);
  const inawera = products.filter(p => p.images[0]?.src.includes('inawera'));
  const popular = (inawera.length ? inawera : products.filter(p => p.bestSeller)).slice(0, 15);
  const aromas = products.filter(p => p.images[0]?.src.includes('tfa')).slice(0, 15);
  return <div className="storefront-home reference-home">
    <Hero />
    <section className="container-page reference-products" aria-label="Yeni eklenenler">
      <h2 className="store-section-title">YENİ EKLENENLER</h2>
      <ProductRail products={newest} pagination />
    </section>
    <BrandBanners group="first" />
    <section className="container-page reference-products reference-products-untitled" aria-label="Popüler aromalar"><ProductRail products={popular} pagination /></section>
    <BrandBanners group="second" />
    <section className="container-page reference-products reference-products-untitled" aria-label="Aroma çeşitleri"><ProductRail products={aromas.length ? aromas : products.slice(15, 30)} pagination /></section>
    <BrandBanners group="last" />
  </div>;
}
