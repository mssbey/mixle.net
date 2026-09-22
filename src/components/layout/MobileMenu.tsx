'use client';

import Link from 'next/link';
import { useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { ChevronDown, Phone, MessageCircle } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { Logo } from './Logo';
import { useTaxonomy } from '@/components/catalog/CatalogProvider';
import { flattenCategoryTree, mobileMenuLinks } from '@/data/nav';
import type { StorefrontContact } from '@/lib/storefront';

export function MobileMenu({
  open,
  onClose,
  contact,
}: {
  open: boolean;
  onClose: () => void;
  contact: StorefrontContact;
}) {
  const { categories, collections } = useTaxonomy();
  const [catOpen, setCatOpen] = useState(true);

  return (
    <Drawer open={open} onClose={onClose} label="Menü" side="left" title={<Logo onNavigate={onClose} />}>
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        <Link
          href="/urunler"
          onClick={onClose}
          className="block rounded-md bg-brand-500 px-3 py-3 text-sm font-bold uppercase tracking-wide text-white"
        >
          Tüm Kategoriler
        </Link>

        <div className="mt-2">
          <button
            type="button"
            onClick={() => setCatOpen((v) => !v)}
            aria-expanded={catOpen}
            className="flex w-full items-center justify-between rounded-md px-3 py-3 text-sm font-semibold text-ink"
          >
            Kategoriler
            <ChevronDown
              size={16}
              className={catOpen ? 'rotate-180 text-brand-500 transition-transform' : 'text-brand-500 transition-transform'}
            />
          </button>
          <AnimatePresence initial={false}>
            {catOpen && (
              <m.ul
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden pl-3"
              >
                {/* Alt kategoriler üstlerinin hemen altında girintili listelenir. */}
                {flattenCategoryTree(categories).map(({ category: c, depth }) => (
                  <li key={c.slug}>
                    <Link
                      href={`/kategori/${c.slug}`}
                      onClick={onClose}
                      className="block rounded-md px-3 py-2.5 text-sm text-ink-soft hover:bg-mist hover:text-brand-500"
                      style={{ paddingLeft: 12 + depth * 14 }}
                    >
                      {depth > 0 && <span aria-hidden="true" className="mr-1 text-line">└</span>}
                      {c.name}
                    </Link>
                  </li>
                ))}
              </m.ul>
            )}
          </AnimatePresence>
        </div>

        <div className="my-2 border-t border-line" />
        <ul>
          {mobileMenuLinks.map((l) => (
            <li key={l.href + l.label}>
              <Link
                href={l.href}
                onClick={onClose}
                className="block rounded-md px-3 py-3 text-sm font-semibold text-ink hover:bg-mist hover:text-brand-500"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        {collections.length > 0 && (
          <>
            <div className="my-2 border-t border-line" />
            <p className="px-3 pt-2 text-[11px] font-bold uppercase tracking-wide text-ink-soft">
              Koleksiyonlar
            </p>
            <ul>
              {collections.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/koleksiyon/${c.slug}`}
                    onClick={onClose}
                    className="block rounded-md px-3 py-2.5 text-sm text-ink-soft hover:bg-mist"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </nav>

      <div className="border-t border-line p-3">
        <div className="grid grid-cols-2 gap-2">
          <a href={contact.phoneUrl} className="btn-ghost text-xs">
            <Phone size={14} /> Ara
          </a>
          <a
            href={contact.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost text-xs"
          >
            <MessageCircle size={14} /> WhatsApp
          </a>
        </div>
        <p className="mt-2 text-center text-[11px] text-ink-soft">{contact.workingHours}</p>
      </div>
    </Drawer>
  );
}
