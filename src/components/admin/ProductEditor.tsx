'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, CopyPlus, ExternalLink, Eye, Plus, Trash2 } from 'lucide-react';
import type { AdminProduct, ProductStatus } from '@/types/admin';
import type { BadgeKind, FlavorNote, FlavorProfile, ProductForm } from '@/types';
import { productStatuses, statusLabels } from '@/types/admin';
import { adminProductSchema, fieldErrors } from '@/lib/admin/schema';
import { categoryTree } from '@/lib/admin/mutations';
import { hiddenDefaultVariant, localId } from '@/lib/admin/variants';
import { slugify } from '@/lib/utils';
import { formatDateTime } from '@/lib/admin/format';
import { openInStorefrontPath } from '@/lib/admin/preview';
import { useAdminData } from './AdminDataProvider';
import { Field } from './primitives';
import { ImageListEditor } from './ImageListEditor';
import { OptionEditor } from './OptionEditor';
import { VariantTable } from './VariantTable';
import { UnsavedGuard } from './UnsavedGuard';
import { ProductPreviewCard } from './ProductPreviewCard';

const FLAVOR_PROFILES: { id: FlavorProfile; label: string }[] = [
  { id: 'meyveli', label: 'Meyveli' },
  { id: 'ferah', label: 'Ferah' },
  { id: 'tatli', label: 'Tatlı' },
  { id: 'eksi', label: 'Ekşi' },
  { id: 'kremsi', label: 'Kremsi' },
  { id: 'tutun', label: 'Tütün' },
  { id: 'icecek', label: 'İçecek' },
  { id: 'mentollu', label: 'Mentollü' },
];

const FORMS: { id: ProductForm; label: string }[] = [
  { id: 'konsantre', label: 'Konsantre Aroma' },
  { id: 'shortfill', label: 'Shortfill' },
  { id: 'diy-kit', label: 'DIY Kit' },
  { id: 'baz', label: 'Baz / Nbase' },
];

const BADGES: { id: BadgeKind; label: string }[] = [
  { id: 'yeni', label: 'Yeni' },
  { id: 'cok-satan', label: 'Çok satan' },
  { id: 'sinirli-seri', label: 'Sınırlı seri' },
  { id: 'indirim', label: 'İndirim' },
];

const TASTE_AXES: { key: keyof AdminProduct['taste']; label: string }[] = [
  { key: 'sweetness', label: 'Tatlılık' },
  { key: 'freshness', label: 'Ferahlık' },
  { key: 'intensity', label: 'Yoğunluk' },
  { key: 'sourness', label: 'Ekşilik' },
  { key: 'creaminess', label: 'Kremsilik' },
];

export function blankProduct(firstCategoryId?: string): AdminProduct {
  const now = new Date().toISOString();
  return {
    id: localId('prod'),
    slug: '',
    name: '',
    series: '',
    shortDescription: '',
    description: '',
    subcategory: '',
    categoryIds: firstCategoryId ? [firstCategoryId] : [],
    collectionIds: [],
    tags: [],
    images: [],
    status: 'taslak',
    seo: { title: '', description: '' },
    flavorNotes: [],
    flavorProfiles: [],
    badges: [],
    featured: false,
    bestSeller: false,
    newArrival: false,
    taste: { sweetness: 5, freshness: 5, intensity: 5, sourness: 3, creaminess: 3 },
    form: 'konsantre',
    usageRate: '',
    steepTime: '',
    origin: '',
    faq: [],
    options: [],
    variants: [hiddenDefaultVariant({ sku: '' })],
    createdAt: now,
    updatedAt: now,
  };
}

interface Props {
  initial: AdminProduct;
  mode: 'create' | 'edit';
}

