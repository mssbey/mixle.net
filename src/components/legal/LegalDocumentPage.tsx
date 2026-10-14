// Panelde sürümlü tutulan yasal belgenin vitrin sayfası.

import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { LegalText } from './LegalText';

export function LegalDocumentPage({ doc }: { doc: { title: string; version: number; body: string } }) {
  return (
    <div className="container-page section !pt-8">
      <Breadcrumbs items={[{ label: doc.title }]} />
      <article className="mx-auto mt-6 max-w-3xl">
        <h1 className="text-display-sm text-purple-900">{doc.title}</h1>
        <p className="mt-1 text-xs text-ink-soft">Sürüm {doc.version}</p>
        <LegalText body={doc.body} skipTitle className="mt-8" />
      </article>
    </div>
  );
}
