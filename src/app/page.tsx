import type { Metadata } from 'next';
import { TrustStrip } from '@/components/home/TrustStrip';
import { Hero } from '@/components/home/Hero';
import { AromaShowcase } from '@/components/home/AromaShowcase';
import { CategoryShowcase } from '@/components/home/CategoryShowcase';
import { SignatureCollections } from '@/components/home/SignatureCollections';
import { NewArrivalsSection } from '@/components/home/NewArrivalsSection';
import { HomeRail } from '@/components/home/HomeRail';
import { CampaignBanner } from '@/components/home/CampaignBanner';

export const metadata: Metadata = { alternates: { canonical: '/' } };

export default function HomePage() {
  return (
    <div className="storefront-home">
      <Hero />
      <AromaShowcase />
      <NewArrivalsSection />
      <CategoryShowcase />
      <HomeRail eyebrow="Popüler" title="Çok Satanlar" href="/cok-satanlar" source="bestSeller" />
      <SignatureCollections />
      <HomeRail eyebrow="İndirim" title="Fırsat Ürünleri" href="/kampanyalar" source="deals" />

      <CampaignBanner />
      <TrustStrip />

    </div>
  );
}