export function ProductEditor({ initial, mode }: Props) {
  const router = useRouter();
  const { categories, collections, canWrite, createProduct, updateProduct, duplicateProduct } =
    useAdminData();

  const [baseline, setBaseline] = useState(() => JSON.stringify(initial));
  const [draft, setDraft] = useState<AdminProduct>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [slugTouched, setSlugTouched] = useState(mode === 'edit');
  const [duplicating, setDuplicating] = useState(false);

  const dirty = useMemo(() => JSON.stringify(draft) !== baseline, [draft, baseline]);
  // Vitrin bağlantıları KAYITLI slug/duruma göre kurulur; formdaki henüz
  // kaydedilmemiş slug değişikliği yanlış adrese götürmesin.
  const saved = useMemo(() => JSON.parse(baseline) as AdminProduct, [baseline]);
  const readOnly = !canWrite;

  const set = (patch: Partial<AdminProduct>) => setDraft((d) => ({ ...d, ...patch }));

  const onName = (name: string) => {
    set(
      slugTouched
        ? { name }
        : { name, slug: slugify(name) },
    );
  };

  const toggleInArray = <T,>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter((x) => x !== value) : [...list, value];

  const save = async () => {
    const candidate: AdminProduct = { ...draft, updatedAt: new Date().toISOString() };
    const parsed = adminProductSchema.safeParse(candidate);
    if (!parsed.success) {
      const errs = fieldErrors(parsed.error);
      setErrors(errs);
      const first = document.querySelector('[aria-invalid="true"]');
      first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setErrors({});
    setSaving(true);
    if (mode === 'create') {
      const saved = await createProduct(parsed.data as AdminProduct);
      setSaving(false);
      if (saved) {
        setBaseline(JSON.stringify(saved));
        setDraft(saved);
        router.replace(`/admin/urunler/${saved.slug}`);
      }
    } else {
      const ok = await updateProduct(draft.id, parsed.data as AdminProduct);
      setSaving(false);
      if (ok) {
        const synced = { ...(parsed.data as AdminProduct) };
        setBaseline(JSON.stringify(synced));
        setDraft(synced);
      }
    }
  };

  /**
   * WordPress "Kopyala" / "Yeni bir taslak kopyalayın": tek bir çoğaltma
   * işlemi, iki giriş noktası — `open` kopyanın düzenleme ekranını açar.
   */
  const duplicate = async (open: boolean) => {
    setDuplicating(true);
    const copy = await duplicateProduct(saved.id);
    setDuplicating(false);
    if (copy && open) router.push(`/admin/urunler/${copy.slug}`);
  };

  const discard = () => {
    setDraft(JSON.parse(baseline) as AdminProduct);
    setErrors({});
  };

  const err = (path: string) => errors[path];

  return (
    <div className="flex flex-col gap-4">
      <UnsavedGuard when={dirty && !saving} />

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-[var(--brand-purple-deep)]">
            {mode === 'create' ? 'Yeni ürün' : draft.name || 'Ürün'}
          </h1>
          <p className="admin-hint mt-0.5">
            {mode === 'edit'
              ? `Oluşturuldu ${formatDateTime(draft.createdAt)} · Güncellendi ${formatDateTime(
                  draft.updatedAt,
                )}`
              : 'Zorunlu alanlar yıldızlıdır'}
          </p>
        </div>
        {mode === 'edit' && saved.slug && (
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={openInStorefrontPath(saved.slug, saved.status)}
              target="_blank"
              rel="noopener noreferrer"
              className="admin-btn admin-btn-ghost"
              title={
                saved.status === 'yayında'
                  ? 'Ürünü vitrinde yeni sekmede aç'
                  : 'Yayında olmayan ürünü önizleme modunda aç'
              }
            >
              {saved.status === 'yayında' ? <ExternalLink size={14} /> : <Eye size={14} />}
              {saved.status === 'yayında' ? 'Vitrinde aç' : 'Önizle'}
            </a>
            <button
              type="button"
              className="admin-btn admin-btn-ghost"
              disabled={readOnly || duplicating}
              onClick={() => void duplicate(false)}
              title="Bu ürünün taslak bir kopyasını oluştur, bu ekranda kal"
            >
              <Copy size={14} /> {duplicating ? 'Kopyalanıyor…' : 'Kopyala'}
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-ghost"
              disabled={readOnly || duplicating}
              onClick={() => void duplicate(true)}
              title="Taslak kopya oluştur ve kopyayı düzenlemeye aç"
            >
              <CopyPlus size={14} /> Yeni bir taslak kopyala
            </button>
          </div>
        )}
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Sol: içerik */}
        <div className="flex flex-col gap-4">
          <section className="admin-card" style={{ padding: 16 }}>
            <h2 className="mb-3 text-sm font-semibold text-[var(--brand-purple-deep)]">İçerik</h2>
            <div className="flex flex-col gap-3">
              <Field label="Ürün adı" htmlFor="p-name" required error={err('name')}>
                <input
                  id="p-name"
                  className="admin-input"
                  value={draft.name}
                  disabled={readOnly}
                  aria-invalid={err('name') ? 'true' : undefined}
                  onChange={(e) => onName(e.target.value)}
                />
              </Field>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Slug" htmlFor="p-slug" required error={err('slug')}>
                  <input
                    id="p-slug"
                    className="admin-input"
                    value={draft.slug}
                    disabled={readOnly}
                    aria-invalid={err('slug') ? 'true' : undefined}
                    onChange={(e) => {
                      setSlugTouched(true);
                      set({ slug: e.target.value });
                    }}
                  />
                </Field>
                <Field label="Seri" htmlFor="p-series" error={err('series')}>
                  <input
                    id="p-series"
                    className="admin-input"
                    value={draft.series}
                    disabled={readOnly}
                    onChange={(e) => set({ series: e.target.value })}
                  />
                </Field>
              </div>

              <Field
                label="Kısa açıklama"
                htmlFor="p-short"
                required
                error={err('shortDescription')}
                hint={`${draft.shortDescription.length}/280`}
              >
                <textarea
                  id="p-short"
                  className="admin-textarea"
                  value={draft.shortDescription}
                  disabled={readOnly}
                  aria-invalid={err('shortDescription') ? 'true' : undefined}
                  onChange={(e) => set({ shortDescription: e.target.value })}
                />
              </Field>

              <Field label="Uzun açıklama" htmlFor="p-desc" error={err('description')}>
                <textarea
                  id="p-desc"
                  className="admin-textarea"
                  style={{ minHeight: 140 }}
                  value={draft.description}
                  disabled={readOnly}
                  onChange={(e) => set({ description: e.target.value })}
                />
              </Field>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Alt kategori" htmlFor="p-subcat" error={err('subcategory')}>
                  <input
                    id="p-subcat"
                    className="admin-input"
                    list="subcat-options"
                    value={draft.subcategory}
                    disabled={readOnly}
                    onChange={(e) => set({ subcategory: e.target.value })}
                  />
                  {/* Öneriler: seçili kategorilerin alt kategorileri + eski serbest etiketler. */}
                  <datalist id="subcat-options">
                    {Array.from(
                      new Set([
                        ...categories
                          .filter((c) => c.parentId && draft.categoryIds.includes(c.parentId))
                          .map((c) => c.name),
                        ...categories
                          .filter((c) => draft.categoryIds.includes(c.id))
                          .flatMap((c) => c.subcategories),
                      ]),
                    ).map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </Field>
                <Field label="Form" htmlFor="p-form">
                  <select
                    id="p-form"
                    className="admin-select"
                    value={draft.form}
                    disabled={readOnly}
                    onChange={(e) => set({ form: e.target.value as ProductForm })}
                  >
                    {FORMS.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Kullanım oranı" htmlFor="p-usage">
                  <input
                    id="p-usage"
                    className="admin-input"
                    value={draft.usageRate}
                    disabled={readOnly}
                    onChange={(e) => set({ usageRate: e.target.value })}
                  />
                </Field>
                <Field label="Dinlendirme" htmlFor="p-steep">
                  <input
                    id="p-steep"
                    className="admin-input"
                    value={draft.steepTime}
                    disabled={readOnly}
                    onChange={(e) => set({ steepTime: e.target.value })}
                  />
                </Field>
                <Field label="Menşei" htmlFor="p-origin">
                  <input
                    id="p-origin"
                    className="admin-input"
                    value={draft.origin}
                    disabled={readOnly}
                    onChange={(e) => set({ origin: e.target.value })}
                  />
                </Field>
              </div>
            </div>
          </section>

          <section className="admin-card" style={{ padding: 16 }}>
            <h2 className="mb-3 text-sm font-semibold text-[var(--brand-purple-deep)]">
              Görseller
            </h2>
            <ImageListEditor
              images={draft.images}
              disabled={readOnly}
              error={err('images') || errorsForImagesAlt(draft)}
              onChange={(images) => set({ images })}
            />
          </section>

          <section className="admin-card" style={{ padding: 16 }}>
            <h2 className="mb-1 text-sm font-semibold text-[var(--brand-purple-deep)]">
              Seçenekler
            </h2>
            <p className="admin-hint mb-3">
              Seçenek/değer değiştikçe varyant matrisi yeniden üretilir; girilmiş fiyat/stok korunur.
            </p>
            <OptionEditor
              options={draft.options}
              variants={draft.variants}
              disabled={readOnly}
              onChange={(options, variants) => set({ options, variants })}
            />
          </section>

          <section className="admin-card" style={{ padding: 16 }}>
            <h2 className="mb-3 text-sm font-semibold text-[var(--brand-purple-deep)]">
              Varyantlar
            </h2>
            {err('variants') && (
              <p className="admin-error mb-2" role="alert">
                {err('variants')}
              </p>
            )}
            <VariantTable
              product={draft}
              variants={draft.variants}
              disabled={readOnly}
              onChange={(variants) => set({ variants })}
            />
          </section>

          <section className="admin-card" style={{ padding: 16 }}>
            <h2 className="mb-3 text-sm font-semibold text-[var(--brand-purple-deep)]">
              Tat profili
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {TASTE_AXES.map((axis) => (
                <label key={axis.key} className="admin-field">
                  <span className="admin-label">
                    {axis.label}: {draft.taste[axis.key]}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    value={draft.taste[axis.key]}
                    disabled={readOnly}
                    onChange={(e) =>
                      set({ taste: { ...draft.taste, [axis.key]: Number(e.target.value) } })
                    }
                  />
                </label>
              ))}
            </div>

            <div className="mt-4">
              <span className="admin-label">Tat notaları</span>
              <div className="mt-1 flex flex-col gap-1.5">
                {draft.flavorNotes.map((note, i) => (
                  <div key={i} className="flex gap-1.5">
                    <input
                      className="admin-input admin-btn-sm"
                      value={note.label}
                      disabled={readOnly}
                      aria-label={`Nota ${i + 1}`}
                      onChange={(e) =>
                        set({
                          flavorNotes: draft.flavorNotes.map((n, j) =>
                            j === i ? { ...n, label: e.target.value } : n,
                          ),
                        })
                      }
                    />
                    <select
                      className="admin-select admin-btn-sm"
                      style={{ width: 130 }}
                      value={note.profile}
                      disabled={readOnly}
                      aria-label={`Nota ${i + 1} profili`}
                      onChange={(e) =>
                        set({
                          flavorNotes: draft.flavorNotes.map((n, j) =>
                            j === i ? { ...n, profile: e.target.value as FlavorProfile } : n,
                          ),
                        })
                      }
                    >
                      {FLAVOR_PROFILES.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="admin-btn admin-btn-danger admin-btn-sm"
                      disabled={readOnly}
                      onClick={() =>
                        set({ flavorNotes: draft.flavorNotes.filter((_, j) => j !== i) })
                      }
                      aria-label="Notayı kaldır"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="admin-btn admin-btn-ghost admin-btn-sm self-start"
                  disabled={readOnly}
                  onClick={() =>
                    set({
                      flavorNotes: [
                        ...draft.flavorNotes,
                        { label: '', profile: 'meyveli' } as FlavorNote,
                      ],
                    })
                  }
                >
                  <Plus size={12} /> Nota ekle
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* Sağ: yan panel */}
        <aside className="flex flex-col gap-4">
          <ProductPreviewCard
            product={draft}
            saved={mode === 'edit' ? saved : null}
            dirty={dirty}
          />

          <section className="admin-card" style={{ padding: 16 }}>
            <h2 className="mb-3 text-sm font-semibold text-[var(--brand-purple-deep)]">Durum</h2>
            <Field label="Yayın durumu" htmlFor="p-status">
              <select
                id="p-status"
                className="admin-select"
                value={draft.status}
                disabled={readOnly}
                onChange={(e) => set({ status: e.target.value as ProductStatus })}
              >
                {productStatuses.map((s) => (
                  <option key={s} value={s}>
                    {statusLabels[s]}
                  </option>
                ))}
              </select>
            </Field>
            <div className="mt-3 flex flex-col gap-1.5">
              {(
                [
                  ['featured', 'Öne çıkan'],
                  ['bestSeller', 'Çok satan'],
                  ['newArrival', 'Yeni gelen'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={draft[key]}
                    disabled={readOnly}
                    onChange={(e) => set({ [key]: e.target.checked } as Partial<AdminProduct>)}
                  />
                  {label}
                </label>
              ))}
            </div>
            <div className="mt-3">
              <span className="admin-label">Rozetler</span>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {BADGES.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    className="admin-chip"
                    disabled={readOnly}
                    aria-pressed={draft.badges.includes(b.id)}
                    style={
                      draft.badges.includes(b.id)
                        ? { background: 'var(--brand-purple)', color: '#fff', borderColor: 'transparent' }
                        : undefined
                    }
                    onClick={() => set({ badges: toggleInArray(draft.badges, b.id) })}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="admin-card" style={{ padding: 16 }}>
            <h2 className="mb-2 text-sm font-semibold text-[var(--brand-purple-deep)]">
              Kategoriler
            </h2>
            {err('categoryIds') && (
              <p className="admin-error mb-1" role="alert">
                {err('categoryIds')}
              </p>
            )}
            {/* WordPress gibi: alt kategoriler üstlerinin altında girintili. */}
            <div className="flex flex-col gap-1">
              {categoryTree(categories).map(({ category: c, depth }) => (
                <label
                  key={c.id}
                  className="flex items-center gap-2 text-sm"
                  style={{ paddingLeft: depth * 14 }}
                >
                  <input
                    type="checkbox"
                    checked={draft.categoryIds.includes(c.id)}
                    disabled={readOnly}
                    onChange={() => set({ categoryIds: toggleInArray(draft.categoryIds, c.id) })}
                  />
                  <span className={depth > 0 ? 'text-[var(--admin-ink-soft)]' : undefined}>
                    {depth > 0 && <span aria-hidden="true">— </span>}
                    {c.name}
                  </span>
                </label>
              ))}
            </div>

            <h2 className="mb-2 mt-4 text-sm font-semibold text-[var(--brand-purple-deep)]">
              Koleksiyonlar
            </h2>
            <div className="flex flex-col gap-1">
              {collections.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={draft.collectionIds.includes(c.id)}
                    disabled={readOnly}
                    onChange={() =>
                      set({ collectionIds: toggleInArray(draft.collectionIds, c.id) })
                    }
                  />
                  {c.name}
                </label>
              ))}
            </div>
          </section>

          <section className="admin-card" style={{ padding: 16 }}>
            <h2 className="mb-2 text-sm font-semibold text-[var(--brand-purple-deep)]">Profiller</h2>
            <div className="flex flex-wrap gap-1.5">
              {FLAVOR_PROFILES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="admin-chip"
                  disabled={readOnly}
                  aria-pressed={draft.flavorProfiles.includes(p.id)}
                  style={
                    draft.flavorProfiles.includes(p.id)
                      ? { background: 'var(--brand-gold)', color: 'var(--brand-purple-deep)', borderColor: 'transparent' }
                      : undefined
                  }
                  onClick={() =>
                    set({ flavorProfiles: toggleInArray(draft.flavorProfiles, p.id) })
                  }
                >
                  {p.label}
                </button>
              ))}
            </div>
          </section>

          <TagEditor
            tags={draft.tags}
            disabled={readOnly}
            onChange={(tags) => set({ tags })}
          />

          <section className="admin-card" style={{ padding: 16 }}>
            <h2 className="mb-3 text-sm font-semibold text-[var(--brand-purple-deep)]">SEO</h2>
            <Field
              label="SEO başlığı"
              htmlFor="p-seo-title"
              error={err('seo.title')}
              hint={`${draft.seo.title.length}/70`}
            >
              <input
                id="p-seo-title"
                className="admin-input"
                value={draft.seo.title}
                disabled={readOnly}
                onChange={(e) => set({ seo: { ...draft.seo, title: e.target.value } })}
              />
            </Field>
            <Field
              label="SEO açıklaması"
              htmlFor="p-seo-desc"
              error={err('seo.description')}
              hint={`${draft.seo.description.length}/180`}
              className="mt-3"
            >
              <textarea
                id="p-seo-desc"
                className="admin-textarea"
                value={draft.seo.description}
                disabled={readOnly}
                onChange={(e) => set({ seo: { ...draft.seo, description: e.target.value } })}
              />
            </Field>
          </section>
        </aside>
      </div>

      {/* Yapışkan kaydet çubuğu */}
      <div className="admin-savebar">
        <span
          className="text-xs font-medium"
          style={{ color: dirty ? '#b4232f' : 'var(--admin-ink-soft)' }}
          aria-live="polite"
        >
          {readOnly
            ? 'Salt okunur mod — kaydetme kapalı'
            : dirty
              ? 'Kaydedilmemiş değişiklikler var'
              : 'Tüm değişiklikler kayıtlı'}
        </span>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            className="admin-btn admin-btn-ghost"
            onClick={discard}
            disabled={!dirty || saving}
          >
            Geri al
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={save}
            disabled={readOnly || saving || (mode === 'edit' && !dirty)}
          >
            {saving ? 'Kaydediliyor…' : mode === 'create' ? 'Oluştur' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
}

function errorsForImagesAlt(draft: AdminProduct): string | undefined {
  return draft.images.some((img) => img.alt.trim() === '')
    ? 'Her görsel için alternatif metin zorunlu'
    : undefined;
}

function TagEditor({
  tags,
  disabled,
  onChange,
}: {
  tags: string[];
  disabled?: boolean;
  onChange: (tags: string[]) => void;
}) {
  const [value, setValue] = useState('');
  const add = () => {
    const t = value.trim();
    if (t && !tags.includes(t)) onChange([...tags, t]);
    setValue('');
  };
  return (
    <section className="admin-card" style={{ padding: 16 }}>
      <h2 className="mb-2 text-sm font-semibold text-[var(--brand-purple-deep)]">Etiketler</h2>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((t) => (
          <span key={t} className="admin-chip">
            {t}
            <button
              type="button"
              className="text-rose-600"
              disabled={disabled}
              onClick={() => onChange(tags.filter((x) => x !== t))}
              aria-label={`${t} etiketini kaldır`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="mt-2 flex gap-1.5">
        <input
          className="admin-input admin-btn-sm"
          placeholder="Etiket ekle"
          value={value}
          disabled={disabled}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
        />
        <button
          type="button"
          className="admin-btn admin-btn-ghost admin-btn-sm"
          disabled={disabled || !value.trim()}
          onClick={add}
        >
          <Plus size={12} />
        </button>
      </div>
    </section>
  );
}
