import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Tag } from 'lucide-react';
import { getCampaignContent } from '@/server/content/settings';
import { Reveal } from '@/components/ui/Reveal';

export async function CampaignBanner() {
  const campaign = await getCampaignContent();
  return (
    <section className="section container-page">
      <Reveal>
        <div className="relative overflow-hidden rounded-[var(--radius-card)] surface-dark">
          <div className="grain absolute inset-0" aria-hidden />
          <Image
            src={campaign.image}
            alt=""
            fill
            sizes="(max-width:1360px) 100vw, 1360px"
            className="object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-purple-900/95 via-purple-900/55 to-transparent" />
          <div className="relative grid gap-6 px-6 py-14 sm:px-12 lg:py-20">
            <div className="max-w-lg">
              <span className="inline-flex items-center gap-2 rounded-full border border-gold-200/30 bg-gold-200/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-gold-200">
                {campaign.eyebrow}
              </span>
              <h2 className="mt-4 font-display text-3xl font-semibold text-cream sm:text-4xl">
                {campaign.title}
              </h2>
              <p className="mt-3 text-base text-cream/75">{campaign.description}</p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link href={campaign.cta.href} className="btn-gold">
                  {campaign.cta.label} <ArrowRight size={16} />
                </Link>
                <span className="inline-flex items-center gap-2 rounded-full border border-dashed border-cream/30 px-3 py-2 text-xs font-semibold text-cream/80">
                  <Tag size={13} /> {campaign.code}
                </span>
              </div>
              <p className="mt-3 text-xs text-cream/50">{campaign.codeNote}</p>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
