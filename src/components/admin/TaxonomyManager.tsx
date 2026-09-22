'use client';

import { createPortal } from 'react-dom';
import { useMemo, useState } from 'react';
import { CornerDownRight, Pencil, Plus, Trash2 } from 'lucide-react';
import type { AdminCategory, AdminCollection } from '@/types/admin';
import { useAdminData } from './AdminDataProvider';
import { ConfirmDialog } from './ConfirmDialog';
import { ImagePicker } from './ImagePicker';
import { EmptyState, Field, TableSkeleton } from './primitives';
import { ReorderableList } from './ReorderableList';
import { UnsavedGuard } from './UnsavedGuard';
import { useDialog, useMounted, useScrollLock } from '@/lib/hooks';
import { slugify } from '@/lib/utils';
import { localId } from '@/lib/admin/variants';
import { categoryDescendantIds } from '@/lib/admin/mutations';

type Kind = 'category' | 'collection';
type Item = AdminCategory | AdminCollection;

const ACCENTS = ['purple', 'gold', 'fresh', 'dark'] as const;

function blankCategory(parentId: string | null = null): AdminCategory {
  return {
    id: localId('cat'),
    slug: '',
    name: '',
    tagline: '',
    description: '',
    cover: '',
    icon: '',
    subcategories: [],
    parentId,
    accent: 'purple',
    order: 999,
  };
}

function blankCollection(): AdminCollection {
  return {
    id: localId('col'),
    slug: '',
    name: '',
    subtitle: '',
    description: '',
    cover: '',
    atmosphere: '',
    order: 999,
  };
}

/** Bir üst kategorinin doğrudan çocukları, panel sırasına göre. */
function childrenOf(categories: AdminCategory[], parentId: string | null): AdminCategory[] {
  return categories.filter((c) => (c.parentId ?? null) === parentId);
}

/**
 * Ağacı derinlik-öncelikli düz listeye indirger: sunucuya gönderilen
 * `orderedIds` her zaman "önce üst, hemen ardından altları" sırasındadır.
 */
function flattenTree(categories: AdminCategory[], parentId: string | null = null): string[] {
  return childrenOf(categories, parentId).flatMap((c) => [c.id, ...flattenTree(categories, c.id)]);
}

