'use client';

// Panel > Sayfalar > Mega menü: vitrindeki "Tüm Kategoriler" açılır menüsünün
// sütunları, başlıkları, öğe sırası ve koleksiyon kutusu.

import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, FolderTree, Link2, Plus, RotateCcw, Save, Trash2 } from 'lucide-react';
import { useAdminData } from '@/components/admin/AdminDataProvider';
import { TableSkeleton } from '@/components/admin/primitives';
import { pagesApi } from '@/lib/admin/pages-client';
import { categoryTree } from '@/lib/admin/mutations';
import { ApiError } from '@/lib/admin/client';
import {
  MEGA_MENU_MAX_COLUMNS,
  defaultMegaMenu,
  type MegaMenuColumn,
  type MegaMenuContent,
  type MegaMenuItem,
} from '@/lib/mega-menu';
import { toast } from '@/store/toast';

function swap<T>(list: T[], i: number, j: number): T[] {
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

export function MegaMenuEditor({ canWrite }: { canWrite: boolean }) {
  const { categories: adminCategories } = useAdminData();
  const [data, setData] = useState<MegaMenuContent | null>(null);
  const [isDefault, setIsDefault] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Vitrindeki kategori biçimi (slug + üst slug), Kategoriler sayfasındaki sırayla.
  const tree = useMemo(
    () => categoryTree([...adminCategories].sort((a, b) => a.order - b.order)),
    [adminCategories],
  );
  const categories = useMemo(() => {
    const slugById = new Map(adminCategories.map((c) => [c.id, c.slug]));
    return tree.map(({ category: c }) => ({
      slug: c.slug,
      name: c.name,
      tagline: c.tagline,
      parentSlug: c.parentId ? (slugById.get(c.parentId) ?? null) : null,
    }));
  }, [tree, adminCategories]);

  useEffect(() => {
    pagesApi
      .getMegaMenu()
      .then((saved) => {
        setIsDefault(!saved);
        setData(saved ?? defaultMegaMenu(categories));
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Yüklenemedi'));
    // Kategoriler panel açılışında yüklüdür; varsayılan bir kez kurulur.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Menüde hiç görünmeyen kategoriler (doğrudan ya da bir üstün altı olarak).
  const missing = useMemo(() => {
    if (!data) return [];
    const shown = new Set<string>();
    const addTree = (slug: string) => {
      shown.add(slug);
      categories.filter((c) => c.parentSlug === slug).forEach((c) => addTree(c.slug));
    };
    for (const col of data.columns)
      for (const it of col.items)
        if (it.type === 'category') {
          if (it.showChildren) addTree(it.slug);
          else shown.add(it.slug);
        }
    return categories.filter((c) => !shown.has(c.slug));
  }, [data, categories]);

  if (error && !data) return <p className="admin-error">{error}</p>;
  if (!data) return <TableSkeleton rows={4} />;

  const setColumns = (columns: MegaMenuColumn[]) => setData({ ...data, columns });
  const patchColumn = (ci: number, change: Partial<MegaMenuColumn>) =>
    setColumns(data.columns.map((c, i) => (i === ci ? { ...c, ...change } : c)));
  const setItems = (ci: number, items: MegaMenuItem[]) => patchColumn(ci, { items });
  const patchItem = (ci: number, ii: number, change: Partial<MegaMenuItem>) =>
    setItems(ci, data.columns[ci].items.map((it, j) => (j === ii ? ({ ...it, ...change } as MegaMenuItem) : it)));
  const moveItemToColumn = (ci: number, ii: number, target: number) => {
    const item = data.columns[ci].items[ii];
    setColumns(
      data.columns.map((c, i) =>
        i === ci ? { ...c, items: c.items.filter((_, j) => j !== ii) } : i === target ? { ...c, items: [...c.items, item] } : c,
      ),
    );
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const saved = await pagesApi.saveMegaMenu(data);
      setData(saved);
      setIsDefault(false);
      toast.success('Mega menü kaydedildi');
    } catch (err) {
      const msg = err instanceof ApiError ? (Object.values(err.issues)[0] ?? err.message) : err instanceof Error ? err.message : 'Kaydedilemedi';
      setError(msg);
      toast.error('Kaydedilemedi', msg);
    } finally {
      setBusy(false);
    }
  };

  const nameOf = (slug: string) => categories.find((c) => c.slug === slug)?.name;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="admin-hint max-w-[640px]">
          Vitrinde &quot;Tüm Kategoriler&quot; butonuna basınca açılan menü. Sütunları, başlıkları ve öğelerin sırasını buradan
          belirleyin. Kategori adı Kategoriler sayfasından gelir; alt kategoriler oradaki sırayla gösterilir.
          {isDefault && ' Şu an otomatik (varsayılan) düzen gösteriliyor; kaydedince sizin düzeniniz geçerli olur.'}
        </p>
        {canWrite && (
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              className="admin-btn admin-btn-ghost admin-btn-sm"
              disabled={busy}
              onClick={() => setData(defaultMegaMenu(categories))}
              title="Formu otomatik düzene getirir; kaydetmeden yayına girmez"
            >
              <RotateCcw size={14} /> Varsayılan düzen
            </button>
            <button type="button" className="admin-btn admin-btn-primary admin-btn-sm" disabled={busy} onClick={() => void save()}>
              <Save size={14} /> {busy ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </div>
        )}
      </div>
      {error && <p className="admin-error" role="alert">{error}</p>}

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          disabled={!canWrite}
          checked={data.showCollections}
          onChange={(e) => setData({ ...data, showCollections: e.target.checked })}
        />
        Sağda &quot;Öne Çıkan Koleksiyonlar&quot; kutusunu göster
      </label>

      {missing.length > 0 && (
        <div className="admin-card flex flex-wrap items-center gap-2" style={{ padding: 12 }}>
          <span className="text-xs font-semibold text-[var(--admin-ink-soft)]">Menüde görünmeyen kategoriler:</span>
          {missing.map((c) => (
            <button
              key={c.slug}
              type="button"
              className="admin-btn admin-btn-ghost admin-btn-sm"
              disabled={!canWrite}
              onClick={() => setItems(0, [...data.columns[0].items, { type: 'category', slug: c.slug, showChildren: true }])}
              title="1. sütunun sonuna ekle"
            >
              <Plus size={12} /> {c.name}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
        {data.columns.map((col, ci) => (
          <section key={ci} className="admin-card flex flex-col gap-2" style={{ padding: 12 }}>
            <div className="flex items-center gap-1.5">
              <input
                className="admin-input font-semibold"
                disabled={!canWrite}
                value={col.heading}
                placeholder={`${ci + 1}. sütun başlığı`}
                aria-label={`${ci + 1}. sütun başlığı`}
                onChange={(e) => patchColumn(ci, { heading: e.target.value })}
              />
              {canWrite && (
                <>
                  <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" disabled={ci === 0} onClick={() => setColumns(swap(data.columns, ci, ci - 1))} aria-label="Sütunu sola taşı" title="Sola taşı">
                    <ArrowLeft size={13} />
                  </button>
                  <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" disabled={ci === data.columns.length - 1} onClick={() => setColumns(swap(data.columns, ci, ci + 1))} aria-label="Sütunu sağa taşı" title="Sağa taşı">
                    <ArrowRight size={13} />
                  </button>
                  <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" disabled={data.columns.length === 1} onClick={() => setColumns(data.columns.filter((_, i) => i !== ci))} aria-label="Sütunu sil" title="Sütunu sil">
                    <Trash2 size={13} />
                  </button>
                </>
              )}
            </div>

            {col.items.length === 0 && <p className="admin-hint">Bu sütun boş (vitrinde gizlenir).</p>}

            {col.items.map((it, ii) => (
              <div key={ii} className="flex flex-col gap-1.5 rounded-lg border border-[var(--admin-border)] p-2">
                {it.type === 'category' ? (
                  <>
                    <div className="flex items-center gap-1.5">
                      <FolderTree size={14} className="shrink-0 text-[var(--admin-ink-soft)]" aria-hidden="true" />
                      <select
                        className="admin-select admin-btn-sm min-w-0 flex-1"
                        disabled={!canWrite}
                        value={it.slug}
                        aria-label="Kategori"
                        onChange={(e) => patchItem(ci, ii, { slug: e.target.value })}
                      >
                        {!nameOf(it.slug) && <option value={it.slug}>(silinmiş kategori: {it.slug})</option>}
                        {tree.map(({ category: c, depth }) => (
                          <option key={c.id} value={c.slug}>
                            {'— '.repeat(depth)}
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <label className="flex items-center gap-1.5 text-xs">
                      <input
                        type="checkbox"
                        disabled={!canWrite}
                        checked={it.showChildren}
                        onChange={(e) => patchItem(ci, ii, { showChildren: e.target.checked })}
                      />
                      Alt kategorileri göster
                    </label>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-1.5">
                      <Link2 size={14} className="shrink-0 text-[var(--admin-ink-soft)]" aria-hidden="true" />
                      <input className="admin-input admin-btn-sm min-w-0 flex-1" disabled={!canWrite} value={it.label} placeholder="Bağlantı adı" aria-label="Bağlantı adı"
                        onChange={(e) => patchItem(ci, ii, { label: e.target.value })} />
                    </div>
                    <input className="admin-input admin-btn-sm" disabled={!canWrite} value={it.href} placeholder="/kategori/... ya da https://..." aria-label="Bağlantı adresi"
                      onChange={(e) => patchItem(ci, ii, { href: e.target.value })} />
                  </>
                )}
                {canWrite && (
                  <div className="flex items-center gap-1">
                    <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" disabled={ii === 0} onClick={() => setItems(ci, swap(col.items, ii, ii - 1))} aria-label="Yukarı taşı">
                      <ArrowUp size={13} />
                    </button>
                    <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" disabled={ii === col.items.length - 1} onClick={() => setItems(ci, swap(col.items, ii, ii + 1))} aria-label="Aşağı taşı">
                      <ArrowDown size={13} />
                    </button>
                    {data.columns.length > 1 && (
                      <select
                        className="admin-select admin-btn-sm"
                        style={{ width: 'auto' }}
                        value=""
                        aria-label="Başka sütuna taşı"
                        onChange={(e) => e.target.value && moveItemToColumn(ci, ii, Number(e.target.value))}
                      >
                        <option value="">Sütuna taşı…</option>
                        {data.columns.map((c, i) =>
                          i === ci ? null : (
                            <option key={i} value={i}>
                              {c.heading || `${i + 1}. sütun`}
                            </option>
                          ),
                        )}
                      </select>
                    )}
                    <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm ml-auto" onClick={() => setItems(ci, col.items.filter((_, j) => j !== ii))} aria-label="Sil">
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>
            ))}

            {canWrite && (
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  className="admin-btn admin-btn-ghost admin-btn-sm"
                  disabled={!categories.length}
                  onClick={() => setItems(ci, [...col.items, { type: 'category', slug: (missing[0] ?? categories[0]).slug, showChildren: true }])}
                >
                  <Plus size={13} /> Kategori
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn-ghost admin-btn-sm"
                  onClick={() => setItems(ci, [...col.items, { type: 'link', label: '', href: '/', hint: '' }])}
                >
                  <Plus size={13} /> Bağlantı
                </button>
              </div>
            )}
          </section>
        ))}
      </div>

      {canWrite && data.columns.length < MEGA_MENU_MAX_COLUMNS && (
        <button type="button" className="admin-btn admin-btn-ghost self-start" onClick={() => setColumns([...data.columns, { heading: '', items: [] }])}>
          <Plus size={14} /> Sütun ekle
        </button>
      )}
    </div>
  );
}
