// Vitrin görsel kaynağı kuralı:
//  - Katalogda gerçek ürün fotoğrafı (panelden yüklenen /api/medya/… veya
//    /images/products/puff/… gibi) varsa o gösterilir.
//  - Eski demo kataloğunun görselleri (nefisaroma/* kompozitleri, prosedürel
//    <slug>-N.webp setleri, eski markalı diy25-* fotoğrafları) bilerek
//    gösterilmez; onların yerine tat profilini anlatan temsili illüstrasyon gelir.
export const storefrontLogo = '/brand/logo.png';
export const showcaseImage = (name: string) => `/images/showcase/${name}.webp`;

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

/** These are flavor illustrations, not photographs of the named catalog item. */
export function productArtwork(product: {
  name: string;
  slug: string;
  categoryIds: string[];
  flavorNotes: { label: string }[];
}): string {
  if (product.categoryIds.some((category) => ['tutun', 'nbase', 'diy-kitler'].includes(category))) return storefrontLogo;
  const text = `${product.slug} ${product.name} ${product.flavorNotes.map((note) => note.label).join(' ')}`.toLocaleLowerCase('tr-TR');
  const rules: [RegExp, string][] = [
    [/caramel|karamel|toffee/, 'tfa-caramel'],
    [/vanil|custard/, 'inawera-vanilla'],
    [/biscuit|bisküvi|cracker|kurabiye/, 'inawera-biscuit'],
    [/donut|cake|cheesecake|pasta/, 'tfa-frosted-donut'],
    [/cream|krem|milk|süt|yogurt|yoğurt/, 'inawera-miss-cream'],
    [/citrus|lemon|lime|limon|narenciye|portakal/, 'tfa-citrus-punch'],
    [/berry|çilek|orman|böğürtlen|ahududu|cherry|kiraz/, 'inawera-wild-red-cap'],
    [/passion|tropic|tropik|mango|pineapple|ananas/, 'tfa-passion-fruit'],
    [/mint|menthol|nane|mentol|ferah|ice|frost/, 'tfa-cucumber'],
  ];
  return showcaseImage(rules.find(([pattern]) => pattern.test(text))?.[1] ?? 'tfa-rainbow-sherbet');
}
