'use client';

import { createPortal } from 'react-dom';
import { useMemo, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import type { AdminCategory, AdminCollection } from '@/types/admin';
import { useAdminData } from './AdminDataProvider';
import { ConfirmDialog } from './ConfirmDialog';
import { EmptyState, Field, TableSkeleton } from './primitives';
import { ReorderableList } from './ReorderableList';
import { UnsavedGuard } from './UnsavedGuard';
import { useDialog, useMounted, useScrollLock } from '@/lib/hooks';
import { slugify } from '@/lib/utils';
import { localId } from '@/lib/admin/variants';

type Kind = 'category' | 'collection';
type Item = AdminCategory | AdminCollection;

const ACCENTS = ['purple', 'gold', 'fresh', 'dark'] as const;

function blankCategory(): AdminCategory {
  return {
    id: localId('cat'),
    slug: '',
    name: '',
    tagline: '',
    description: '',
    cover: '',
    icon: '',
    subcategories: [],
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

export function TaxonomyManager({ kind }: { kind: Kind }) {
  const data = useAdminData();
  const mounted = useMounted();

  const list: Item[] = kind === 'category' ? data.categories : data.collections;
  const usageCount = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of data.products) {
      const ids = kind === 'category' ? p.categoryIds : p.collectionIds;
      for (const id of ids) map.set(id, (map.get(id) ?? 0) + 1);
    }
    return map;
  }, [data.products, kind]);

  const [editing, setEditing] = useState<Item | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const openNew = () => {
    setEditing(kind === 'category' ? blankCategory() : blankCollection());
    setCreating(true);
  };

  const reorder = (orderedIds: string[]) => {
    if (kind === 'category') void data.reorderCategories(orderedIds);
    else void data.reorderCollections(orderedIds);
  };

  const remove = async (id: string) => {
    setConfirmId(null);
    if (kind === 'category') await data.deleteCategory(id);
    else await data.deleteCollection(id);
  };

  const title = kind === 'category' ? 'Kategoriler' : 'Koleksiyonlar';

  if (data.status === 'loading') return <TableSkeleton rows={5} />;

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-[var(--brand-purple-deep)]">{title}</h1>
          <p className="admin-hint mt-0.5">Sürükleyerek sıralayın · {list.length} kayıt</p>
        </div>
        <button
          type="button"
          className="admin-btn admin-btn-primary"
          onClick={openNew}
          disabled={!data.canWrite}
        >
          <Plus size={15} aria-hidden="true" /> Yeni {kind === 'category' ? 'kategori' : 'koleksiyon'}
        </button>
      </header>

      {list.length === 0 ? (
        <div className="admin-card">
          <EmptyState title="Kayıt yok" hint="İlk kaydı ekleyin." />
        </div>
      ) : (
        <ReorderableList
          items={list}
          getId={(item) => item.id}
          disabled={!data.canWrite}
          onReorder={reorder}
          renderItem={(item) => (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[var(--brand-purple-deep)]">
                  {item.name || <span className="italic text-[var(--admin-ink-soft)]">(adsız)</span>}
                </p>
                <p className="admin-hint truncate">
                  /{item.slug} · {usageCount.get(item.id) ?? 0} ürün
                </p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <button
                  type="button"
                  className="admin-btn admin-btn-ghost admin-btn-sm"
                  onClick={() => {
                    setEditing(item);
                    setCreating(false);
                  }}
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
          )}
        />
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
        title={`${kind === 'category' ? 'Kategoriyi' : 'Koleksiyonu'} sil?`}
        description="Bağlı ürünlerden bu bağ kaldırılır. Bir kategoriye tek bağlı ürün varsa silme engellenir."
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
              <Field label="İkon (yol)" htmlFor="tx-icon">
                <input
                  id="tx-icon"
                  className="admin-input"
                  value={cat.icon}
                  disabled={readOnly}
                  onChange={(e) => set({ icon: e.target.value })}
                />
              </Field>
              <Field
                label="Alt kategoriler"
                htmlFor="tx-subs"
                hint="Virgülle ayırın"
              >
                <input
                  id="tx-subs"
                  className="admin-input"
                  value={cat.subcategories.join(', ')}
                  disabled={readOnly}
                  onChange={(e) =>
                    set({
                      subcategories: e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
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

          <Field label="Kapak görseli (yol)" htmlFor="tx-cover">
            <input
              id="tx-cover"
              className="admin-input"
              value={draft.cover}
              disabled={readOnly}
              onChange={(e) => set({ cover: e.target.value })}
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
