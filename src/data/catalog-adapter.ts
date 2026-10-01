// Admin veri modeli → vitrin `Product` / `Category` / `Collection` tipleri.
// Amaç: veri kaynağı değişse bile vitrin bileşenlerinin gördüğü sözleşme aynı
// kalsın. Kuruş → TL dönüşümü de burada, tek noktada yapılır.

import type {
  BadgeKind,
  Category,
  CategorySlug,
  Collection,
  CollectionSlug,
  Product,
  ProductForm,
  ProductVariant,
  StockStatus,
  VariantIntensity,
  VariantType,
} from '@/types';
import type {
  AdminCategory,
  AdminCollection,
  AdminProduct,
  AdminVariant,
} from '@/types/admin';
import { fromMinor } from '@/lib/money';
import { hasNewWindow, isInNewWindow } from '@/lib/new-badge';
import { buildProductSeo } from '@/lib/admin/seo-autofill';
import {
  noPhotoPlaceholder,
  catalogPhotos,
  categoryArtwork,
  collectionArtwork,
  storefrontLogo,
} from '@/lib/storefront-images';

const INTENSITIES: VariantIntensity[] = ['Standart', 'Yoğun', 'Extra Fresh'];

const FORM_TYPE: Record<ProductForm, VariantType> = {
  konsantre: 'Konsantre Aroma',
  shortfill: 'Shortfill',
  'diy-kit': 'DIY Kit',
  baz: 'Konsantre Aroma',
};


// buildProduct() ile bire bir aynı placeholder metinleri — vitrin metni değişmesin.
const INGREDIENTS_NOTE =
  'İçerik bilgisi ürün etiketinde yer alır. Aroma bazı ve taşıyıcı oranları parti bazında değişebilir; kesin bilgi için ambalajı esas alın.';
const USAGE_RATE_NOTE =
  'Doğrulanmış kullanım oranı henüz eklenmedi; ürünün resmi belgesini esas alın.';
const STEEP_TIME_NOTE = 'ürüne ait doğrulanmış süre bilgisi bekleniyor.';
const STORAGE_NOTE =
  'Saklama koşulları için ürün etiketi ve resmi teknik belge esas alınmalıdır.';
const WARNINGS_NOTE =
  'Bu vitrin kullanım uygunluğu, içerik, alerjen veya doz doğrulaması sağlamaz. Kullanımdan önce ürünün resmi bilgilerini kontrol edin.';

function optionLabel(
  product: AdminProduct,
  variant: AdminVariant,
  matcher: RegExp,
): string | undefined {
  const option = product.options.find((o) => matcher.test(o.name));
  if (!option) return undefined;
  const valueId = variant.optionValues[option.id];
  return option.values.find((v) => v.id === valueId)?.label;
}

function stockStatusFromCount(count: number): StockStatus {
  if (count <= 0) return 'out-of-stock';
  if (count <= 5) return 'low-stock';
  return 'in-stock';
}

/** Gerçek ürün fotoğrafı varsa onu, yoksa nötr "Görsel yok" yer tutucusunu döner. Otomatik görsel atanmaz. */
function primaryImage(p: AdminProduct): string {
  return catalogPhotos(p.images)[0]?.src || noPhotoPlaceholder;
}

function toStorefrontVariant(product: AdminProduct, v: AdminVariant): ProductVariant {
  // Hacim etiketi serbest metindir; "Hacim" adında seçenek yoksa ilk seçenek
  // kullanılır. Hiç seçenek yoksa boş kalır ve vitrin hacim satırını gizler.
  const volLabel =
    optionLabel(product, v, /hac|volume|ml/i) ??
    (product.options[0] ? optionLabel(product, v, new RegExp(`^${product.options[0].name}$`)) : undefined);
  const intLabel = optionLabel(product, v, /yo[ğg]|intensity|fresh|serin/i);

  const volume = volLabel ?? '';
  const intensity = (INTENSITIES as string[]).includes(intLabel ?? '')
    ? (intLabel as VariantIntensity)
    : 'Standart';

  const stockCount = Math.max(0, Math.round(v.stock));
  const onSale = v.compareAtPriceMinor != null && v.compareAtPriceMinor > v.priceMinor;

  return {
    id: v.id,
    sku: v.sku,
    volume,
    type: FORM_TYPE[product.form],
    intensity,
    // Vitrin sözleşmesi TL (float) bekler; kuruş → TL dönüşümü burada, tek noktada.
    price: fromMinor(v.priceMinor),
    oldPrice: onSale ? fromMinor(v.compareAtPriceMinor as number) : undefined,
    stock: stockStatusFromCount(stockCount),
    stockCount,
    image: catalogPhotos(v.image ? [{ src: v.image }] : [])[0]?.src || primaryImage(product),
    onSale,
    selection: { ...v.optionValues },
    label: product.options
      .map((o) => o.values.find((x) => x.id === v.optionValues[o.id])?.label)
      .filter((x): x is string => Boolean(x))
      .join(' / '),
  };
}

/** Panelde boş bırakılan SEO alanları açıklamadan üretilir. */
function seoOf(p: AdminProduct): { title: string; description: string } {
  const title = p.seo.title.trim();
  const description = p.seo.description.trim();
  if (title && description) return { title, description };
  const gen = buildProductSeo(p);
  return { title: title || gen.title, description: description || gen.description };
}

