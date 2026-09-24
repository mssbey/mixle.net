'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  CreditCard,
  Truck,
  Package,
  FolderTree,
  Users,
  RotateCcw,
  Tag,
  BadgePercent,
  Boxes,
  BarChart3,
  Image as ImageIcon,
  Settings,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  LogOut,
  Store,
  UserRound,
  Trash2,
} from 'lucide-react';
import { adminApi } from '@/lib/admin/client';
import { toast } from '@/store/toast';
import { useAdminData } from './AdminDataProvider';
import { roleLabels } from '@/server/auth/rbac';
import { AdminToaster } from './AdminToaster';

const NAV = [
  { href: '/admin', label: 'Özet', icon: LayoutDashboard, exact: true },
  { href: '/admin/siparisler', label: 'Siparişler', icon: ShoppingCart, exact: false },
  { href: '/admin/odemeler', label: 'Ödemeler', icon: CreditCard, exact: false },
  { href: '/admin/kargolar', label: 'Kargolar', icon: Truck, exact: false },
  { href: '/admin/iadeler', label: 'İadeler', icon: RotateCcw, exact: false },
  { href: '/admin/musteriler', label: 'Müşteriler', icon: Users, exact: false },
  { href: '/admin/urunler', label: 'Ürünler', icon: Package, exact: false },
  { href: '/admin/urunler/cop-kutusu', label: 'Çöp kutusu', icon: Trash2, exact: false },
  { href: '/admin/gorseller', label: 'Görseller', icon: ImageIcon, exact: false },
  { href: '/admin/kategoriler', label: 'Kategoriler', icon: FolderTree, exact: false },
  { href: '/admin/kuponlar', label: 'Kuponlar', icon: Tag, exact: false },
  { href: '/admin/indirimler', label: 'İndirimler', icon: BadgePercent, exact: false },
  { href: '/admin/stok', label: 'Stok', icon: Boxes, exact: false },
  { href: '/admin/raporlar', label: 'Raporlar', icon: BarChart3, exact: false },
  { href: '/admin/ayarlar', label: 'Ayarlar', icon: Settings, exact: false },
];

// Koleksiyonlar panelde gizli (bkz. features.ts); rota yerinde durduğu için
// kırıntı etiketi listede kalır.
const CRUMB_LABELS: Record<string, string> = {
  admin: 'Panel',
  siparisler: 'Siparişler',
  odemeler: 'Ödemeler',
  odeme: 'Ödeme',
  kargolar: 'Kargolar',
  kargo: 'Kargo',
  iadeler: 'İadeler',
  musteriler: 'Müşteriler',
  urunler: 'Ürünler',
  kategoriler: 'Kategoriler',
  koleksiyonlar: 'Koleksiyonlar',
  kuponlar: 'Kuponlar',
  indirimler: 'İndirimler',
  stok: 'Stok',
  raporlar: 'Raporlar',
  gorseller: 'Görseller',
  sayfalar: 'Sayfalar',
  magaza: 'Mağaza',
  eposta: 'E-posta',
  kullanicilar: 'Kullanıcılar',
  ayarlar: 'Ayarlar',
  yeni: 'Yeni',
  'cop-kutusu': 'Çöp kutusu',
};

