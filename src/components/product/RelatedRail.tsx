import { ProductRail } from './ProductRail';
import type { Product } from '@/types';

export function RelatedRail({ title, products }: { title: string; products: Product[] }) {
  if (!products.length) return null;
  return (
    <section className="mt-14 border-t border-line pt-10">
      <h2 className="text-lg font-bold text-ink sm:text-xl">{title}</h2>
      <div className="mt-6">
        <ProductRail products={products} />
      </div>
    </section>
  );
}
