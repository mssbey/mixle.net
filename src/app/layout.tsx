import type { Metadata, Viewport } from 'next';
import { fontSans, fontDisplay, fontScript } from './fonts';
import './globals.css';
import { MotionProvider } from '@/components/motion';
import { LayoutFrame } from '@/components/layout/LayoutFrame';
import { getTaxonomy } from '@/data/categories';
import { JsonLd, organizationJsonLd, webSiteJsonLd } from '@/lib/seo';
import { site } from '@/lib/site';

export const metadata: Metadata = {
  metadataBase: new URL(site.domain),
  title: {
    default: 'Nefis Aroma — Her Damlasında Yeni Bir Deneyim',
    template: '%s | Nefis Aroma',
  },
  description: site.description,
  applicationName: site.name,
  keywords: ['aroma', 'esans', 'DIY kit', 'nbase', 'aroma konsantresi', 'Nefis Aroma'],
  authors: [{ name: site.name }],
  
  openGraph: {
    type: 'website',
    locale: 'tr_TR',
    url: site.domain,
    siteName: site.name,
    title: 'Nefis Aroma — Her Damlasında Yeni Bir Deneyim',
    description: site.description,
    images: [{ url: '/images/nefisaroma/hero/aroma-dunyasi.webp', width: 1600, height: 1067, alt: 'Nefis Aroma' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nefis Aroma',
    description: site.description,
    images: ['/images/og.webp'],
  },
  icons: {
    icon: [
      { url: '/brand/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/brand/favicon-16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: '/brand/apple-touch-icon.png',
  },
  manifest: '/manifest.webmanifest',
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#FAF7F2',
  colorScheme: 'light',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Kategori/koleksiyon listesi küçüktür (~10 KB) ve neredeyse her client
  // bileşeni ister; bu yüzden tek seferde sunucuda okunup context'e verilir.
  const { categories, collections } = await getTaxonomy();

  return (
    <html lang="tr" className={`${fontSans.variable} ${fontDisplay.variable} ${fontScript.variable}`}>
      <body className="min-h-dvh bg-cream font-sans text-ink antialiased">
        <JsonLd data={organizationJsonLd()} />
        <JsonLd data={webSiteJsonLd()} />
        <MotionProvider>
          <LayoutFrame categories={categories} collections={collections}>
            {children}
          </LayoutFrame>
        </MotionProvider>
      </body>
    </html>
  );
}
