import { site } from '@/lib/site';
import type { Product } from '@/types';

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: site.name,
    url: site.domain,
    logo: `${site.domain}/brand/logo.png`,
  };
}

export function webSiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: site.name,
    url: site.domain,
    inLanguage: 'tr-TR',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${site.domain}/arama?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

/** `categoryName` çağıran sunucu bileşeninden gelir (veri katmanı sunucu-only). */
export function productJsonLd(product: Product, categoryName?: string) {
  const catName = categoryName ?? 'Aroma';
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.shortDescription,
    category: catName,
    sku: product.variants[0]?.sku,
    brand: { '@type': 'Brand', name: site.name },
    image: product.gallery.map((g) => `${site.domain}${g.src}`),
  };
}

export function breadcrumbJsonLd(items: { name: string; href?: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [{ name: 'Ana Sayfa', href: '/' }, ...items].map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      ...(c.href ? { item: `${site.domain}${c.href}` } : {}),
    })),
  };
}

export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
