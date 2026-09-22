'use client';

import { useMemo, useState } from 'react';
import type { AdminCategory } from '@/types/admin';
import { categoryTree } from '@/lib/admin/mutations';
import { localId } from '@/lib/admin/variants';
import { slugify } from '@/lib/utils';
import { useAdminData } from './AdminDataProvider';

interface Props {
  /** Ürüne bağlı kategori kimlikleri. */
  selected: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  error?: string;
}

const TABS = [
  { id: 'all', label: 'Tüm kategoriler' },
  { id: 'popular', label: 'En çok kullanılan' },
] as const;

type TabId = (typeof TABS)[number]['id'];

/**
 * WordPress'teki "Ürün kategorileri" kutusu: sekmeli, kendi içinde kaydırılan
 * liste ve alt kategorileri üstünün altında girintili gösteren onay kutuları.
 * Alttaki bağlantı, sayfadan ayrılmadan yeni kategori açar.
 */
export function ProductCategoryBox({ selected, onChange, disabled, error }: Props) {
  const { categories, products, canWrite, saveCategory } = useAdminData();
  const [tab, setTab] = useState<TabId>('all');
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newParent, setNewParent] = useState('');
  const [saving, setSaving] = useState(false);

  const readOnly = disabled || !canWrite;

  // "En çok kullanılan": ürün sayısına göre ilk 10, WordPress gibi düz liste.
  const popular = useMemo(() => {
    const count = new Map<string, number>();
    for (const p of products) {
      for (const id of p.categoryIds) count.set(id, (count.get(id) ?? 0) + 1);
    }
    return [...categories]
      .sort((a, b) => (count.get(b.id) ?? 0) - (count.get(a.id) ?? 0))
      .slice(0, 10);
  }, [categories, products]);

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };

  const rows: { category: AdminCategory; depth: number }[] =
    tab === 'all'
      ? categoryTree(categories)
      : popular.map((category) => ({ category, depth: 0 }));

  const addCategory = async () => {
    const name = newName.trim();
    if (!name) return;
    setSaving(true);
    const id = localId('cat');
    const ok = await saveCategory({
      id,
      slug: slugify(name),
      name,
      tagline: '',
      description: '',
      cover: '',
      icon: '',
      subcategories: [],
      parentId: newParent || null,
      accent: 'purple',
      order: categories.length,
    });
    setSaving(false);
    if (ok) {
      // Yeni kategori WordPress'teki gibi otomatik işaretlenir.
      onChange([...selected, id]);
      setNewName('');
      setNewParent('');
      setAdding(false);
    }
  };

  return (
    <div className="admin-termbox">
      <div className="admin-termbox-tabs" role="tablist" aria-label="Kategori listesi">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className="admin-termbox-tab"
            data-active={tab === t.id || undefined}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="admin-termbox-list" role="tabpanel">
        {rows.length === 0 ? (
          <p className="admin-hint">Kategori yok.</p>
        ) : (
          rows.map(({ category: c, depth }) => (
            <label
              key={c.id}
              className="admin-termbox-row"
              style={{ paddingLeft: depth * 18 }}
              title={c.name}
            >
              <input
                type="checkbox"
                checked={selected.includes(c.id)}
                disabled={readOnly}
                onChange={() => toggle(c.id)}
              />
              <span>{c.name || c.slug}</span>
            </label>
          ))
        )}
      </div>

      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}

      {!readOnly && (
        <div className="admin-termbox-add">
          {adding ? (
            <div className="flex flex-col gap-1.5">
              <input
                className="admin-input admin-btn-sm"
                placeholder="Yeni kategori adı"
                value={newName}
                autoFocus
                disabled={saving}
                aria-label="Yeni kategori adı"
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void addCategory();
                  }
                  if (e.key === 'Escape') setAdding(false);
                }}
              />
              <select
                className="admin-select admin-btn-sm"
                value={newParent}
                disabled={saving}
                aria-label="Üst kategori"
                onChange={(e) => setNewParent(e.target.value)}
              >
                <option value="">— Üst kategori —</option>
                {categoryTree(categories).map(({ category: c, depth }) => (
                  <option key={c.id} value={c.id}>
                    {' '.repeat(depth * 3)}
                    {c.name || c.slug}
                  </option>
                ))}
              </select>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  className="admin-btn admin-btn-primary admin-btn-sm"
                  disabled={saving || !newName.trim()}
                  onClick={() => void addCategory()}
                >
                  {saving ? 'Ekleniyor…' : 'Yeni kategoriyi ekle'}
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn-ghost admin-btn-sm"
                  disabled={saving}
                  onClick={() => {
                    setAdding(false);
                    setNewName('');
                    setNewParent('');
                  }}
                >
                  Vazgeç
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="admin-termbox-link" onClick={() => setAdding(true)}>
              + Yeni kategori ekle
            </button>
          )}
        </div>
      )}
    </div>
  );
}