export function TaxonomyManager({ kind }: { kind: Kind }) {
  const data = useAdminData();
  const mounted = useMounted();

  const isCategory = kind === 'category';
  const list: Item[] = isCategory ? data.categories : data.collections;
  const categories = data.categories;

  const usageCount = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of data.products) {
      const ids = isCategory ? p.categoryIds : p.collectionIds;
      for (const id of ids) map.set(id, (map.get(id) ?? 0) + 1);
    }
    return map;
  }, [data.products, isCategory]);

  const [editing, setEditing] = useState<Item | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const openNew = (parentId: string | null = null) => {
    setEditing(isCategory ? blankCategory(parentId) : blankCollection());
    setCreating(true);
  };

  const openEdit = (item: Item) => {
    setEditing(item);
    setCreating(false);
  };

  const remove = async (id: string) => {
    setConfirmId(null);
    if (isCategory) await data.deleteCategory(id);
    else await data.deleteCollection(id);
  };

  /**
   * Kardeş grubu içinde sıralama. Ağacın geri kalanı korunur; sunucuya
   * yeniden hesaplanmış tam DFS sırası gider.
   */
  const reorderSiblings = (parentId: string | null, orderedIds: string[]) => {
    // Grubun elindeki sıra değerleri (slotlar) sabit kalır, yalnızca hangi
    // kaydın hangi slota düştüğü değişir — ağacın geri kalanı yerinde kalır.
    const slots = childrenOf(categories, parentId)
      .map((c) => c.order)
      .sort((a, b) => a - b);
    const orderById = new Map(categories.map((c) => [c.id, c.order]));
    orderedIds.forEach((id, i) => orderById.set(id, slots[i] ?? i));
    const next = [...categories].sort(
      (a, b) => (orderById.get(a.id) ?? 0) - (orderById.get(b.id) ?? 0),
    );
    void data.reorderCategories(flattenTree(next));
  };

  const rootCount = isCategory ? childrenOf(categories, null).length : list.length;
  const title = isCategory ? 'Kategoriler' : 'Koleksiyonlar';
  const confirmTarget = list.find((i) => i.id === confirmId);
  const childCount = isCategory && confirmTarget
    ? childrenOf(categories, confirmTarget.id).length
    : 0;

  if (data.status === 'loading') return <TableSkeleton rows={5} />;

  const row = (item: Item, depth: number) => (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="flex items-center gap-1 truncate text-sm font-medium text-[var(--brand-purple-deep)]">
          {depth > 0 && (
            <CornerDownRight
              size={13}
              className="shrink-0 text-[var(--admin-ink-soft)]"
              aria-hidden="true"
            />
          )}
          {item.name || <span className="italic text-[var(--admin-ink-soft)]">(adsız)</span>}
        </p>
        <p className="admin-hint truncate">
          /{item.slug} · {usageCount.get(item.id) ?? 0} ürün
          {isCategory && childrenOf(categories, item.id).length > 0
            ? ` · ${childrenOf(categories, item.id).length} alt kategori`
            : ''}
        </p>
      </div>
      <div className="flex shrink-0 gap-1.5">
        {isCategory && (
          <button
            type="button"
            className="admin-btn admin-btn-ghost admin-btn-sm"
            disabled={!data.canWrite}
            onClick={() => openNew(item.id)}
            aria-label={`${item.name} altına alt kategori ekle`}
            title="Alt kategori ekle"
          >
            <Plus size={13} />
          </button>
        )}
        <button
          type="button"
          className="admin-btn admin-btn-ghost admin-btn-sm"
          onClick={() => openEdit(item)}
          aria-label={`${item.name} düzenle`}
        >
          <Pencil size={13} />
        </button>
        <button
          type="button"
          className="admin-btn admin-btn-danger admin-btn-sm"
          disabled={!data.canWrite}
          onClick={() => setConfirmId(item.id)}
          aria-label={`${item.name} sil`}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );

  /** Bir seviyeyi çizer; alt seviyeler kendi sürükle-bırak listesinde iç içe gelir. */
  const branch = (parentId: string | null, depth: number) => {
    const items = childrenOf(categories, parentId);
    if (items.length === 0) return null;
    return (
      <ReorderableList
        items={items}
        getId={(item) => item.id}
        disabled={!data.canWrite}
        onReorder={(ids) => reorderSiblings(parentId, ids)}
        renderItem={(item) => (
          <div className="flex flex-col gap-1.5">
            {row(item, depth)}
            {childrenOf(categories, item.id).length > 0 && (
              <div className="ml-3 border-l-2 border-[var(--admin-line)] pl-3">
                {branch(item.id, depth + 1)}
              </div>
            )}
          </div>
        )}
      />
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-[var(--brand-purple-deep)]">{title}</h1>
          <p className="admin-hint mt-0.5">
            Sürükleyerek sıralayın · {list.length} kayıt
            {isCategory && list.length !== rootCount
              ? ` (${rootCount} ana, ${list.length - rootCount} alt)`
              : ''}
          </p>
        </div>
        <button
          type="button"
          className="admin-btn admin-btn-primary"
          onClick={() => openNew(null)}
          disabled={!data.canWrite}
        >
          <Plus size={15} aria-hidden="true" /> Yeni {isCategory ? 'kategori' : 'koleksiyon'}
        </button>
      </header>

      {list.length === 0 ? (
        <div className="admin-card">
          <EmptyState title="Kayıt yok" hint="İlk kaydı ekleyin." />
        </div>
      ) : isCategory ? (
        branch(null, 0)
      ) : (
        <ReorderableList
          items={list}
          getId={(item) => item.id}
          disabled={!data.canWrite}
          onReorder={(ids) => void data.reorderCollections(ids)}
          renderItem={(item) => row(item, 0)}
        />
      )}

      {isCategory && (
        <p className="admin-hint">
          Alt kategoriler üst kategorinin altında girintili görünür. Sürükleme yalnızca aynı
          seviyedeki kardeşler arasında çalışır; seviyeyi değiştirmek için kaydı düzenleyip
          <strong> Üst kategori</strong> alanını değiştirin.
        </p>
      )}

      {mounted &&
        editing &&
        createPortal(
          <TaxonomyDrawer
            kind={kind}
            initial={editing}
            creating={creating}
            readOnly={!data.canWrite}
            onClose={() => setEditing(null)}
            onSaved={() => setEditing(null)}
          />,
          document.body,
        )}

      <ConfirmDialog
        open={confirmId !== null}
        title={`${isCategory ? 'Kategoriyi' : 'Koleksiyonu'} sil?`}
        description={
          childCount > 0
            ? `Bağlı ürünlerden bu bağ kaldırılır. ${childCount} alt kategori silinmez, bir üst seviyeye taşınır. Bir kategoriye tek bağlı ürün varsa silme engellenir.`
            : 'Bağlı ürünlerden bu bağ kaldırılır. Bir kategoriye tek bağlı ürün varsa silme engellenir.'
        }
        confirmLabel="Sil"
        destructive
        onConfirm={() => confirmId && remove(confirmId)}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}

function TaxonomyDrawer({
  kind,
  initial,
  creating,
  readOnly,
  onClose,
  onSaved,
}: {
  kind: Kind;
  initial: Item;
  creating: boolean;
  readOnly: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const data = useAdminData();
  const ref = useDialog(true, onClose);
  useScrollLock(true);

  const [draft, setDraft] = useState<Item>(initial);
  const [saving, setSaving] = useState(false);
  const [slugTouched, setSlugTouched] = useState(!creating);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);

  const isCategory = kind === 'category';
  const cat = draft as AdminCategory;
  const col = draft as AdminCollection;

  // Üst kategori seçenekleri: kendisi ve kendi alt ağacı hariç (döngü olmasın).
  const parentOptions = useMemo(() => {
    if (!isCategory) return [];
    const blocked = new Set(creating ? [cat.id] : categoryDescendantIds(data.categories, cat.id));
    const depth = new Map<string, number>();
    const walk = (parentId: string | null, level: number) => {
      for (const c of data.categories.filter((x) => (x.parentId ?? null) === parentId)) {
        depth.set(c.id, level);
        walk(c.id, level + 1);
      }
    };
    walk(null, 0);
    return data.categories
      .filter((c) => !blocked.has(c.id))
      .sort((a, b) => a.order - b.order)
      .map((c) => ({ id: c.id, label: `${'— '.repeat(depth.get(c.id) ?? 0)}${c.name || c.slug}` }));
  }, [isCategory, creating, cat.id, data.categories]);

  const children = isCategory
    ? data.categories.filter((c) => c.parentId === cat.id && c.id !== cat.id)
    : [];

  const set = (patch: Partial<AdminCategory> & Partial<AdminCollection>) =>
    setDraft((d) => ({ ...d, ...patch }) as Item);

  const save = async () => {
    setSaving(true);
    let ok = false;
    if (isCategory) {
      ok = creating
        ? await data.saveCategory(draft as AdminCategory)
        : await data.updateCategory(draft.id, draft as AdminCategory);
    } else {
      ok = creating
        ? await data.saveCollection(draft as AdminCollection)
        : await data.updateCollection(draft.id, draft as AdminCollection);
    }
    setSaving(false);
    if (ok) onSaved();
  };

  return (
    <div className="admin-dialog-backdrop" style={{ placeItems: 'stretch' }} onMouseDown={onClose}>
      <div
        ref={ref}
        className="admin-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={`${isCategory ? 'Kategori' : 'Koleksiyon'} düzenle`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <UnsavedGuard when={dirty && !saving} />
        <header className="flex items-center justify-between border-b border-[var(--admin-line)] p-4">
          <h2 className="text-sm font-semibold text-[var(--brand-purple-deep)]">
            {creating ? 'Yeni' : 'Düzenle'} · {isCategory ? 'Kategori' : 'Koleksiyon'}
          </h2>
          <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={onClose}>
            Kapat
          </button>
        </header>

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
          <Field label="Ad" htmlFor="tx-name" required>
            <input
              id="tx-name"
              className="admin-input"
              value={draft.name}
              disabled={readOnly}
              onChange={(e) =>
                set(slugTouched ? { name: e.target.value } : { name: e.target.value, slug: slugify(e.target.value) })
              }
            />
          </Field>
          <Field label="Slug" htmlFor="tx-slug" required>
            <input
              id="tx-slug"
              className="admin-input"
              value={draft.slug}
              disabled={readOnly}
              onChange={(e) => {
                setSlugTouched(true);
                set({ slug: e.target.value });
              }}
            />
          </Field>

          {isCategory ? (
            <>
              <Field
                label="Üst kategori"
                htmlFor="tx-parent"
                hint="Boş bırakılırsa ana kategori olur. Seçilirse bu kategori seçilenin altında listelenir."
              >
                <select
                  id="tx-parent"
                  className="admin-select"
                  value={cat.parentId ?? ''}
                  disabled={readOnly}
                  onChange={(e) => set({ parentId: e.target.value || null })}
                >
                  <option value="">Yok (ana kategori)</option>
                  {parentOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>

              {children.length > 0 && (
                <Field label="Alt kategoriler" htmlFor="tx-children">
                  <ul id="tx-children" className="flex flex-wrap gap-1.5">
                    {children.map((c) => (
                      <li
                        key={c.id}
                        className="rounded-full border border-[var(--admin-line)] px-2.5 py-1 text-xs text-[var(--admin-ink-soft)]"
                      >
                        {c.name || c.slug}
                      </li>
                    ))}
                  </ul>
                  <p className="admin-hint">
                    Alt kategoriler ayrı birer kategoridir; kendi sayfalarından düzenlenir.
                  </p>
                </Field>
              )}

              <Field label="Slogan" htmlFor="tx-tagline">
                <input
                  id="tx-tagline"
                  className="admin-input"
                  value={cat.tagline}
                  disabled={readOnly}
                  onChange={(e) => set({ tagline: e.target.value })}
                />
              </Field>
              <Field label="Vurgu rengi" htmlFor="tx-accent">
                <select
                  id="tx-accent"
                  className="admin-select"
                  value={cat.accent}
                  disabled={readOnly}
                  onChange={(e) => set({ accent: e.target.value as AdminCategory['accent'] })}
                >
                  {ACCENTS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="İkon">
                <ImagePicker
                  label="İkon"
                  shape="square"
                  value={cat.icon}
                  disabled={readOnly}
                  onChange={(src) => set({ icon: src })}
                />
              </Field>
            </>
          ) : (
            <>
              <Field label="Alt başlık" htmlFor="tx-subtitle">
                <input
                  id="tx-subtitle"
                  className="admin-input"
                  value={col.subtitle}
                  disabled={readOnly}
                  onChange={(e) => set({ subtitle: e.target.value })}
                />
              </Field>
              <Field label="Atmosfer" htmlFor="tx-atmo">
                <input
                  id="tx-atmo"
                  className="admin-input"
                  value={col.atmosphere}
                  disabled={readOnly}
                  onChange={(e) => set({ atmosphere: e.target.value })}
                />
              </Field>
            </>
          )}

          <Field label="Kapak görseli">
            <ImagePicker
              label="Kapak görseli"
              value={draft.cover}
              disabled={readOnly}
              onChange={(src) => set({ cover: src })}
            />
          </Field>
          <Field label="Açıklama" htmlFor="tx-desc">
            <textarea
              id="tx-desc"
              className="admin-textarea"
              value={draft.description}
              disabled={readOnly}
              onChange={(e) => set({ description: e.target.value })}
            />
          </Field>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-[var(--admin-line)] p-4">
          <button type="button" className="admin-btn admin-btn-ghost" onClick={onClose}>
            Vazgeç
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={save}
            disabled={readOnly || saving || (!creating && !dirty)}
          >
            {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </footer>
      </div>
    </div>
  );
}
