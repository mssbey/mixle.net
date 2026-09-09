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
        <div className="relative overflow-hidden rounded-lg surface-dark">
          <div className="grain absolute inset-0" aria-hidden />
          <div className="absolute inset-y-0 right-0 hidden w-2/5 bg-white sm:block">
          <Image
            src={campaign.image}
            alt=""
            fill
            sizes="(max-width:1360px) 40vw, 520px"
            className="object-contain p-5"
          />
          </div>
          <div className="relative grid gap-6 px-6 py-14 sm:px-12 lg:py-20">
            <div className="max-w-lg sm:max-w-[55%]">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-white">
                {campaign.eyebrow}
              </span>
              <h2 className="mt-4 text-2xl font-bold text-white sm:text-3xl">
                {campaign.title}
              </h2>
              <p className="mt-3 text-sm text-white/75">{campaign.description}</p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link href={campaign.cta.href} className="btn-primary">
                  {campaign.cta.label} <ArrowRight size={16} />
                </Link>
                <span className="inline-flex items-center gap-2 rounded-full border border-dashed border-white/30 px-3 py-2 text-xs font-semibold text-white/85">
                  <Tag size={13} /> {campaign.code}
                </span>
              </div>
              <p className="mt-3 text-xs text-white/55">{campaign.codeNote}</p>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
