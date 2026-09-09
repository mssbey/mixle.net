'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Package, MapPin, UserRound, LogOut, Heart } from 'lucide-react';
import { accountApi } from '@/lib/checkout-client';
import { cn } from '@/lib/utils';

const ITEMS = [
  { href: '/hesabim/siparisler', label: 'Siparişlerim', icon: Package },
  { href: '/hesabim/adresler', label: 'Adreslerim', icon: MapPin },
  { href: '/hesabim/bilgilerim', label: 'Kullanıcı Bilgilerim', icon: UserRound },
  { href: '/favoriler', label: 'Beğendiklerim', icon: Heart },
];

// Backend'i henüz olmayan hesap modülleri — sahte "çalışıyor" göstermek yerine
// açıkça "Yakında" olarak listelenir (bkz. README "Kapsam dışı").
const SOON = [
  'Sana Özel Fırsatlar',
  'Kuponlarım',
  'Değerlendirmelerim',
  'Soru ve Taleplerim',
  'Ödeme Yöntemlerim',
  'Fatura Bilgilerim',
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
      <div className="rounded-lg border border-line bg-white p-4">
        <p className="truncate font-semibold text-ink">{name}</p>
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
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  active ? 'bg-brand-500 text-white' : 'text-ink hover:bg-mist',
                )}
              >
                <Icon size={16} /> {it.label}
              </Link>
            </li>
          );
        })}
        <li className="shrink-0">
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-ink-soft hover:bg-mist"
          >
            <LogOut size={16} /> Çıkış Yap
          </button>
        </li>
      </ul>

      <div className="mt-4 hidden border-t border-line pt-4 lg:block">
        <p className="px-3 text-[11px] font-bold uppercase tracking-wide text-ink-soft">Yakında</p>
        <ul className="mt-1">
          {SOON.map((label) => (
            <li key={label}>
              <span className="flex items-center justify-between rounded-md px-3 py-2 text-sm text-purple-300">
                {label}
                <span className="rounded bg-mist px-1.5 py-0.5 text-[10px] font-semibold text-ink-soft">
                  Yakında
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
