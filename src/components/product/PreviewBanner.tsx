import Link from 'next/link';
import { Eye, PencilLine, X } from 'lucide-react';
import type { ProductStatus } from '@/types/admin';
import { statusLabels } from '@/types/admin';
import { editorPath, previewExitPath } from '@/lib/admin/preview';

/**
 * Panelden açılan vitrin önizlemesinde sayfanın üstünde duran şerit.
 * Yalnızca Draft Mode açıkken render edilir; müşteri asla görmez.
 */
export function PreviewBanner({ slug, status }: { slug: string; status: ProductStatus }) {
  const live = status === 'yayında';
  const editor = editorPath(slug);
  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-[90] -mx-4 mb-4 border-b border-amber-300/70 bg-amber-50/95 px-4 py-2 text-[13px] text-amber-950 shadow-[0_1px_0_rgba(0,0,0,0.04)] backdrop-blur sm:-mx-6 sm:px-6"
    >
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-4 gap-y-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
          <Eye size={12} strokeWidth={2.5} /> Önizleme
        </span>
        <span className="min-w-0 flex-1">
          {live ? (
            <>
              Bu ürün <strong>yayında</strong>; önbellek atlanarak en güncel hâli gösteriliyor.
            </>
          ) : (
            <>
              Bu ürün <strong>{statusLabels[status].toLocaleLowerCase('tr-TR')}</strong> durumunda —
              yalnızca siz görüyorsunuz, müşteriler için bu adres bulunamaz.
            </>
          )}
        </span>
        <span className="flex items-center gap-2">
          <Link
            href={editor}
            className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-white px-3 py-1 text-[12px] font-semibold text-amber-950 transition hover:border-amber-500"
          >
            <PencilLine size={13} /> Panelde düzenle
          </Link>
          <a
            href={previewExitPath(live ? `/urun/${encodeURIComponent(slug)}` : editor)}
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold text-amber-900 transition hover:bg-amber-100"
          >
            <X size={13} /> Önizlemeden çık
          </a>
        </span>
      </div>
    </div>
  );
}
