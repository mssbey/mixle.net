import type { MetadataRoute } from 'next';
import { site } from '@/lib/site';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.name,
    short_name: site.shortName,
    description: site.description,
    start_url: '/',
    display: 'standalone',
    background_color: '#FFFFFF',
    theme_color: '#0F1729',
    lang: 'tr-TR',
    icons: [
      { src: '/brand/logo.png', sizes: '185x84', type: 'image/png' },
    ],
  };
}
