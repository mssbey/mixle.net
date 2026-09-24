'use client';

// Ürün çöp kutusu: silinen ürünler 30 gün burada bekler; geri yüklenebilir
// veya kalıcı silinebilir. Geri yüklenen ürün taslak olarak döner.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ImageOff, RotateCcw, Trash2 } from 'lucide-react';
import { adminApi, ApiError, type TrashItem } from '@/lib/admin/client';
import { useAdminData } from '@/components/admin/AdminDataProvider';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { EmptyState, TableSkeleton } from '@/components/admin/primitives';
import { dateTime } from '@/components/admin/orders/status';
import { toast } from '@/store/toast';

const DAY = 86_400_000;

function daysLeft(purgeAt: string): number {
  return Math.max(0, Math.ceil((new Date(purgeAt).getTime() - Date.now()) / DAY));
}

export function TrashList() {
  const { can, categoryName, applyProduct } = useAdminData();
  const canRestore = can('katalog:yaz');
  const canPurge = can('katalog:sil');

  const [items, setItems] = useState<TrashItem[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ kind: 'one'; item: TrashItem } | { kind: 'all' } | null>(null);

  useEffect(() => {
    adminApi
      .listTrash()
      .then((r) => setItems(r.items))
      .catch((err: unknown) => {
        setItems([]);
        toast.error('Çöp kutusu yüklenemedi', err instanceof ApiError ? err.message : undefined);
      });
  }, []);

  const restore = async (item: TrashItem) => {
    setBusyId(item.id);
    try {
      const { product } = await adminApi.restoreFromTrash(item.id);
      applyProduct(product);
      setItems((xs) => xs?.filter((x) => x.id !== item.id) ?? xs);
      toast.success('Ürün geri yüklendi', `${product.name} · taslak olarak`);
    } catch (err) {
      toast.error('Geri yüklenemedi', err instanceof ApiError ? err.message : undefined);
    } finally {
      setBusyId(null);
    }
  };

  const purge = async () => {
    const c = confirm;
    setConfirm(null);
    if (!c) return;
    try {
      if (c.kind === 'all') {
        const r = await adminApi.emptyTrash();
        setItems([]);
        toast.success('Çöp kutusu boşaltıldı', `${r.count} ürün kalıcı silindi`);
      } else {
        setBusyId(c.item.id);
        await adminApi.purgeFromTrash(c.item.id);
        setItems((xs) => xs?.filter((x) => x.id !== c.item.id) ?? xs);
        toast.success('Kalıcı silindi', c.item.name);
      }
    } catch (err) {
      toast.error('Silinemedi', err instanceof ApiError ? err.message : undefined);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/urunler" className="admin-hint inline-flex items-center gap-1 hover:text-[var(--brand-red)]">
            <ArrowLeft size={12} aria-hidden /> Ürünler
          </Link>
          <h1 className="mt-1 flex items-center gap-2 text-lg font-semibold text-[var(--brand-purple-deep)]">
            <Trash2 size={18} aria-hidden /> Çöp kutusu
          </h1>
          <p className="admin-hint mt-0.5">
            Silinen ürünler 30 gün burada tutulur, sonra otomatik olarak kalıcı silinir. Geri yüklenen ürün <strong>taslak</strong> olarak döner.
          </p>
        </div>
        {canPurge && items && items.length > 0 && (
          <button type="button" className="admin-btn admin-btn-danger" onClick={() => setConfirm({ kind: 'all' })}>
            <Trash2 size={14} aria-hidden /> Çöpü boşalt
          </button>
        )}
      </header>

      {items === null ? (
        <TableSkeleton rows={5} />
      ) : items.length === 0 ? (
        <EmptyState
          title="Çöp kutusu boş"
          hint="Ürün listesinden sildiğiniz ürünler burada görünür."
          action={<Link href="/admin/urunler" className="admin-btn admin-btn-ghost">Ürünlere dön</Link>}
        />
      ) : (
        <div className="admin-card-list">
          {items.map((item) => {
            const left = daysLeft(item.purgeAt);
            return (
              <article key={item.id} className="admin-card flex flex-wrap items-center gap-3" style={{ padding: 12 }}>
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[var(--admin-border)] bg-[#f7f4ef]">
                  {item.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image} alt="" className="h-full w-full object-cover opacity-80 grayscale-[35%]" loading="lazy" />
                  ) : (
                    <ImageOff size={18} className="text-[var(--admin-ink-soft)]" aria-hidden />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[var(--brand-purple-deep)]">{item.name}</p>
                  <p className="truncate text-[11px] text-[var(--admin-ink-soft)]">
                    /{item.slug}
                    {item.categoryIds.length > 0 && <> · {item.categoryIds.map(categoryName).join(', ')}</>}
                    {item.variantCount > 1 && <> · {item.variantCount} varyant</>}
                  </p>
                  <p className="mt-1 text-[11px] text-[var(--admin-ink-soft)]">
                    {dateTime.format(new Date(item.deletedAt))} silindi{item.deletedBy ? ` · ${item.deletedBy}` : ''}
                    <span
                      className={
                        'ml-2 inline-flex items-center rounded-full border px-2 py-0.5 font-semibold ' +
                        (left <= 3 ? 'border-[#f4b9b2] bg-[#fdecec] text-[#b42318]' : 'border-[var(--admin-border)] bg-[#f7f4ef] text-[var(--admin-ink-soft)]')
                      }
                    >
                      {left === 0 ? 'Bugün silinecek' : `${left} gün kaldı`}
                    </span>
                  </p>
                </div>
                <div className="flex gap-2">
                  {canRestore && (
                    <button type="button" className="admin-btn admin-btn-primary admin-btn-sm" disabled={busyId === item.id} onClick={() => void restore(item)}>
                      <RotateCcw size={13} aria-hidden /> {busyId === item.id ? 'Yükleniyor…' : 'Geri yükle'}
                    </button>
                  )}
                  {canPurge && (
                    <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" disabled={busyId === item.id} onClick={() => setConfirm({ kind: 'one', item })} aria-label={`${item.name} kalıcı sil`}>
                      <Trash2 size={13} aria-hidden /> Kalıcı sil
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={confirm !== null}
        title={confirm?.kind === 'all' ? `Çöp kutusundaki ${items?.length ?? 0} ürün kalıcı silinsin mi?` : `“${confirm?.kind === 'one' ? confirm.item.name : ''}” kalıcı silinsin mi?`}
        description="Bu işlem geri alınamaz."
        confirmLabel="Kalıcı sil"
        destructive
        onConfirm={() => void purge()}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
