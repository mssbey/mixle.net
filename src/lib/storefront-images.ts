// Vitrin görsel kaynağı kuralı:
//  - Katalogda gerçek ürün fotoğrafı (panelden yüklenen /api/medya/… veya
//    /images/products/puff/… gibi) varsa o gösterilir.
//  - Eski demo kataloğunun görselleri (nefisaroma/* kompozitleri, prosedürel
//    <slug>-N.webp setleri, eski markalı diy25-* fotoğrafları) bilerek
//    gösterilmez.
//  - Fotoğrafı olmayan ürüne otomatik görsel atanmaz; görsel panelden manuel
//    yüklenene kadar nötr "Görsel yok" yer tutucusu gösterilir.
export const storefrontLogo = '/brand/logo.png';
export const noPhotoPlaceholder = '/images/placeholder-product.svg';

const LEGACY_IMAGE_PATTERNS = [
  /^\/images\/nefisaroma\//,
  /^\/images\/products\/diy25-/,
  /^\/images\/products\/[^/]+-\d\.webp$/,
];

/** Gerçek ürün fotoğrafı sayılan görseller — eski demo yolları elenir. */
export function catalogPhotos<T extends { src: string }>(images: T[]): T[] {
  return images.filter((img) => img.src && !LEGACY_IMAGE_PATTERNS.some((re) => re.test(img.src)));
}

/**
 * Kategori/koleksiyon görseli panelden girilmediyse kullanılan yedekler.
 * Kayıttaki `cover` doluysa o kazanır (bkz. catalog-adapter).
 */
export const categoryArtwork: Record<string, string> = {
  'puff-aromalar': '/images/products/puff/triple-melon-drifter-bar-aroma.webp',
};

export const collectionArtwork: Record<string, string> = {};
