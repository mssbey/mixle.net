'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, LayoutGrid, Heart, ShoppingBag, User } from 'lucide-react';
import { useUI } from '@/store/ui';
import { useCart } from '@/store/cart';
import { useFavorites } from '@/store/favorites';
import { useMounted } from '@/lib/hooks';
import { cn } from '@/lib/utils';

export function MobileTabBar() {
  const pathname = usePathname();
  const { openCart, setMobileMenu } = useUI();
  const mounted = useMounted();
  const cartCount = useCart((s) => s.lines.reduce((n, l) => n + l.qty, 0));
  const favCount = useFavorites((s) => s.ids.length);

  const items = [
    { label: 'Keşfet', href: '/', icon: Compass },
    { label: 'Kategoriler', icon: LayoutGrid, action: () => setMobileMenu(true) },
    { label: 'Sepetim', icon: ShoppingBag, action: openCart, badge: mounted ? cartCount : 0 },
    { label: 'Favoriler', href: '/favoriler', icon: Heart, badge: mounted ? favCount : 0 },
    { label: 'Hesabım', href: '/hesabim', icon: User },
  ];

  return (
    <nav
      aria-label="Alt gezinme"
      className="fixed inset-x-0 bottom-0 z-[95] border-t border-line bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="mx-auto flex max-w-md items-stretch">
        {items.map((it) => {
          const active =
            !!it.href && (it.href === '/' ? pathname === '/' : pathname.startsWith(it.href));
          const Icon = it.icon;
          const inner = (
            <span className="relative flex min-h-[52px] flex-col items-center justify-center gap-1 py-2">
              <span className="relative">
                <Icon size={21} strokeWidth={active ? 2.4 : 1.8} />
                {!!it.badge && it.badge > 0 && (
                  <span className="absolute -right-2 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand-500 px-1 text-[10px] font-bold text-white">
                    {it.badge > 9 ? '9+' : it.badge}
                  </span>
                )}
              </span>
              <span className="text-[10px] font-medium">{it.label}</span>
            </span>
          );
          return (
            <li key={it.label} className="flex-1">
              {it.href ? (
                <Link
                  href={it.href}
                  className={cn(
                    'flex w-full justify-center transition-colors',
                    active ? 'text-brand-500' : 'text-ink-soft',
                  )}
                >
                  {inner}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={it.action}
                  className="flex w-full justify-center text-ink-soft transition-colors active:text-brand-500"
                >
                  {inner}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
