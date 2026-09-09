import type { Metadata } from 'next';
import { TrustStrip } from '@/components/home/TrustStrip';
import { Hero } from '@/components/home/Hero';
import { CategoryShowcase } from '@/components/home/CategoryShowcase';
import { FlavorExplorer } from '@/components/home/FlavorExplorer';
import { SignatureCollections } from '@/components/home/SignatureCollections';
import { NewArrivalsSection } from '@/components/home/NewArrivalsSection';
import { HomeRail } from '@/components/home/HomeRail';
import { CampaignBanner } from '@/components/home/CampaignBanner';
import { GuideTeaser } from '@/components/home/GuideTeaser';
import { NewsletterSection } from '@/components/home/NewsletterSection';
import { getProducts } from '@/data/products';

export const metadata: Metadata = { alternates: { canonical: '/' } };

export default async function HomePage() {
  const products = await getProducts();
  return (
    <>
      <Hero />
      <TrustStrip />

      {/* Ürün odaklı akış */}
      <NewArrivalsSection />
      <HomeRail eyebrow="Popüler" title="Çok Satanlar" href="/cok-satanlar" source="bestSeller" />
      <CategoryShowcase />
      <HomeRail eyebrow="İndirim" title="Fırsat Ürünleri" href="/kampanyalar" source="deals" />
      <SignatureCollections />
      <CampaignBanner />

      {/* Keşif & rehber */}
      <FlavorExplorer products={products} />
      <GuideTeaser />
      <NewsletterSection />
    </>
  );
}
