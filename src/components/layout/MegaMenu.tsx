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

  return (
    <m.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="absolute inset-x-0 top-full z-50 border-t border-line bg-white shadow-lift"
    >
      <div className="container-page grid grid-cols-1 gap-8 py-8 lg:grid-cols-[2.4fr_1.6fr]">
        <div className="grid grid-cols-3 gap-6">
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
                      className="group flex flex-col rounded-md px-2 py-1.5 transition-colors hover:bg-mist"
                    >
                      <span className="text-sm font-semibold text-ink group-hover:text-brand-500">
                        {l.label}
                      </span>
                      {'hint' in l && l.hint && (
                        <span className="text-xs text-ink-soft">{l.hint}</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div>
          <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-soft">
            Öne Çıkan Koleksiyonlar
          </h3>
          <div className="grid gap-2.5">
            {megaMenuCollections.map((c) => (
              <Link
                key={c.href}
                href={c.href}
                onClick={onNavigate}
                className="group relative flex items-center gap-4 overflow-hidden rounded-md border border-line bg-white p-2.5 transition-shadow hover:shadow-soft"
              >
                <Image
                  src={c.cover}
                  alt=""
                  width={88}
                  height={64}
                  className="h-16 shrink-0 rounded object-cover"
                  style={{ width: 88 }}
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
      </div>
    </m.div>
  );
}
