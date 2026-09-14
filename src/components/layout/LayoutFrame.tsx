'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useIsHome } from '@/lib/hooks';
import type { Category, Collection } from '@/types';
import type { StorefrontContact } from '@/lib/storefront';
import { CatalogProvider } from '@/components/catalog/CatalogProvider';
import { Header } from '@/components/layout/Header';
import { HomeFooter } from '@/components/layout/HomeFooter';
import { Footer } from '@/components/layout/Footer';
import { MobileTabBar } from '@/components/layout/MobileTabBar';
import { CartDrawer } from '@/components/layout/CartDrawer';
import { SearchOverlay } from '@/components/layout/SearchOverlay';
import { Toaster } from '@/components/layout/Toaster';
import { WhatsAppFab } from '@/components/layout/WhatsAppFab';

/**
 * Vitrin çerçevesi (header/footer/drawer'lar) yalnızca vitrin rotalarında görünür.
 * /admin altında panel kendi yerleşimini kullanır.
 */
export function LayoutFrame({
  categories,
  collections,
  contact,
  children,
}: {
  categories: Category[];
  collections: Collection[];
  contact: StorefrontContact;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const isHome = useIsHome();
  const isAdmin = pathname?.startsWith('/admin');

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <CatalogProvider categories={categories} collections={collections}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        İçeriğe geç
      </a>
      <Header contact={contact} />
      <main id="main" className="pb-16 lg:pb-0">
        {children}
      </main>
      {isHome ? <HomeFooter contact={contact} /> : <Footer contact={contact} />}
      <MobileTabBar />
      <CartDrawer />
      <SearchOverlay />
      <WhatsAppFab alwaysVisible={isHome} href={isHome ? `https://wa.me/${contact.phone.replace(/\D/g, '').replace(/^0/, '90')}` : undefined} />
      <Toaster />
    </CatalogProvider>
  );
}
