'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import {
  Search,
  Heart,
  ShoppingBag,
  Menu,
  User,
  ChevronDown,
  Phone,
  Mail,
  Truck,
  LayoutGrid,
  MessageCircle,
} from 'lucide-react';
import { Logo } from './Logo';
import { AnnouncementBar } from './AnnouncementBar';
import { MegaMenu } from './MegaMenu';
import { MobileMenu } from './MobileMenu';
import { MiniCart } from './MiniCart';
import { primaryNav } from '@/data/nav';
import type { StorefrontContact } from '@/lib/storefront';
import { useUI } from '@/store/ui';
import { useCart } from '@/store/cart';
import { useFavorites } from '@/store/favorites';
import { useMounted } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import { useSlimProducts } from '@/components/catalog/CatalogProvider';
import { detailLines, summarize } from '@/lib/cart-math';
import { currency } from '@/lib/site';

export function Header({ contact }: { contact: StorefrontContact }) {
  const pathname = usePathname();
  const router = useRouter();
  const mounted = useMounted();
  const { setSearch, openCart, mobileMenuOpen, setMobileMenu } = useUI();
  const cartCount = useCart((s) => s.lines.reduce((n, l) => n + l.qty, 0));
  const cartLines = useCart((s) => s.lines);
  const { products: cartProducts } = useSlimProducts(mounted && cartCount > 0 && pathname === '/');
  const cartTotal = summarize(mounted ? detailLines(cartLines, cartProducts) : [], null).subtotal;
  const favCount = useFavorites((s) => s.ids.length);

  const [scrolled, setScrolled] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [miniOpen, setMiniOpen] = useState(false);
  const [term, setTerm] = useState('');
  const megaTimer = useRef<number>(undefined);
  const miniTimer = useRef<number>(undefined);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setScrolled(window.scrollY > 24));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  useEffect(() => {
    setMegaOpen(false);
    setMobileMenu(false);
    setMiniOpen(false);
  }, [pathname, setMobileMenu]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(el?.tagName) || el?.isContentEditable;
      if (e.key === '/' && !typing) {
        e.preventDefault();
        setSearch(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setSearch]);

  const openMega = () => {
    window.clearTimeout(megaTimer.current);
    setMegaOpen(true);
  };
  const closeMega = () => {
    megaTimer.current = window.setTimeout(() => setMegaOpen(false), 120);
  };
  const openMini = () => {
    window.clearTimeout(miniTimer.current);
    setMiniOpen(true);
  };
  const closeMini = () => {
    miniTimer.current = window.setTimeout(() => setMiniOpen(false), 140);
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (term.trim().length >= 2) router.push(`/arama?q=${encodeURIComponent(term.trim())}`);
    else setSearch(true);
  };

  const searchField = (
    <form onSubmit={submitSearch} role="search" className="w-full">
      <div className="flex items-center header-search gap-2 rounded-md border border-purple-200 bg-white px-3 py-2 transition-colors focus-within:border-brand-400 focus-within:ring-1 focus-within:ring-brand-100">
        <Search size={17} className="shrink-0 text-purple-400" />
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onFocus={() => setSearch(true)}
          placeholder="Ürün, kategori veya marka ara…"
          aria-label="Ürün ara"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-soft/60"
        />
        <button
          type="submit"
          aria-label="Aramayı başlat"
          className="hidden shrink-0 rounded bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 sm:block"
        >
          <Search size={21} />
        </button>
      </div>
    </form>
  );

  return (
    <>
      <header
        className={cn("sticky top-0 z-[80] w-full bg-white", pathname === "/" && "storefront-header")}
        onMouseLeave={closeMega}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setMegaOpen(false);
            setMiniOpen(false);
          }
        }}
      >
        {/* Duyuru şeridi */}
        <div
          className={cn(
            'header-announcement overflow-hidden transition-all duration-300',
            scrolled ? 'max-h-0 opacity-0' : 'max-h-9 opacity-100',
          )}
        >
          <AnnouncementBar />
        </div>

        {/* Üst bilgi şeridi (masaüstü) */}
        <div
          className={cn(
            'header-contact hidden border-b border-line bg-mist transition-all duration-300 lg:block',
            scrolled ? 'max-h-0 overflow-hidden border-b-0 opacity-0' : 'max-h-10 opacity-100',
          )}
        >
          <div className="container-page flex h-9 items-center justify-between text-[12px] text-ink-soft">
            <div className="flex items-center gap-5">
              <a href={contact.phoneUrl} className="inline-flex items-center gap-1.5 hover:text-ink">
                <Phone size={13} className="text-brand-500" />
                {contact.phone}
              </a>
              {pathname === '/' && <a href={`https://wa.me/${contact.phone.replace(/\D/g, '').replace(/^0/, '90')}`} className="inline-flex items-center gap-1.5"><MessageCircle size={13} />{contact.phone}</a>}
              <a href={contact.emailUrl} className="inline-flex items-center gap-1.5 hover:text-ink">
                <Mail size={13} className="text-brand-500" />
                {contact.email}
              </a>
            </div>
            <div className="flex items-center gap-5">
              <Link href="/siparis-takibi" className="inline-flex items-center gap-1.5 hover:text-ink">
                <Truck size={13} /> Kargom Nerede?
              </Link>
              <Link href="/favoriler" className="inline-flex items-center gap-1.5 hover:text-ink">
                <Heart size={13} /> Favori Ürünlerim
              </Link>
              <Link href="/giris" className="inline-flex items-center gap-1.5 font-medium text-ink hover:text-brand-500">
                <User size={13} /> Giriş Yap / Üye Ol
              </Link>
            </div>
          </div>
        </div>

        {/* Ana header */}
        <div className="border-b border-line bg-white">
          <div className="container-page">
            <div
              className={cn(
                'header-main-row flex items-center gap-3 transition-all duration-300 lg:gap-8',
                scrolled ? 'h-14' : 'h-[68px]',
              )}
            >
              <button
                type="button"
                onClick={() => setMobileMenu(true)}
                aria-label="Menüyü aç"
                className="-ml-1 grid h-10 w-10 shrink-0 place-items-center rounded-md text-ink hover:bg-mist lg:hidden"
              >
                <Menu size={22} />
              </button>

              <Logo priority className="shrink-0" />

              <div className="header-desktop-search mx-auto hidden w-full max-w-xl lg:block">{searchField}</div>

              <div className="header-actions ml-auto flex items-center gap-1 lg:ml-0 lg:gap-2">
                <Link
                  href="/favoriler"
                  aria-label="Favorilerim"
                  className="relative hidden h-11 flex-col items-center justify-center rounded-md px-2 text-ink hover:bg-mist sm:flex"
                >
                  <Heart size={20} />
                  <span className="mt-0.5 hidden text-[11px] font-medium xl:block">Favorilerim</span>
                  {mounted && favCount > 0 && (
                    <span className="absolute right-0 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand-500 px-1 text-[10px] font-bold text-white">
                      {favCount > 9 ? '9+' : favCount}
                    </span>
                  )}
                </Link>

                <Link
                  href="/hesabim"
                  className="hidden h-11 flex-col items-center justify-center rounded-md px-2 text-ink hover:bg-mist sm:flex"
                >
                  <User size={20} />
                  <span className="mt-0.5 hidden text-[11px] font-medium xl:block">{pathname === '/' ? <>Giriş Yap<strong className="block text-brand-500">veya Üye Ol</strong></> : 'Hesabım'}</span>
                </Link>

                <div className="relative" onMouseEnter={openMini} onMouseLeave={closeMini}>
                  <button
                    type="button"
                    onClick={openCart}
                    aria-label="Sepetim"
                    className="relative flex h-11 items-center gap-2 rounded-md px-2 text-ink hover:bg-mist"
                  >
                    <span className="relative">
                      <ShoppingBag size={22} />
                      {mounted && cartCount > 0 && (
                        <span className="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand-500 px-1 text-[10px] font-bold text-white">
                          {cartCount > 9 ? '9+' : cartCount}
                        </span>
                      )}
                    </span>
                    <span className="hidden text-[13px] font-semibold lg:block">{pathname === '/' ? <span className="block text-left text-xs font-normal">Sepet<strong className="block">{currency(cartTotal)}</strong></span> : 'Sepetim'}</span>
                  </button>
                  <AnimatePresence>
                    {miniOpen && (
                      <div className="hidden lg:block">
                        <MiniCart open={miniOpen} onNavigate={() => setMiniOpen(false)} />
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Mobil arama satırı */}
            <div className="pb-2.5 lg:hidden">{searchField}</div>
          </div>
        </div>

        {/* Kategori navigasyonu (masaüstü) */}
        <div
          className={cn(
            'header-navigation hidden border-b border-line bg-white transition-all duration-300 lg:block',
            scrolled ? 'max-h-0 overflow-hidden border-b-0 opacity-0' : 'max-h-14 opacity-100',
          )}
        >
          <div className="container-page">
            <nav inert={scrolled} className="flex h-[50px] items-stretch gap-1" aria-label="Ana menü">
              <button
                type="button"
                onMouseEnter={openMega}
                onFocus={openMega}
                onClick={() => setMegaOpen((v) => !v)}
                aria-expanded={megaOpen}
                className="mr-2 flex items-center gap-2 bg-brand-500 px-4 text-[13px] font-bold uppercase tracking-wide text-white transition-colors hover:bg-brand-600"
              >
                <LayoutGrid size={16} />
                Tüm Kategoriler
                <ChevronDown size={14} className={cn('transition-transform', megaOpen && 'rotate-180')} />
              </button>

              {(pathname === '/' ? primaryNav.slice(0, 4) : primaryNav).map((link) => {
                const active =
                  pathname === link.href ||
                  (link.href.startsWith('/') && link.href !== '/' && pathname.startsWith(link.href.split('?')[0]));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      'relative flex items-center whitespace-nowrap px-3 text-[13px] font-semibold transition-colors',
                      link.emphasis ? 'text-brand-500 hover:text-brand-600' : 'text-ink hover:text-brand-500',
                      active && 'text-brand-500',
                    )}
                  >
                    {link.label}
                    {active && (
                      <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-brand-500" />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        <AnimatePresence>
          {megaOpen && (
            <div onMouseEnter={openMega} onMouseLeave={closeMega}>
              <MegaMenu onNavigate={() => setMegaOpen(false)} />
            </div>
          )}
        </AnimatePresence>
      </header>

      <MobileMenu open={mobileMenuOpen} onClose={() => setMobileMenu(false)} contact={contact} />
    </>
  );
}
