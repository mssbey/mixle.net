'use client';

// Client bileşenleri için katalog erişimi.
//
// İKİ KATMAN:
//  1. Taksonomi (kategoriler + koleksiyonlar) — küçüktür (~10 KB), kök
//     layout'tan sunucu tarafında geçilir, anında hazırdır.
//  2. Ürünler — büyüktür; yalnızca gerçekten ihtiyaç duyan bileşen
//     `useSlimProducts()` çağırdığında `/api/catalog/slim` üzerinden bir kez
//     çekilir ve modül düzeyinde paylaşılır.
//
// Böylece katalog artık istemci paketine gömülmez.

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Category, Collection, Product } from '@/types';

interface Taxonomy {
  categories: Category[];
  collections: Collection[];
}

const TaxonomyContext = createContext<Taxonomy>({ categories: [], collections: [] });

export function CatalogProvider({
  categories,
  collections,
  children,
}: Taxonomy & { children: ReactNode }) {
  return (
    <TaxonomyContext.Provider value={{ categories, collections }}>
      {children}
    </TaxonomyContext.Provider>
  );
}

/** Kategoriler ve koleksiyonlar — her zaman doludur, yükleme durumu yoktur. */
export function useTaxonomy(): Taxonomy {
  return useContext(TaxonomyContext);
}

export function useCategories(): Category[] {
  return useContext(TaxonomyContext).categories;
}

export function useCollections(): Collection[] {
  return useContext(TaxonomyContext).collections;
}

// --------------------------------------------------------- ürün listesi ----

// Tek uçuş: kaç bileşen isterse istesin ağ isteği bir kez yapılır ve sonuç
// paylaşılır. Sayfa ömrü boyunca geçerlidir.
let productsPromise: Promise<Product[]> | null = null;

function loadProducts(): Promise<Product[]> {
  productsPromise ??= fetch('/api/catalog/slim')
    .then((res) => {
      if (!res.ok) throw new Error(`Katalog yüklenemedi (${res.status})`);
      return res.json() as Promise<{ products: Product[] }>;
    })
    .then((data) => data.products)
    .catch((err) => {
      // Sonraki denemede yeniden istensin diye önbelleği temizle.
      productsPromise = null;
      throw err;
    });
  return productsPromise;
}

export interface SlimProductsState {
  products: Product[];
  loading: boolean;
  error: string | null;
}

/**
 * Ürün listesini talep üzerine yükler. Kimliğe göre ürün çözmesi gereken
 * client bileşenleri (sepet, favoriler, arama, son görüntülenenler) kullanır.
 *
 * `enabled=false` iken hiç istek yapılmaz. Her sayfada gömülü duran ama nadiren
 * açılan bileşenler (sepet çekmecesi, arama katmanı) bunu kullanır — aksi halde
 * katalog her sayfa yüklemesinde boşuna indirilirdi.
 */
export function useSlimProducts(enabled = true): SlimProductsState {
  const [state, setState] = useState<SlimProductsState>({
    products: [],
    loading: enabled,
    error: null,
  });

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    setState((s) => (s.products.length ? s : { ...s, loading: true }));
    loadProducts()
      .then((products) => {
        if (alive) setState({ products, loading: false, error: null });
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setState({
          products: [],
          loading: false,
          error: err instanceof Error ? err.message : 'Katalog yüklenemedi',
        });
      });
    return () => {
      alive = false;
    };
  }, [enabled]);

  return state;
}
