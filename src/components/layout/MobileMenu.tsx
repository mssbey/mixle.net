'use client';

import Link from 'next/link';
import { useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { ChevronDown, Phone, MessageCircle } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { useTaxonomy } from '@/components/catalog/CatalogProvider';
import { site } from '@/lib/site';

const flat = [
  { label: 'Yeni Gelenler', href: '/yeni-gelenler' },
  { label: 'Çok Satanlar', href: '/cok-satanlar' },
  { label: 'Kampanyalar', href: '/kampanyalar' },
  { label: 'Aroma Rehberi', href: '/aroma-rehberi' },
  { label: 'Hakkımızda', href: '/hakkimizda' },
  { label: 'İletişim', href: '/iletisim' },
];

export function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { categories, collections } = useTaxonomy();
  const [catOpen, setCatOpen] = useState(true);

  return (
    <Drawer open={open} onClose={onClose} label="Menü" side="left" title="Menü">
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        <Link
          href="/urunler"
          onClick={onClose}
          className="block rounded-xl bg-purple-50 px-3 py-3 text-sm font-semibold text-purple-800"
        >
          Tüm Aromalar
        </Link>

        <div className="mt-2">
          <button
            type="button"
            onClick={() => setCatOpen((v) => !v)}
            aria-expanded={catOpen}
            className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-sm font-semibold text-purple-800"
          >
            Kategoriler
            <ChevronDown size={16} className={catOpen ? 'rotate-180 text-gold-400 transition-transform' : 'text-gold-400 transition-transform'} />
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
                {categories.map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={`/kategori/${c.slug}`}
                      onClick={onClose}
                      className="block rounded-lg px-3 py-2.5 text-sm text-ink-soft hover:bg-purple-50 hover:text-purple-700"
                    >
                      {c.name}
                    </Link>
                  </li>
                ))}
              </m.ul>
            )}
          </AnimatePresence>
        </div>

        <div className="my-2 border-t border-purple-100" />
        <ul>
          {flat.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                onClick={onClose}
                className="block rounded-xl px-3 py-3 text-sm font-semibold text-purple-800 hover:bg-purple-50"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="my-2 border-t border-purple-100" />
        <p className="px-3 pt-2 text-xs font-semibold uppercase tracking-wide text-gold-500">Koleksiyonlar</p>
        <ul>
          {collections.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/koleksiyon/${c.slug}`}
                onClick={onClose}
                className="block rounded-xl px-3 py-2.5 text-sm text-ink-soft hover:bg-purple-50"
              >
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="grid grid-cols-2 gap-2 border-t border-purple-100 p-3">
        <a href={site.contact.phoneUrl} className="btn-ghost text-xs">
          <Phone size={14} /> Ara
        </a>
        <a href={site.contact.whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost text-xs">
          <MessageCircle size={14} /> WhatsApp
        </a>
      </div>
    </Drawer>
  );
}
