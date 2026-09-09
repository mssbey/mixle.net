import type { Metadata, Viewport } from 'next';
import { fontSans, fontDisplay, fontScript } from './fonts';
import './globals.css';
import { MotionProvider } from '@/components/motion';
import { LayoutFrame } from '@/components/layout/LayoutFrame';
import { getTaxonomy } from '@/data/categories';
import { JsonLd, organizationJsonLd, webSiteJsonLd } from '@/lib/seo';
import { site } from '@/lib/site';
import { getStoreInfo } from '@/server/settings';
import { resolveStorefrontContact } from '@/lib/storefront';

export const metadata: Metadata = {
  metadataBase: new URL(site.domain),
  title: {
    default: 'Mixle Lezzet Sepeti — Her Damlasında Yeni Bir Deneyim',
    template: '%s | Mixle Lezzet Sepeti',
  },
  description: site.description,
  applicationName: site.name,
  keywords: ['aroma', 'esans', 'DIY kit', 'nbase', 'aroma konsantresi', 'Mixle', 'Mixle Lezzet Sepeti'],
  authors: [{ name: site.name }],

  openGraph: {
    type: 'website',
    locale: 'tr_TR',
    url: site.domain,
    siteName: site.name,
    title: 'Mixle Lezzet Sepeti — Her Damlasında Yeni Bir Deneyim',
    description: site.description,
    images: [{ url: '/images/showcase/tfa-passion-fruit.webp', width: 800, height: 800, alt: 'Mixle Lezzet Sepeti aroma görseli' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mixle Lezzet Sepeti',
    description: site.description,
    images: ['/brand/logo.png'],
  },
  icons: {
    icon: [
      { url: '/brand/logo.png', sizes: '185x84', type: 'image/png' },
    ],
    apple: '/brand/logo.png',
  },
  manifest: '/manifest.webmanifest',
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#FFFFFF',
  colorScheme: 'light',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Kategori/koleksiyon listesi küçüktür (~10 KB) ve neredeyse her client
  // bileşeni ister; bu yüzden tek seferde sunucuda okunup context'e verilir.
  const [{ categories, collections }, storeInfo] = await Promise.all([
    getTaxonomy(),
    getStoreInfo(),
  ]);
  const contact = resolveStorefrontContact(storeInfo);

  return (
    <html lang="tr" className={`${fontSans.variable} ${fontDisplay.variable} ${fontScript.variable}`}>
      <body className="min-h-dvh bg-cream font-sans text-ink antialiased">
        <JsonLd data={organizationJsonLd()} />
        <JsonLd data={webSiteJsonLd()} />
        <MotionProvider>
          <LayoutFrame categories={categories} collections={collections} contact={contact}>
            {children}
          </LayoutFrame>
        </MotionProvider>
      </body>
    </html>
  );
}
