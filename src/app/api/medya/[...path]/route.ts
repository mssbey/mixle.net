// Panelden yüklenen medyayı (`data/uploads/`) servis eder. Kimlik doğrulama
// GEREKMEZ — bu dosyalar ürün/kampanya görselleri gibi herkese açık vitrin
// içeriğidir (bkz. `server/media/admin.ts` başındaki not: `public/` yerine
// burada servis edilmesinin nedeni `next start`'ın çalışma zamanında eklenen
// `public/` dosyalarını sunmaması).

import { readFile, stat } from 'node:fs/promises';
import { resolveUploadDiskPath } from '@/server/media/admin';

export const dynamic = 'force-dynamic';

const MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
  svg: 'image/svg+xml',
};

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(_request: Request, { params }: Ctx): Promise<Response> {
  const { path: segments } = await params;
  const abs = resolveUploadDiskPath(segments);
  if (!abs) return new Response('Not found', { status: 404 });

  try {
    const info = await stat(abs);
    if (!info.isFile()) return new Response('Not found', { status: 404 });
    const buffer = await readFile(abs);
    const ext = segments[segments.length - 1].split('.').pop()?.toLowerCase() ?? '';
    const contentType = MIME_BY_EXT[ext] ?? 'application/octet-stream';
    return new Response(new Uint8Array(buffer), {
      headers: {
        'content-type': contentType,
        // Dosya adı rastgele son ek taşır (bkz. uploadMediaAsset) — aynı yol
        // her zaman aynı içeriktir, uzun süre önbelleklenebilir.
        'cache-control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
