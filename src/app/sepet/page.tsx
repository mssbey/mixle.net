import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { CartView } from './CartView';

export const metadata: Metadata = {
  title: 'Sepetim',
  robots: { index: false, follow: true },
};

export default function CartPage() {
  return (
    <div className="container-page section !pt-6">
      <Breadcrumbs items={[{ label: 'Sepetim' }]} />
      <h1 className="mt-3 text-2xl font-bold text-ink sm:text-3xl">Sepetim</h1>
      <div className="mt-6">
        <CartView />
      </div>
    </div>
  );
}
