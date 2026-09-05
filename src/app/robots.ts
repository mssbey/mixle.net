import type { MetadataRoute } from 'next';
import { site } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/sepet', '/hesabim', '/siparis', '/favoriler', '/arama', '/admin', '/api/'],
    },
    sitemap: `${site.domain}/sitemap.xml`,
    host: site.domain,
  };
}
