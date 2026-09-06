// Admin veri modeli → vitrin `Product` / `Category` / `Collection` tipleri.
// Amaç: veri kaynağı değişse bile vitrin bileşenlerinin gördüğü sözleşme aynı
// kalsın. Kuruş → TL dönüşümü de burada, tek noktada yapılır.

import type {
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
  VariantVolume,
} from '@/types';
import type {
  AdminCategory,
  AdminCollection,
  AdminProduct,
  AdminVariant,
} from '@/types/admin';
import { fromMinor } from '@/lib/money';

const VOLUMES: VariantVolume[] = ['10ml', '30ml', '60ml', '100ml'];
const INTENSITIES: VariantIntensity[] = ['Standart', 'Yoğun', 'Extra Fresh'];

const FORM_TYPE: Record<ProductForm, VariantType> = {
  konsantre: 'Konsantre Aroma',
  shortfill: 'Shortfill',
  'diy-kit': 'DIY Kit',
  baz: 'Konsantre Aroma',
};

const FALLBACK_IMAGE = '/images/nefisaroma/story/aroma-atolyesi.webp';

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

function toStorefrontVariant(product: AdminProduct, v: AdminVariant): ProductVariant {
  const volLabel = optionLabel(product, v, /hac|volume|ml/i);
  const intLabel = optionLabel(product, v, /yo[ğg]|intensity|fresh|serin/i);

  const volume = (VOLUMES as string[]).includes(volLabel ?? '')
    ? (volLabel as VariantVolume)
    : '30ml';
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
    image: v.image || product.images[0]?.src || FALLBACK_IMAGE,
    onSale,
  };
}

export function toStorefrontProduct(p: AdminProduct): Product {
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

  const gallery = p.images.length
    ? p.images.map((i) => ({ src: i.src, alt: i.alt }))
    : [{ src: FALLBACK_IMAGE, alt: p.name }];

  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    series: p.series,
    shortDescription: p.shortDescription,
    longDescription: p.description,
    category: (p.categoryIds[0] ?? 'meyveli') as CategorySlug,
    subcategory: p.subcategory,
    collection: p.collectionIds[0] as CollectionSlug | undefined,
    flavorNotes: p.flavorNotes,
    flavorProfiles: p.flavorProfiles,
    badges: p.badges,
    images: gallery.slice(0, 2),
    gallery,
    videoPlaceholder: undefined,
    basePrice: defVariant?.price ?? 0,
    oldPrice: defVariant?.oldPrice,
    rating: 0,
    reviewCount: 0,
    stockStatus,
    ingredientsNote: INGREDIENTS_NOTE,
    usageRate: USAGE_RATE_NOTE,
    steepTime: STEEP_TIME_NOTE,
    origin: p.origin,
    storage: STORAGE_NOTE,
    warnings: WARNINGS_NOTE,
    taste: p.taste,
    form: p.form,
    featured: p.featured,
    bestSeller: p.bestSeller,
    newArrival: p.newArrival,
    variants,
    relatedProductIds: [],
    faq: p.faq,
  };
}

export function toStorefrontCategory(c: AdminCategory): Category {
  return {
    slug: c.slug as CategorySlug,
    name: c.name,
    tagline: c.tagline,
    description: c.description,
    cover: c.cover,
    icon: c.icon,
    subcategories: c.subcategories,
    accent: c.accent,
  };
}

export function toStorefrontCollection(c: AdminCollection): Collection {
  return {
    slug: c.slug as CollectionSlug,
    name: c.name,
    subtitle: c.subtitle,
    description: c.description,
    cover: c.cover,
    atmosphere: c.atmosphere,
  };
}
