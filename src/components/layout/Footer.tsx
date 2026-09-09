'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Phone, Mail, MapPin, Clock, Instagram, Youtube, Twitter } from 'lucide-react';
import { Logo } from './Logo';
import { NewsletterForm } from './NewsletterForm';
import { footerNav } from '@/data/nav';
import { useCategories } from '@/components/catalog/CatalogProvider';
import { site } from '@/lib/site';
import type { StorefrontContact } from '@/lib/storefront';

function FooterCol({ heading, children }: { heading: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/10 py-3 md:border-0 md:py-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between text-left text-[11px] font-bold uppercase tracking-[0.14em] text-white/60 md:pointer-events-none md:mb-4"
      >
        {heading}
        <ChevronDown
          size={16}
          className={`text-white/50 transition-transform md:hidden ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <div className={`${open ? 'mt-3 block' : 'hidden'} md:!block`}>{children}</div>
    </div>
  );
}

export function Footer({ contact }: { contact: StorefrontContact }) {
  const categories = useCategories();

  return (
    <footer className="surface-dark mt-12">
      {/* Kayıt bandı */}
      <div className="border-b border-white/10">
        <div className="container-page grid gap-8 py-10 md:grid-cols-2">
          <div>
            <p className="text-sm font-semibold text-white">E-posta bülteni</p>
            <p className="mt-1 text-xs leading-5 text-white/60">
              Kampanya, duyuru ve bilgilendirmelerden e-posta ile haberdar olmak istiyorum.
            </p>
            <div className="mt-3 max-w-md">
              <NewsletterForm variant="dark" kind="eposta" />
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">SMS bilgilendirme</p>
            <p className="mt-1 text-xs leading-5 text-white/60">
              Kampanya, duyuru ve bilgilendirmelerden haberdar olmak için kayıt olun.
            </p>
            <div className="mt-3 max-w-md">
              <NewsletterForm variant="dark" kind="sms" />
            </div>
          </div>
        </div>
      </div>

      {/* Kolonlar */}
      <div className="container-page grid gap-x-8 gap-y-1 py-10 md:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div className="pb-4 md:pb-0">
          <Logo variant="light" />
          <p className="mt-4 max-w-xs text-sm leading-6 text-white/70">
            Özenle geliştirilen aroma profilleri, DIY kitleri ve baz ürünleri. Her damlasında yeni bir
            deneyim.
          </p>
          <div className="mt-4 flex items-center gap-2">
            <a
              href={site.social.instagram}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="grid h-9 w-9 place-items-center rounded-md border border-white/15 text-white/70 hover:border-white/40 hover:text-white"
            >
              <Instagram size={16} />
            </a>
            <a
              href={site.social.youtube}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="YouTube"
              className="grid h-9 w-9 place-items-center rounded-md border border-white/15 text-white/70 hover:border-white/40 hover:text-white"
            >
              <Youtube size={16} />
            </a>
            <a
              href={site.social.x}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="X"
              className="grid h-9 w-9 place-items-center rounded-md border border-white/15 text-white/70 hover:border-white/40 hover:text-white"
            >
              <Twitter size={16} />
            </a>
          </div>
        </div>

        {footerNav.map((col) => (
          <FooterCol key={col.heading} heading={col.heading}>
            <ul className="space-y-2.5">
              {col.links.map((l) => (
                <li key={l.href + l.label}>
                  <Link href={l.href} className="text-sm text-white/70 hover:text-white">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </FooterCol>
        ))}

        <FooterCol heading="Bize Ulaşın">
          <ul className="space-y-3 text-sm text-white/70">
            <li className="flex items-center gap-2.5">
              <Clock size={15} className="shrink-0 text-white/40" />
              {contact.workingHours}
            </li>
            <li>
              <a href={contact.phoneUrl} className="flex items-center gap-2.5 hover:text-white">
                <Phone size={15} className="shrink-0 text-white/40" />
                {contact.phone}
              </a>
            </li>
            <li>
              <a href={contact.emailUrl} className="flex items-center gap-2.5 hover:text-white">
                <Mail size={15} className="shrink-0 text-white/40" />
                {contact.email}
              </a>
            </li>
            <li className="flex items-start gap-2.5">
              <MapPin size={15} className="mt-0.5 shrink-0 text-white/40" />
              <span>{contact.address}</span>
            </li>
          </ul>
        </FooterCol>
      </div>

      {/* Kategori kısayolları */}
      {categories.length > 0 && (
        <div className="border-t border-white/10">
          <div className="container-page flex flex-wrap gap-x-5 gap-y-2 py-5">
            {categories.map((c) => (
              <Link
                key={c.slug}
                href={`/kategori/${c.slug}`}
                className="text-xs text-white/60 hover:text-white"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Alt bar */}
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-4 py-6 md:flex-row md:items-center md:justify-between">
          <div className="text-xs leading-5 text-white/60">
            <p>
              © {new Date().getFullYear()} {contact.legalName}
            </p>
            <p className="mt-1">{site.legal.sslNote}</p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {site.payments.map((p) => (
              <span
                key={p}
                className="rounded border border-white/15 bg-white/95 px-1.5 py-1 text-[10px] font-bold text-ink"
                title={p}
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
