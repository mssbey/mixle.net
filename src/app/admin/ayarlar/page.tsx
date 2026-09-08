'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  CreditCard,
  Download,
  FileText,
  Image as ImageIcon,
  Mail,
  RotateCcw,
  Truck,
  Upload,
  Users,
} from 'lucide-react';
import { useAdminData } from '@/components/admin/AdminDataProvider';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { TableSkeleton } from '@/components/admin/primitives';
import { adminApi, ApiError } from '@/lib/admin/client';
import { formatDateTime } from '@/lib/admin/format';
import { toast } from '@/store/toast';
import type { Permission } from '@/server/auth/rbac';

const SECTIONS: { href: string; icon: typeof Building2; title: string; hint: string; permission: Permission }[] = [
  { href: '/admin/ayarlar/magaza', icon: Building2, title: 'Mağaza bilgisi', hint: 'Fatura bilgileri, KDV, cayma hakkı, düşük stok eşiği', permission: 'ayar:oku' },
  { href: '/admin/ayarlar/odeme', icon: CreditCard, title: 'Ödeme', hint: 'Sağlayıcılar, yöntemler, limitler, havale bilgisi', permission: 'ayar:odeme' },
  { href: '/admin/ayarlar/kargo', icon: Truck, title: 'Kargo', hint: 'Bölgeler, tarifeler, taşıyıcı bağlantıları, kapıda ödeme', permission: 'ayar:oku' },
  { href: '/admin/ayarlar/eposta', icon: Mail, title: 'E-posta', hint: 'SMTP / Resend gönderim ayarları, test e-postası', permission: 'ayar:oku' },
  { href: '/admin/ayarlar/kullanicilar', icon: Users, title: 'Kullanıcılar', hint: 'Panel hesapları, roller, parola sıfırlama', permission: 'kullanici:yonet' },
  { href: '/admin/sayfalar', icon: FileText, title: 'İçerik', hint: 'Ana sayfa metni ve SSS', permission: 'ayar:oku' },
  { href: '/admin/gorseller', icon: ImageIcon, title: 'Görseller', hint: 'Medya kütüphanesi', permission: 'katalog:oku' },
];

