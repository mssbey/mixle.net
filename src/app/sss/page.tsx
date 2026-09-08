import type { Metadata } from 'next';
import { getFaqContent } from '@/server/content/settings';
import { Accordion } from '@/components/ui/Accordion';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { JsonLd } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Sıkça Sorulan Sorular',
  description: 'Ürünler, kullanım, sipariş ve gizlilik hakkında sık sorulan sorular.',
  alternates: { canonical: '/sss' },
};

export default async function FaqPage() {
  const { groups: faqGroups } = await getFaqContent();
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqGroups.flatMap((g) =>
      g.items.map((it) => ({
        '@type': 'Question',
        name: it.q,
        acceptedAnswer: { '@type': 'Answer', text: it.a },
      })),
    ),
  };

  return (
    <div className="container-page section !pt-8">
      <JsonLd data={jsonLd} />
      <Breadcrumbs items={[{ label: 'Sıkça Sorulan Sorular' }]} />
      <div className="page-intro mt-5"><h1 className="mt-4 text-display-sm">Sıkça Sorulan Sorular</h1></div>
      <p className="mt-2 max-w-2xl text-ink-soft">
        Aradığınız cevabı bulamazsanız <a href="/iletisim" className="font-semibold text-purple-700 link-underline">iletişim</a> sayfasından bize ulaşabilirsiniz.
      </p>

      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        {faqGroups.map((g) => (
          <div key={g.heading}>
            <h2 className="mb-3 font-display text-lg font-semibold text-purple-900">{g.heading}</h2>
            <Accordion items={g.items.map((it) => ({ title: it.q, content: it.a }))} />
          </div>
        ))}
      </div>
    </div>
  );
}
