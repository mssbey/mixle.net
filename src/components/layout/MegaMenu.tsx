'use client';

import Link from 'next/link';
import Image from 'next/image';
import { m } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { buildMegaMenuColumns, buildMegaMenuCollections } from '@/data/nav';
import { useTaxonomy } from '@/components/catalog/CatalogProvider';

export function MegaMenu({ onNavigate }: { onNavigate: () => void }) {
  const { categories, collections } = useTaxonomy();
  const megaMenuColumns = buildMegaMenuColumns(categories);
  const megaMenuCollections = buildMegaMenuCollections(collections);
  const hasCollections = megaMenuCollections.length > 0;

  return (
    <m.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      // Tam genişlik değil: "Tüm Kategoriler" butonunun altında açılan dar kutu.
      className="pointer-events-none absolute inset-x-0 top-full z-50"
    >
      <div className="container-page">
        <div className="pointer-events-auto grid max-h-[calc(100dvh-180px)] w-full gap-5 overflow-y-auto overscroll-contain rounded-b-lg border border-t-0 border-line bg-white p-5 shadow-lift"
          style={{ maxWidth: hasCollections ? 920 : 700, gridTemplateColumns: hasCollections ? '1fr 220px' : '1fr' }}
        >
        <div className="grid grid-cols-3 gap-4">
          {megaMenuColumns.map((col) => (
            <div key={col.heading}>
              <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-soft">
                {col.heading}
              </h3>
              <ul className="space-y-0.5">
                {col.links.map((l) => (
                  <li key={l.href + l.label}>
                    <Link
                      href={l.href}
                      onClick={onNavigate}
                      className="group flex flex-col rounded-md px-2 py-1 transition-colors hover:bg-mist"
                      style={
                        'depth' in l && l.depth ? { paddingLeft: 8 + l.depth * 12 } : undefined
                      }
                    >
                      <span
                        className={
                          'depth' in l && l.depth
                            ? 'text-sm font-medium text-ink-soft group-hover:text-brand-500'
                            : 'text-sm font-semibold text-ink group-hover:text-brand-500'
                        }
                      >
                        {'depth' in l && l.depth ? (
                          <span aria-hidden="true" className="mr-1 text-line">
                            └
                          </span>
                        ) : null}
                        {l.label}
                      </span>
                      {'hint' in l && l.hint && !('depth' in l && l.depth) && (
                        <span className="text-xs text-ink-soft">{l.hint}</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {hasCollections && (
        <div>
          <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-soft">
            Öne Çıkan Koleksiyonlar
          </h3>
          <div className="grid gap-2">
            {megaMenuCollections.map((c) => (
              <Link
                key={c.href}
                href={c.href}
                onClick={onNavigate}
                className="group relative flex items-center gap-3 overflow-hidden rounded-md border border-line bg-white p-2 transition-shadow hover:shadow-soft"
              >
                <Image
                  src={c.cover}
                  alt=""
                  width={56}
                  height={44}
                  className="h-11 shrink-0 rounded object-contain bg-white"
                  style={{ width: 56 }}
                />
                <div className="min-w-0">
                  <p className="flex items-center gap-1 text-sm font-semibold text-ink">
                    {c.label}
                    <ArrowUpRight
                      size={14}
                      className="text-brand-500 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    />
                  </p>
                  <p className="truncate text-xs text-ink-soft">{c.subtitle}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
        )}
        </div>
      </div>
    </m.div>
  );
}