export default function AdminSettingsPage() {
  const { status, can, updatedAt, products, categories, collections, reload } = useAdminData();
  // Yedek yükleme ve demoya sıfırlama bakım iznine bağlıdır.
  const canMaintain = can('bakim:yaz');
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  if (status === 'loading') return <TableSkeleton rows={4} />;

  const onImport = async (file: File) => {
    setBusy(true);
    try {
      const text = await file.text();
      const format = file.name.toLowerCase().endsWith('.csv') ? 'csv' : 'json';
      const res = await adminApi.importCatalog(format, text);
      await reload();
      toast.success(
        'İçe aktarıldı',
        format === 'csv'
          ? `${(res as { changed?: number }).changed ?? 0} ürün güncellendi`
          : `${(res as { products?: number }).products ?? 0} ürün yüklendi`,
      );
    } catch (err) {
      toast.error(
        'İçe aktarma başarısız',
        err instanceof ApiError ? (Object.values(err.issues)[0] ?? err.message) : String(err),
      );
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const onReset = async () => {
    setConfirmReset(false);
    setBusy(true);
    try {
      await adminApi.resetCatalog();
      await reload();
      toast.success('Demo verisine sıfırlandı');
    } catch (err) {
      toast.error('Sıfırlama başarısız', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-lg font-semibold text-[var(--brand-purple-deep)]">Ayarlar</h1>
        <p className="admin-hint mt-0.5">Mağaza yapılandırması ve veri yedekleme</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.filter((s) => can(s.permission)).map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.href} href={s.href} className="admin-card flex items-start gap-3 transition-colors hover:border-[var(--brand-purple)]" style={{ padding: 16 }}>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--brand-purple)]/10 text-[var(--brand-purple)]">
                <Icon size={18} aria-hidden="true" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-[var(--brand-purple-deep)]">{s.title}</span>
                <span className="admin-hint mt-0.5 block">{s.hint}</span>
              </span>
            </Link>
          );
        })}
      </div>

      <section className="admin-card grid gap-3 sm:grid-cols-3" style={{ padding: 16 }}>
        <div className="admin-stat" style={{ padding: 0 }}>
          <span className="admin-stat-value">{products.length}</span>
          <span className="admin-stat-label">Ürün</span>
        </div>
        <div className="admin-stat" style={{ padding: 0 }}>
          <span className="admin-stat-value">
            {categories.length}
            <span className="text-base font-medium text-[var(--admin-ink-soft)]">
              {' '}
              / {collections.length}
            </span>
          </span>
          <span className="admin-stat-label">Kategori / Koleksiyon</span>
        </div>
        <div className="admin-stat" style={{ padding: 0 }}>
          <span className="text-sm font-semibold text-[var(--brand-purple-deep)]">
            {updatedAt ? formatDateTime(updatedAt) : '—'}
          </span>
          <span className="admin-stat-label">Son yazma</span>
        </div>
      </section>

      <section className="admin-card" style={{ padding: 16 }}>
        <h2 className="text-sm font-semibold text-[var(--brand-purple-deep)]">Dışa aktar</h2>
        <p className="admin-hint mt-0.5">
          JSON tam yedektir. CSV, tablo programında fiyat/stok gözden geçirmek içindir.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href="/api/admin/settings/export?format=json"
            className="admin-btn admin-btn-ghost"
            download
          >
            <Download size={14} /> JSON indir
          </a>
          <a
            href="/api/admin/settings/export?format=csv"
            className="admin-btn admin-btn-ghost"
            download
          >
            <Download size={14} /> CSV indir
          </a>
        </div>
      </section>

      <section className="admin-card" style={{ padding: 16 }}>
        <h2 className="text-sm font-semibold text-[var(--brand-purple-deep)]">İçe aktar</h2>
        <p className="admin-hint mt-0.5">
          JSON dosyası tüm kataloğu değiştirir. CSV dosyası SKU eşleşen varyantların
          fiyat/stok/indirim/barkod alanlarını ve ürün durumunu günceller.
        </p>
        <div className="mt-3">
          <input
            ref={fileRef}
            type="file"
            accept=".json,.csv,application/json,text/csv"
            disabled={!canMaintain || busy}
            className="block text-sm"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onImport(file);
            }}
          />
          {!canMaintain && (
            <p className="admin-error mt-2">
              İçe aktarma için bakım yetkisi gerekiyor. Rolünüz bu işleme izin vermiyor.
            </p>
          )}
        </div>
      </section>

      <section className="admin-card" style={{ padding: 16 }}>
        <h2 className="text-sm font-semibold text-[var(--brand-purple-deep)]">Demo verisine sıfırla</h2>
        <p className="admin-hint mt-0.5">
          Kataloğu ilk kurulum anındaki içeriğe döndürür. Tüm değişiklikler kaybolur.
        </p>
        <button
          type="button"
          className="admin-btn admin-btn-danger mt-3"
          disabled={!canMaintain || busy}
          onClick={() => setConfirmReset(true)}
        >
          <RotateCcw size={14} /> Sıfırla
        </button>
      </section>

      <ConfirmDialog
        open={confirmReset}
        title="Demo verisine sıfırla?"
        description="catalog.json, catalog.seed.json içeriğiyle değiştirilecek. Bu işlem geri alınamaz."
        confirmLabel="Sıfırla"
        destructive
        onConfirm={onReset}
        onCancel={() => setConfirmReset(false)}
      />

      <p className="admin-hint flex items-center gap-1.5">
        <Upload size={12} /> Bakım işlemleri DEMO_MODE=true iken de çalışır; canlıda yalnızca bakım yetkisi olan kullanıcılar için.
      </p>
    </div>
  );
}
