'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  FolderTree,
  Layers,
  Settings,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  LogOut,
  Store,
  UserRound,
} from 'lucide-react';
import { adminApi } from '@/lib/admin/client';
import { toast } from '@/store/toast';
import { useAdminData } from './AdminDataProvider';
import { roleLabels } from '@/server/auth/rbac';
import { AdminToaster } from './AdminToaster';

const NAV = [
  { href: '/admin', label: 'Özet', icon: LayoutDashboard, exact: true },
  { href: '/admin/siparisler', label: 'Siparişler', icon: ShoppingCart, exact: false },
  { href: '/admin/urunler', label: 'Ürünler', icon: Package, exact: false },
  { href: '/admin/kategoriler', label: 'Kategoriler', icon: FolderTree, exact: false },
  { href: '/admin/koleksiyonlar', label: 'Koleksiyonlar', icon: Layers, exact: false },
  { href: '/admin/ayarlar', label: 'Ayarlar', icon: Settings, exact: false },
];

const CRUMB_LABELS: Record<string, string> = {
  admin: 'Panel',
  siparisler: 'Siparişler',
  urunler: 'Ürünler',
  kategoriler: 'Kategoriler',
  koleksiyonlar: 'Koleksiyonlar',
  ayarlar: 'Ayarlar',
  yeni: 'Yeni',
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
        <div className="mb-3 flex items-center gap-2 px-2 py-1">
          <span
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--brand-gold)] text-[13px] font-bold text-[var(--brand-purple-deep)]"
            aria-hidden="true"
          >
            NA
          </span>
          <span className="admin-nav-label text-sm font-semibold text-white">Nefis Aroma</span>
        </div>

        <nav className="flex flex-col gap-1">
          {NAV.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
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

        <div className="admin-sidebar-foot mt-auto flex flex-col gap-1 pt-3 text-[11px] text-[#a992b8]">
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
                    <Link href={c.href} className="admin-focusable hover:text-[var(--brand-purple)]">
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
