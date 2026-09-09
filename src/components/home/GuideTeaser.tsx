import Image from 'next/image';
import Link from 'next/link';
import { Beaker, Droplets, Timer, Archive, ArrowRight } from 'lucide-react';
import { SectionHeading, Reveal } from '@/components/ui/Reveal';

const cards = [
  {
    icon: Droplets,
    slug: 'tat-profili-okuma',
    title: 'Tat profili nasıl okunur?',
    text: 'Tatlılık, ferahlık, yoğunluk, ekşilik ve kremsilik göstergeleri ne anlatır?',
  },
  {
    icon: Beaker,
    slug: 'aroma-turleri',
    title: 'Aroma oranı ve karışım',
    text: 'Konsantre, shortfill, mix ve baz arasındaki farklar; hangi oranla başlanır?',
  },
  {
    icon: Timer,
    slug: 'bekleme-suresi',
    title: 'Bekleme / demlenme süresi',
    text: 'Tarifin oturması için neden zaman gerekir, hangi profil ne kadar sürede olgunlaşır?',
  },
  {
    icon: Archive,
    slug: 'saklama',
    title: 'Doğru saklama',
    text: 'Işık, ısı ve hava temasının aroma üzerindeki etkisi ve saklama önerileri.',
  },
];

export function GuideTeaser() {
  return (
    <section className="section surface-lavender">
      <div className="container-page">
        <SectionHeading
          eyebrow="Aroma Rehberi"
          title="Doğru seçim için kısa notlar"
          description="Tat notalarını tanı, seçenekleri karşılaştır. Kullanım uygunluğu ve oranlar için ürünün resmi teknik bilgileri esas alınır."
        />

        <div className="relative mt-8 h-56 overflow-hidden rounded-2xl sm:h-72"><Image src="/images/nefisaroma/guide/tat-notalari.webp" alt="Tat notalarını temsil eden meyve, nane, vanilya ve cam kaplar" fill sizes="(max-width:1360px) 100vw, 1300px" className="object-cover" /></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c, i) => (
            <Reveal key={c.slug} delay={i * 0.05}>
              <Link
                href={`/aroma-rehberi#${c.slug}`}
                className="group flex h-full flex-col rounded-[var(--radius-card)] border border-line bg-white p-5 shadow-soft transition-shadow hover:shadow-lift"
              >
                <span className="grid h-11 w-11 place-items-center rounded-full bg-mist text-brand-500">
                  <c.icon size={20} strokeWidth={1.6} />
                </span>
                <h3 className="mt-4 text-base font-semibold text-ink">{c.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-soft">{c.text}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-ink">
                  Oku <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
