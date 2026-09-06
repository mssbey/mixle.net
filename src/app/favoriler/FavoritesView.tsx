'use client';

import { Heart, ShoppingBag } from 'lucide-react';
import { useFavorites } from '@/store/favorites';
import { useMounted } from '@/lib/hooks';
import { useSlimProducts } from '@/components/catalog/CatalogProvider';
import { ProductGrid } from '@/components/product/ProductGrid';
import { EmptyState } from '@/components/ui/EmptyState';
import { ButtonLink } from '@/components/ui/Button';
import { useCart } from '@/store/cart';
import { pickDefaultVariant } from '@/lib/commerce';
import { useUI } from '@/store/ui';
import { toast } from '@/store/toast';

export function FavoritesView() {
  const mounted = useMounted();
  const { ids, clear } = useFavorites();
  const add = useCart((s) => s.add);
  const openCart = useUI((s) => s.openCart);

  const { products, loading } = useSlimProducts();
  const ready = mounted && !loading;
  const favProducts = ready ? ids.map((id) => products.find((p) => p.id === id)).filter((p): p is NonNullable<typeof p> => !!p) : [];

  if (ready && favProducts.length === 0) {
    return (
      <EmptyState
        icon={Heart}
        title="Favori listeniz boş"
        description="Beğendiğiniz ürünleri kalp ikonuna tıklayarak favorilerinize ekleyin."
        action={<ButtonLink href="/urunler">Aromaları keşfet</ButtonLink>}
      />
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-soft">{favProducts.length} ürün</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              favProducts.forEach((p) => add(p.id, pickDefaultVariant(p).id, 1));
              openCart();
              toast.success('Tüm favoriler sepete eklendi');
            }}
            className="btn-ghost text-xs"
          >
            <ShoppingBag size={14} /> Tümünü sepete ekle
          </button>
          <button type="button" onClick={clear} className="text-xs font-medium text-rose-500 hover:text-rose-600">
            Listeyi temizle
          </button>
        </div>
      </div>
      <ProductGrid products={favProducts} />
    </div>
  );
}
