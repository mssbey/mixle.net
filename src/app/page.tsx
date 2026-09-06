import type { Metadata } from 'next';
import { TrustStrip } from '@/components/home/TrustStrip';
import { Hero } from '@/components/home/Hero';
import { CategoryShowcase } from '@/components/home/CategoryShowcase';
import { Diy25Section } from '@/components/home/Diy25Section';
import { FlavorExplorer } from '@/components/home/FlavorExplorer';
import { SignatureCollections } from '@/components/home/SignatureCollections';
import { AromaFinderSection } from '@/components/home/AromaFinderSection';
import { LabProcess } from '@/components/home/LabProcess';
import { NewArrivalsSection } from '@/components/home/NewArrivalsSection';
import { CampaignBanner } from '@/components/home/CampaignBanner';
import { GuideTeaser } from '@/components/home/GuideTeaser';
import { NewsletterSection } from '@/components/home/NewsletterSection';
import { ProductFormats } from '@/components/home/ProductFormats';
import { getProducts } from '@/data/products';

export const metadata: Metadata = { alternates: { canonical: '/' } };

export default async function HomePage() {
  const products = await getProducts();
  return (
    <>
      <Hero />
      <TrustStrip />
      <CategoryShowcase />

      <FlavorExplorer products={products} />
      <LabProcess />
      <ProductFormats />
      <Diy25Section />
      <SignatureCollections />
      <AromaFinderSection />

      <NewArrivalsSection />
      <CampaignBanner />
      <GuideTeaser />
      <NewsletterSection />
    </>
  );
}
