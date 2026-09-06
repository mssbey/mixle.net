'use client';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Logo } from './Logo';
import { NewsletterForm } from './NewsletterForm';
import { footerNav } from '@/data/nav';
import { useCategories } from '@/components/catalog/CatalogProvider';
export function Footer() {
  const categories = useCategories();
  return <footer className="surface-dark mt-12"><div className="container-page">
    <div className="flex flex-wrap items-center justify-between gap-6 border-b border-white/15 py-10"><p className="font-display text-2xl text-cream sm:text-4xl">Bir sonraki favorin,<br /><em className="text-gold-200">bir damla uzağında.</em></p><Link href="/urunler" className="btn-gold">Koleksiyonu keşfet <ArrowUpRight size={18} /></Link></div>
    <div className="grid gap-10 py-12 lg:grid-cols-[1fr_2fr]"><div className="max-w-sm"><Logo variant="light" /><p className="mt-5 text-sm leading-6 text-cream/80">Tat notalarını keşfet, seçenekleri karşılaştır ve kendi aroma seçkini oluştur.</p><div className="mt-6"><NewsletterForm variant="dark" /></div><Link href="/iletisim" className="mt-5 inline-flex items-center gap-2 text-sm text-gold-200">İletişim & destek <ArrowUpRight size={16} /></Link><p className="mt-2 text-xs leading-5 text-cream/70">Doğrulanmış iletişim ve sosyal medya bilgileri henüz eklenmedi.</p></div>
    <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">{footerNav.map(col => <div key={col.heading}><h3 className="font-sans text-xs font-semibold uppercase tracking-[.15em] text-gold-200">{col.heading}</h3><ul className="mt-5 space-y-3">{col.links.map(l => <li key={l.href + l.label}><Link href={l.href} className="text-sm text-cream/80 hover:text-white">{l.label}</Link></li>)}</ul></div>)}</div></div>
    <div className="flex flex-wrap gap-x-5 gap-y-3 border-t border-white/15 py-6">{categories.map(c => <Link key={c.slug} href={'/kategori/' + c.slug} className="text-xs text-cream/80 hover:text-gold-200">{c.name}</Link>)}</div>
    <div className="flex flex-wrap justify-between gap-3 border-t border-white/15 py-6 text-xs leading-5 text-cream/75"><p>© {new Date().getFullYear()} Nefis Aroma</p><p>Demo vitrin · Gerçek ödeme ve sipariş alınmaz.</p></div>
  </div></footer>;
}
