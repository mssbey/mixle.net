import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { aboutTimeline, aboutValues } from '@/data/content';
import { site } from '@/lib/site';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Reveal, SectionHeading } from '@/components/ui/Reveal';

export const metadata: Metadata = {
  title: 'Hakkımızda',
  description: 'Mixle’nın hikâyesi, değerleri ve ürün geliştirme yaklaşımı.',
  alternates: { canonical: '/hakkimizda' },
};

export default function AboutPage() {
  return (
    <div>
      <section className="surface-dark relative overflow-hidden">
        <div className="grain absolute inset-0" aria-hidden />
        <Image src="/images/showcase/tfa-passion-fruit.webp" alt="" fill sizes="100vw" priority className="object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-r from-purple-900 via-purple-900/85 to-purple-900/45" />
        <div className="container-page relative py-20 sm:py-28">
          <Breadcrumbs items={[{ label: 'Hakkımızda' }]} className="[&_*]:text-cream/70 [&_span[aria-current]]:text-cream" />
          <h1 className="mt-6 max-w-xl font-display text-4xl font-semibold text-cream sm:text-5xl">
            Doğadan ilham, dengeli formülasyon
          </h1>
          <p className="mt-4 max-w-lg text-cream/75">
            Mixle, tanıdık tatları özenle kurgulanmış, dengeli aroma profillerine dönüştürmeyi amaçlar.
          </p>
        </div>
      </section>

      <section className="container-page section">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <Reveal>
            <SectionHeading
              eyebrow="Marka Hikâyesi"
              title="Bir tarifin arkasındaki fikir"
              description="Mixle, meyve, tatlı, içecek ve tütün dünyasından aldığı ilhamı; ölçülü, tekrarlanabilir ve şeffaf bir aroma kataloğuna dönüştürme fikriyle yola çıktı. Her profil, tek bir notayı abartmak yerine tatlılık, ferahlık ve yoğunluğu birlikte dengelemeyi hedefler."
            />
          </Reveal>
          <Reveal delay={0.1} className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-card)]">
            <Image src="/images/showcase/inawera-vanilla.webp" alt="" fill sizes="(max-width:1024px) 100vw, 50vw" className="object-cover" />
          </Reveal>
        </div>
      </section>

      <section className="section surface-lavender">
        <div className="container-page">
          <SectionHeading eyebrow="Değerlerimiz" title="Bize yön veren dört ilke" align="center" />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {aboutValues.map((v, i) => (
              <Reveal key={v.title} delay={i * 0.05} className="rounded-[var(--radius-card)] border border-purple-100 bg-white p-6">
                <h3 className="font-display text-lg font-semibold text-purple-900">{v.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{v.text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page section">
        <SectionHeading eyebrow="Zaman Çizelgesi" title="Buraya nasıl geldik" />
        <div className="mt-10 space-y-8 border-l border-purple-200 pl-6">
          {aboutTimeline.map((t, i) => (
            <Reveal key={t.title} delay={i * 0.05} className="relative">
              <span className="absolute -left-[31px] top-1 h-3 w-3 rounded-full border-2 border-gold-400 bg-cream" />
              <p className="text-xs font-semibold uppercase tracking-wide text-gold-500">{t.year}</p>
              <h3 className="mt-1 font-display text-lg font-semibold text-purple-900">{t.title}</h3>
              <p className="mt-1 max-w-xl text-sm text-ink-soft">{t.text}</p>
            </Reveal>
          ))}
        </div>
        <p className="mt-6 max-w-xl text-xs text-ink-soft/70">
          * Yıllar kurumsal onay bekleyen placeholder değerlerdir; doğrulanmamış kuruluş tarihi veya kapasite
          bilgisi içermez.
        </p>
      </section>

      <section className="container-page section !pt-0">
        <Reveal className="relative overflow-hidden rounded-[var(--radius-card)] surface-dark p-10 text-center sm:p-16">
          <div className="grain absolute inset-0" aria-hidden />
          <div className="relative">
            <h2 className="font-display text-2xl font-semibold text-cream sm:text-3xl">Sorularınız mı var?</h2>
            <p className="mx-auto mt-3 max-w-md text-cream/70">
              Ürünler, kullanım veya iş birlikleri hakkında bize ulaşın.
            </p>
            <Link href="/iletisim" className="btn-gold mt-6 inline-flex">
              İletişime geç <ArrowRight size={16} />
            </Link>
            <p className="mt-4 text-xs text-cream/40">
              İletişim bilgileri {site.contact.email} / {site.contact.phone} — örnek placeholder.
            </p>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
