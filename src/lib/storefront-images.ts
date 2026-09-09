// Only original files supplied in gorseller are used by the storefront.
export const storefrontLogo = '/brand/logo.png';
export const showcaseImage = (name: string) => `/images/showcase/${name}.webp`;

export const categoryArtwork: Record<string, string> = {
  meyveli: showcaseImage('tfa-passion-fruit'),
  'tatli-kremsi': showcaseImage('inawera-miss-cream'),
  ferah: showcaseImage('tfa-cucumber'),
  icecek: showcaseImage('tfa-citrus-punch'),
  mix: showcaseImage('tfa-rainbow-sherbet'),
};

export const collectionArtwork: Record<string, string> = {
  'golden-drop': showcaseImage('tfa-caramel'),
  'purple-reserve': showcaseImage('inawera-wild-red-cap'),
  'fresh-lab': showcaseImage('tfa-cucumber'),
};

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
