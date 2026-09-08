'use client';

// Panel > Görseller: medya kütüphanesi — yükle, ara, düzenle, sil.

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Check, Copy, Trash2, Upload } from 'lucide-react';
import { EmptyState, TableSkeleton, Field } from '@/components/admin/primitives';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { Dialog } from '@/components/admin/orders/Dialog';
import { useAdminData } from '@/components/admin/AdminDataProvider';
import { mediaApi, type AdminMediaAsset } from '@/lib/admin/media-client';
import { ApiError } from '@/lib/admin/client';
import { toast } from '@/store/toast';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function CopyPathButton({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={async () => {
      try {
        await navigator.clipboard.writeText(path);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } catch {
        toast.error('Kopyalanamadı');
      }
    }}>
      {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Kopyalandı' : 'Yolu kopyala'}
    </button>
  );
}

function AssetDialog({ asset, canWrite, onClose, onChanged }: { asset: AdminMediaAsset; canWrite: boolean; onClose: () => void; onChanged: () => void }) {
  const [alt, setAlt] = useState(asset.alt);
  const [tagsText, setTagsText] = useState(asset.tags.join(', '));
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await mediaApi.update(asset.id, { alt, tags: tagsText.split(',').map((t) => t.trim()).filter(Boolean) });
      toast.success('Kaydedildi');
      onChanged();
    } catch (err) {
      toast.error('Kaydedilemedi', err instanceof ApiError ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setConfirmDelete(false);
    setBusy(true);
    try {
      await mediaApi.remove(asset.id);
      toast.success('Görsel silindi');
      onChanged();
    } catch (err) {
      toast.error('Silinemedi', err instanceof ApiError ? err.message : undefined);
      setBusy(false);
    }
  };

  return (
    <Dialog open onClose={onClose} title={asset.fileName} description={`${asset.width ?? '?'}×${asset.height ?? '?'} · ${formatSize(asset.sizeBytes)} · ${asset.mimeType}`}
      footer={<>
        <button type="button" className="admin-btn admin-btn-ghost" onClick={onClose} disabled={busy}>Kapat</button>
        {canWrite && <button type="button" className="admin-btn admin-btn-danger" disabled={busy} onClick={() => setConfirmDelete(true)}><Trash2 size={14} /> Sil</button>}
        {canWrite && <button type="button" className="admin-btn admin-btn-primary" disabled={busy} onClick={() => void save()}>{busy ? 'Kaydediliyor…' : 'Kaydet'}</button>}
      </>}>
      <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
        <div className="relative h-40 w-full overflow-hidden rounded-lg bg-[#f1ebf0] sm:h-full">
          <Image src={asset.path} alt={asset.alt} fill className="object-contain" sizes="160px" unoptimized />
        </div>
        <div className="flex flex-col gap-3">
          <Field label="Yol" htmlFor="ma-path"><div className="flex items-center gap-2"><input id="ma-path" className="admin-input" readOnly value={asset.path} /><CopyPathButton path={asset.path} /></div></Field>
          <Field label="Alt metin (erişilebilirlik/SEO)" htmlFor="ma-alt"><input id="ma-alt" className="admin-input" disabled={!canWrite} value={alt} onChange={(e) => setAlt(e.target.value)} /></Field>
          <Field label="Etiketler (virgülle)" htmlFor="ma-tags"><input id="ma-tags" className="admin-input" disabled={!canWrite} value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="ürün, banner" /></Field>
        </div>
      </div>
      <ConfirmDialog open={confirmDelete} title="Görseli sil?" description={`"${asset.fileName}" kalıcı olarak silinecek. Bu görseli kullanan ürün/sayfalar bozuk görünebilir.`} confirmLabel="Sil" destructive onConfirm={() => void remove()} onCancel={() => setConfirmDelete(false)} />
    </Dialog>
  );
}

export function MediaLibrary() {
  const { can } = useAdminData();
  const canWrite = can('katalog:yaz');
  const [items, setItems] = useState<AdminMediaAsset[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState<AdminMediaAsset | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await mediaApi.list({ q: q || undefined, pageSize: 100 });
      setItems(r.items);
    } catch (err) {
      toast.error('Görseller yüklenemedi', err instanceof Error ? err.message : undefined);
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    void load();
  }, [load]);

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    let ok = 0;
    for (const file of Array.from(files)) {
      try {
        await mediaApi.upload(file);
        ok += 1;
      } catch (err) {
        toast.error(`${file.name} yüklenemedi`, err instanceof ApiError ? err.message : undefined);
      }
    }
    if (ok > 0) toast.success(`${ok} görsel yüklendi`);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
    void load();
  };

  return (
    <div className="flex flex-col gap-3">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold text-[var(--brand-purple-deep)]">Görseller</h1>
          <p className="admin-hint mt-0.5">Medya kütüphanesi — JPG/PNG/WEBP/AVIF/SVG, en fazla 8 MB</p>
        </div>
        {canWrite && (
          <label className="admin-btn admin-btn-primary cursor-pointer">
            <Upload size={14} /> {uploading ? 'Yükleniyor…' : 'Görsel yükle'}
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/svg+xml" multiple hidden disabled={uploading} onChange={(e) => void onFiles(e.target.files)} />
          </label>
        )}
      </header>

      <form className="admin-card flex flex-wrap items-end gap-2" style={{ padding: 10 }} onSubmit={(e) => e.preventDefault()}>
        <label className="admin-field" style={{ minWidth: 240 }}>
          <span className="admin-label">Ara</span>
          <input className="admin-input" placeholder="Dosya adı, alt metin" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </form>

      {loading && !items ? (
        <TableSkeleton rows={6} />
      ) : !items || items.length === 0 ? (
        <EmptyState title="Henüz görsel yok" hint={canWrite ? '"Görsel yükle" ile başlayın.' : undefined} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {items.map((a) => (
            <button key={a.id} type="button" className="group flex flex-col overflow-hidden rounded-xl border border-[var(--admin-border)] text-left transition-colors hover:border-[var(--brand-purple)]" onClick={() => setSelected(a)}>
              <span className="relative block aspect-square w-full bg-[#f1ebf0]">
                <Image src={a.path} alt={a.alt} fill className="object-cover" sizes="180px" unoptimized />
              </span>
              <span className="truncate px-2 py-1.5 text-xs text-[var(--admin-ink-soft)]">{a.fileName}</span>
            </button>
          ))}
        </div>
      )}

      {selected && <AssetDialog asset={selected} canWrite={canWrite} onClose={() => setSelected(null)} onChanged={() => { setSelected(null); void load(); }} />}
    </div>
  );
}
