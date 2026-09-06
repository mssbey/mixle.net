import { Compass } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { ProductRail } from '@/components/product/ProductRail';
import { getBestSellers } from '@/data/products';

export default async function NotFound() {
  const bestSellers = await getBestSellers();
  return (
    <div className="container-page section !pt-16 text-center">
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-purple-50 text-purple-600">
        <Compass size={30} strokeWidth={1.6} />
      </span>
      <p className="mt-6 font-display text-6xl font-semibold text-purple-900">404</p>
      <h1 className="mt-2 text-display-sm">Bu sayfa bulunamadı</h1>
      <p className="mx-auto mt-3 max-w-md text-ink-soft">
        Aradığınız sayfa taşınmış veya kaldırılmış olabilir. Aşağıdan aromaları keşfetmeye devam edebilirsiniz.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/">Ana sayfaya dön</ButtonLink>
        <ButtonLink href="/urunler" variant="ghost">
          Tüm aromalar
        </ButtonLink>
      </div>

      <div className="mt-16 text-left">
        <h2 className="font-display text-xl font-semibold text-purple-900">Bunlar ilginizi çekebilir</h2>
        <div className="mt-6">
          <ProductRail products={bestSellers.slice(0, 8)} />
        </div>
      </div>
    </div>
  );
}
