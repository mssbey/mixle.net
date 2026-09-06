'use client';

import { useRef, useState } from 'react';
import { Download, RotateCcw, Upload } from 'lucide-react';
import { useAdminData } from '@/components/admin/AdminDataProvider';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { TableSkeleton } from '@/components/admin/primitives';
import { adminApi, ApiError } from '@/lib/admin/client';
import { formatDateTime } from '@/lib/admin/format';
import { toast } from '@/store/toast';

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
        <p className="admin-hint mt-0.5">Veri yedekleme ve geri yükleme</p>
      </header>

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
        <Upload size={12} /> Yazma işlemleri yalnızca geliştirme ortamında veya
        ADMIN_WRITE_ENABLED=true iken çalışır.
      </p>
    </div>
  );
}