/**
 * Ürün kategori/koleksiyon kimliklerini vitrin slug'ına çevirmek için sözlük.
 * Panelden açılan kategorilerin kimliği slug'dan farklıdır ("cat-…"); sözlük
 * verilmezse kimlik slug kabul edilir (eski içe aktarılan kayıtlar böyleydi).
 */
export interface TaxonomySlugMap {
  categories: Map<string, string>;
  collections: Map<string, string>;
}

export function taxonomySlugMap(
  categories: AdminCategory[],
  collections: AdminCollection[],
): TaxonomySlugMap {
  return {
    categories: new Map(categories.map((c) => [c.id, c.slug])),
    collections: new Map(collections.map((c) => [c.id, c.slug])),
  };
}

export function toStorefrontProduct(p: AdminProduct, slugs?: TaxonomySlugMap): Product {
  const activeVariants = p.variants.filter((v) => v.isActive);
  const usable = activeVariants.length > 0 ? activeVariants : p.variants;
  const variants = usable.map((v) => toStorefrontVariant(p, v));

  const defAdmin = usable.find((v) => v.isDefault) ?? usable[0];
  const defVariant = variants.find((v) => v.id === defAdmin?.id) ?? variants[0];

  const anyInStock = variants.some((v) => v.stock !== 'out-of-stock');
  const stockStatus: StockStatus = anyInStock
    ? variants.every((v) => v.stock === 'low-stock' || v.stock === 'out-of-stock')
      ? 'low-stock'
      : 'in-stock'
    : 'out-of-stock';

  const photos = catalogPhotos(p.images);
  const noPhoto = photos.length === 0;
  const gallery = noPhoto
    ? [{ src: noPhotoPlaceholder, alt: `${p.name} — görsel yok` }]
    : photos.map((img) => ({ src: img.src, alt: img.alt || p.name }));

  // "Yeni" rozeti tek kaynaktan gelir: paneldeki "Yeni gelen" işareti. Tarih
  // aralığı girilmişse işaret yerine aralık belirler. Rozet listesine elle
  // eklenmiş eski 'yeni' kayıtları yok sayılır (işaretsiz ürün "Yeni" görünmesin).
  // Ürün bağlı olduğu TÜM kategorilerde listelenir; ilk sıradaki birincildir.
  // Silinmiş kategoriye kalan bağlar (sözlükte yoksa) atlanır.
  const categorySlugs = p.categoryIds
    .map((id) => (slugs ? slugs.categories.get(id) : id))
    .filter((s): s is string => Boolean(s)) as CategorySlug[];
  const collectionSlugs = p.collectionIds
    .map((id) => (slugs ? slugs.collections.get(id) : id))
    .filter((s): s is string => Boolean(s)) as CollectionSlug[];

  const newArrival = hasNewWindow(p) ? isInNewWindow(p) : p.newArrival;
  const rest = p.badges.filter((b) => b !== 'yeni');
  const badges: BadgeKind[] = newArrival ? ['yeni', ...rest] : rest;

  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    series: p.series,
    shortDescription: p.shortDescription,
    longDescription: p.description,
    seo: seoOf(p),
    category: categorySlugs[0] ?? ('meyveli' as CategorySlug),
    categories: categorySlugs,
    subcategory: p.subcategory,
    collection: collectionSlugs[0],
    collections: collectionSlugs,
    flavorNotes: p.flavorNotes,
    flavorProfiles: p.flavorProfiles,
    badges,
    images: gallery.slice(0, 2),
    gallery,
    noPhoto,
    videoPlaceholder: undefined,
    basePrice: defVariant?.price ?? 0,
    oldPrice: defVariant?.oldPrice,
    rating: 0,
    reviewCount: 0,
    stockStatus,
    ingredientsNote: INGREDIENTS_NOTE,
    usageRate: p.usageRate || USAGE_RATE_NOTE,
    steepTime: p.steepTime || STEEP_TIME_NOTE,
    origin: p.origin,
    storage: STORAGE_NOTE,
    warnings: WARNINGS_NOTE,
    taste: p.taste,
    form: p.form,
    featured: p.featured,
    bestSeller: p.bestSeller,
    newArrival,
    // Yalnız en az bir varyantta kullanılan değerler listelenir.
    options: p.options
      .map((o) => ({
        id: o.id,
        name: o.name,
        values: o.values
          .filter((val) => usable.some((v) => v.optionValues[o.id] === val.id))
          .map((val) => ({ id: val.id, label: val.label })),
      }))
      .filter((o) => o.values.length > 0),
    variants,
    relatedProductIds: [],
    faq: p.faq,
  };
}

export function toStorefrontCategory(c: AdminCategory, all: AdminCategory[] = []): Category {
  const parent = c.parentId ? all.find((x) => x.id === c.parentId) : undefined;
  return {
    slug: c.slug as CategorySlug,
    name: c.name,
    tagline: c.tagline,
    description: c.description,
    // Panelden girilen görsel önceliklidir; yoksa yedek/logo.
    cover: c.cover || categoryArtwork[c.slug] || storefrontLogo,
    icon: c.icon || categoryArtwork[c.slug] || storefrontLogo,
    subcategories: c.subcategories,
    parentSlug: (parent?.slug as CategorySlug | undefined) ?? null,
    accent: c.accent,
  };
}

export function toStorefrontCollection(c: AdminCollection): Collection {
  return {
    slug: c.slug as CollectionSlug,
    name: c.name,
    subtitle: c.subtitle,
    description: c.description,
    cover: c.cover || collectionArtwork[c.slug] || storefrontLogo,
    atmosphere: c.atmosphere,
  };
}
