'use client';

// Panel > Sayfalar > Ana sayfa bannerları: üç marka satırının görselleri ve bağlantıları.

import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Save, Trash2 } from 'lucide-react';
import { TableSkeleton } from '@/components/admin/primitives';
import { ImagePicker } from '@/components/admin/ImagePicker';
import { pagesApi, type HomeBannerItem, type HomeBannersContent } from '@/lib/admin/pages-client';
import { ApiError } from '@/lib/admin/client';
import { toast } from '@/store/toast';

type Row = keyof HomeBannersContent;

const ROWS: { id: Row; title: string; hint: string }[] = [
  { id: 'top', title: '1. satır', hint: '"Yeni Eklenenler" altında, masaüstünde yan yana 4 banner. Önerilen boyut 580×330.' },
  { id: 'middle', title: '2. satır', hint: 'Ortadaki satır, yan yana 3 banner. Önerilen boyut 780×340.' },
  { id: 'bottom', title: '3. satır', hint: 'Sayfanın altında, yan yana 2 geniş banner. Önerilen boyut 1180×270.' },
];

export function HomeBannersEditor({ canWrite }: { canWrite: boolean }) {
  const [data, setData] = useState<HomeBannersContent | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    pagesApi.getHomeBanners().then(setData).catch((err) => setError(err instanceof Error ? err.message : 'Yüklenemedi'));
  }, []);

  if (error && !data) return <p className="admin-error">{error}</p>;
  if (!data) return <TableSkeleton rows={4} />;

  const setRow = (row: Row, items: HomeBannerItem[]) => setData({ ...data, [row]: items });
  const patch = (row: Row, index: number, change: Partial<HomeBannerItem>) =>
    setRow(row, data[row].map((b, i) => (i === index ? { ...b, ...change } : b)));
  const move = (row: Row, index: number, dir: -1 | 1) => {
    const next = [...data[row]];
    [next[index], next[index + dir]] = [next[index + dir], next[index]];
    setRow(row, next);
  };
  const save = async () => {
    const missing = ROWS.find((r) => data[r.id].some((b) => !b.image));
    if (missing) {
      setError(`${missing.title}: görseli olmayan banner var. Görsel yükleyin ya da banner'ı silin.`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const saved = await pagesApi.saveHomeBanners(data);
      setData(saved);
      toast.success('Bannerlar kaydedildi');
    } catch (err) {
      const msg = err instanceof ApiError ? (Object.values(err.issues)[0] ?? err.message) : err instanceof Error ? err.message : 'Kaydedilemedi';
      setError(msg);
      toast.error('Kaydedilemedi', msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="admin-hint">Ana sayfadaki marka bannerları. Banner&apos;a tıklanınca bağlantısı açılır: / ile başlayan site içi adres (örn. /kategori/capella, /arama?q=Halo) ya da tam adres.</p>
        {canWrite && <button type="button" className="admin-btn admin-btn-primary admin-btn-sm shrink-0" disabled={busy} onClick={() => void save()}><Save size={14} /> {busy ? 'Kaydediliyor…' : 'Kaydet'}</button>}
      </div>
      {error && <p className="admin-error" role="alert">{error}</p>}

      {ROWS.map((row) => (
        <section key={row.id} className="admin-card flex flex-col gap-2" style={{ padding: 16 }}>
          <div>
            <h2 className="text-sm font-semibold text-[var(--brand-purple-deep)]">{row.title}</h2>
            <p className="admin-hint">{row.hint}</p>
          </div>
          {data[row.id].length === 0 && <p className="admin-hint">Bu satırda banner yok; satır vitrinde gizlenir.</p>}
          {data[row.id].map((b, i) => (
            <div key={i} className="flex flex-wrap items-start gap-3 rounded-lg border border-[var(--admin-border)] p-2.5">
              <div className="min-w-[260px] flex-1">
                <ImagePicker label="Banner görseli" value={b.image} disabled={!canWrite} onChange={(image) => patch(row.id, i, { image })} />
              </div>
              <div className="flex min-w-[220px] flex-1 flex-col gap-1.5">
                <label className="flex flex-col gap-0.5 text-xs font-medium">
                  Tıklanınca açılacak bağlantı
                  <input className="admin-input" disabled={!canWrite} value={b.href} placeholder="/kategori/..."
                    onChange={(e) => patch(row.id, i, { href: e.target.value })} />
                </label>
                <label className="flex flex-col gap-0.5 text-xs font-medium">
                  Açıklama (görme engelliler ve arama motorları için)
                  <input className="admin-input" disabled={!canWrite} value={b.alt} placeholder="örn. Halo aromaları"
                    onChange={(e) => patch(row.id, i, { alt: e.target.value })} />
                </label>
              </div>
              {canWrite && (
                <div className="flex gap-1">
                  <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" disabled={i === 0} onClick={() => move(row.id, i, -1)} aria-label="Öne taşı"><ArrowUp size={13} /></button>
                  <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" disabled={i === data[row.id].length - 1} onClick={() => move(row.id, i, 1)} aria-label="Sona taşı"><ArrowDown size={13} /></button>
                  <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => setRow(row.id, data[row.id].filter((_, j) => j !== i))} aria-label="Sil"><Trash2 size={13} /></button>
                </div>
              )}
            </div>
          ))}
          {canWrite && data[row.id].length < 8 && (
            <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm self-start"
              onClick={() => setRow(row.id, [...data[row.id], { image: '', alt: '', href: '/' }])}>
              <Plus size={13} /> Banner ekle
            </button>
          )}
        </section>
      ))}
    </div>
  );
}
