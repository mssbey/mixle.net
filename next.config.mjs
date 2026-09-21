/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // iyzipay kaynak modellerini çalışma anında dizinden okur; paketlenmeden Node require'ı ile yüklensin.
  serverExternalPackages: ['iyzipay'],
  images: {
    formats: ['image/avif', 'image/webp'],
    // Panelden yüklenen ürün görselleri (Vercel Blob) — bkz. server/media/admin.ts
    remotePatterns: [{ protocol: 'https', hostname: '*.public.blob.vercel-storage.com' }],
    // Yalnızca kendi markamıza ait, güvenilir SVG'ler kullanılıyor.
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|png|webp|avif|woff2)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};

export default nextConfig;