const COLLAPSE_KEY = 'na-admin-sidebar-collapsed';

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '/admin';
  const router = useRouter();
  const { user, status, updatedAt } = useAdminData();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === '1');
    } catch {
      /* yoksay */
    }
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const toggleCollapsed = () => {
    setCollapsed((v) => {
      const next = !v;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      } catch {
        /* yoksay */
      }
      return next;
    });
  };

  const crumbs = useMemo(() => {
    const parts = pathname.split('/').filter(Boolean);
    const acc: { href: string; label: string }[] = [];
    let href = '';
    for (const part of parts) {
      href += `/${part}`;
      acc.push({ href, label: CRUMB_LABELS[part] ?? decodeURIComponent(part) });
    }
    return acc;
  }, [pathname]);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = search.trim();
    router.push(q ? `/admin/urunler?search=${encodeURIComponent(q)}` : '/admin/urunler');
  };

  const onLogout = async () => {
    try {
      await adminApi.logout();
      toast.info('Çıkış yapıldı');
      router.push('/admin/giris');
      router.refresh();
    } catch {
      toast.error('Çıkış yapılamadı');
    }
  };

  return (
    <div className="admin-layout" data-collapsed={collapsed}>
      {mobileOpen && (
        <div
          className="admin-sidebar-backdrop"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside className="admin-sidebar" data-mobile-open={mobileOpen} aria-label="Panel gezinme">
        <div className="mb-3 px-1 py-1">
          <span className="flex min-w-0 items-center justify-center rounded-md bg-white px-2 py-1.5">
            <Image
              src="/brand/logo.png"
              alt="Mixle Lezzet Sepeti"
              width={140}
              height={64}
              priority
              className="h-7 w-auto max-w-full object-contain"
            />
          </span>
        </div>

        <nav className="flex flex-col gap-1">
          {NAV.map((item) => {
            // En uzun eşleşen bağlantı etkin: /admin/urunler/cop-kutusu'da "Ürünler" yanmaz.
            const matches = (href: string, exact: boolean) => (exact ? pathname === href : pathname.startsWith(href));
            const active = matches(item.href, item.exact) && !NAV.some((o) => o.href.length > item.href.length && o.href.startsWith(item.href) && matches(o.href, o.exact));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="admin-nav-link admin-focusable"
                aria-current={active ? 'page' : undefined}
                title={item.label}
              >
                <Icon size={17} aria-hidden="true" />
                <span className="admin-nav-label">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="admin-sidebar-foot mt-auto flex flex-col gap-1 pt-3 text-[11px] text-[#94a3b8]">
          <Link href="/" className="admin-nav-link admin-focusable" title="Vitrine dön">
            <Store size={16} aria-hidden="true" />
            <span className="admin-nav-label">Vitrini aç</span>
          </Link>
          <button
            type="button"
            onClick={onLogout}
            className="admin-nav-link admin-focusable w-full text-left"
          >
            <LogOut size={16} aria-hidden="true" />
            <span className="admin-nav-label">Çıkış</span>
          </button>
          {updatedAt && (
            <p className="admin-nav-label px-2 pt-1 leading-tight">
              Son yazma:{' '}
              {new Date(updatedAt).toLocaleString('tr-TR', {
                dateStyle: 'short',
                timeStyle: 'short',
              })}
            </p>
          )}
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <button
            type="button"
            className="admin-btn admin-btn-ghost admin-btn-sm min-[901px]:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Menüyü aç"
          >
            <Menu size={16} />
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-ghost admin-btn-sm hidden min-[901px]:inline-flex"
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Kenar çubuğunu genişlet' : 'Kenar çubuğunu daralt'}
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>

          <nav aria-label="Konum" className="min-w-0 flex-1">
            <ol className="flex items-center gap-1.5 overflow-x-auto text-xs text-[var(--admin-ink-soft)]">
              {crumbs.map((c, i) => (
                <li key={c.href} className="flex shrink-0 items-center gap-1.5">
                  {i > 0 && <span aria-hidden="true">/</span>}
                  {i === crumbs.length - 1 ? (
                    <span className="font-semibold text-[var(--brand-purple-deep)]">{c.label}</span>
                  ) : (
                    <Link href={c.href} className="admin-focusable hover:text-[var(--brand-red)]">
                      {c.label}
                    </Link>
                  )}
                </li>
              ))}
            </ol>
          </nav>

          <form onSubmit={onSearch} className="relative hidden sm:block" role="search">
            <Search
              size={14}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--admin-ink-soft)]"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ürün ara…"
              aria-label="Ürün ara"
              className="admin-input"
              style={{ paddingLeft: 28, width: 190 }}
            />
          </form>

          {user && (
            <span
              className="admin-chip"
              title={`${user.email} — ${roleLabels[user.role]}`}
            >
              <UserRound size={12} aria-hidden="true" />
              <span className="hidden sm:inline">{user.name || user.email}</span>
              <span aria-hidden="true">·</span>
              {roleLabels[user.role]}
            </span>
          )}
        </header>

        <main id="admin-main" className="admin-content">
          {status === 'error' ? (
            <div className="admin-card" style={{ padding: 24 }}>
              <h1 className="text-base font-semibold text-[var(--brand-purple-deep)]">
                Katalog yüklenemedi
              </h1>
              <p className="mt-1 text-sm text-[var(--admin-ink-soft)]">
                Sunucu bağlantısını kontrol edip sayfayı yenileyin.
              </p>
            </div>
          ) : (
            children
          )}
        </main>
      </div>

      <AdminToaster />
    </div>
  );
}
