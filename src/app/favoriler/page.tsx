import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { FavoritesView } from './FavoritesView';

export const metadata: Metadata = {
  title: 'Favorilerim',
  robots: { index: false, follow: true },
};

export default function FavoritesPage() {
  return (
    <div className="container-page section !pt-6">
      <Breadcrumbs items={[{ label: 'Favorilerim' }]} />
      <h1 className="mt-3 text-2xl font-bold text-ink sm:text-3xl">Favorilerim</h1>
      <div className="mt-6">
        <FavoritesView />
      </div>
    </div>
  );
}
