import Image from 'next/image';
import { Instagram } from 'lucide-react';
import { SectionHeading, Reveal } from '@/components/ui/Reveal';

const artwork = ['inawera-vanilla', 'tfa-caramel', 'tfa-cucumber', 'inawera-miss-cream', 'tfa-passion-fruit', 'inawera-biscuit', 'tfa-citrus-punch', 'inawera-creme-brulee'];
const captions = ['Vanilya', 'Karamel', 'Salatalık', 'Krema', 'Çarkıfelek meyvesi', 'Bisküvi', 'Turunçgil', 'Crème Brûlée'];

export function InstagramFeed() {
  return (
    <section className="section container-page">
      <SectionHeading
        eyebrow="Görsel Dünya"
        title="Mixle atmosferi"
        description="Markanın renk ve doku dünyasından kareler. (Bu galeri site içindir; harici bağlantı içermez.)"
      />

      <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Reveal key={i} delay={(i % 4) * 0.05}>
            <figure className="group relative aspect-square overflow-hidden rounded-xl border border-purple-100">
              <Image
                src={`/images/showcase/${artwork[i]}.webp`}
                alt={captions[i]}
                fill
                sizes="(max-width:640px) 50vw, 25vw"
                className="object-contain bg-white transition-transform duration-700 group-hover:scale-110"
              />
              <figcaption className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 bg-gradient-to-t from-purple-900/80 to-transparent p-3 text-[11px] font-medium text-cream opacity-0 transition-opacity group-hover:opacity-100">
                <Instagram size={12} /> {captions[i]}
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
