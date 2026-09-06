'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Package, MapPin, UserRound, LogOut, Heart } from 'lucide-react';
import { accountApi } from '@/lib/checkout-client';
import { cn } from '@/lib/utils';

const ITEMS = [
  { href: '/hesabim/siparisler', label: 'Siparişlerim', icon: Package },
  { href: '/hesabim/adresler', label: 'Adreslerim', icon: MapPin },
  { href: '/hesabim/bilgilerim', label: 'Bilgilerim', icon: UserRound },
  { href: '/favoriler', label: 'Favorilerim', icon: Heart },
];

export function AccountNav({ name, email }: { name: string; email: string }) {
  const pathname = usePathname();
  const router = useRouter();

  const logout = async () => {
    await accountApi.logout();
    router.replace('/');
    router.refresh();
  };

  return (
    <nav aria-label="Hesap menüsü" className="lg:sticky lg:top-24 lg:self-start">
      <div className="rounded-2xl border border-purple-100 bg-white p-4">
        <p className="truncate font-semibold text-purple-900">{name}</p>
        <p className="truncate text-xs text-ink-soft">{email}</p>
      </div>
      <ul className="mt-3 flex gap-1 overflow-x-auto lg:flex-col">
        {ITEMS.map((it) => {
          const Icon = it.icon;
          const active = pathname === it.href || pathname.startsWith(`${it.href}/`);
          return (
            <li key={it.href} className="shrink-0">
              <Link
                href={it.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                  active ? 'bg-purple-600 text-cream' : 'text-purple-900 hover:bg-purple-50',
                )}
              >
                <Icon size={16} /> {it.label}
              </Link>
            </li>
          );
        })}
        <li className="shrink-0">
          <button type="button" onClick={logout} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-ink-soft hover:bg-purple-50">
            <LogOut size={16} /> Çıkış yap
          </button>
        </li>
      </ul>
    </nav>
  );
}
