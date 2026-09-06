import type { Category, Collection } from '@/types';

export interface NavLink {
  label: string;
  href: string;
  emphasis?: boolean;
}

/** Ana navigasyon (masaüstü nav çubuğu + mobil menü) */
export const primaryNav: NavLink[] = [
  { label: 'Tüm Aromalar', href: '/urunler' },
  { label: 'Meyveli', href: '/kategori/meyveli' },
  { label: 'Ferah', href: '/kategori/ferah' },
  { label: 'Tatlı & Kremsi', href: '/kategori/tatli-kremsi' },
  { label: 'İçecek', href: '/kategori/icecek' },
  { label: 'Tütün', href: '/kategori/tutun' },
  { label: 'Mix Aromalar', href: '/kategori/mix' },
  { label: 'DIY Kitler', href: '/kategori/diy-kitler' },
  { label: 'Nbase', href: '/kategori/nbase' },
  { label: 'Yeni Gelenler', href: '/yeni-gelenler' },
  { label: 'Kampanyalar', href: '/kampanyalar', emphasis: true },
  { label: 'Aroma Rehberi', href: '/aroma-rehberi' },
];

// Kategoriler artık veritabanından geldiği için mega menü modül yüklenirken
// değil, taksonomi elde edildiğinde kurulur (bkz. `useTaxonomy()`).
export function buildMegaMenuColumns(categories: Category[]) {
  return [
    {
      heading: 'Tat Aileleri',
      links: categories
        .filter((c) => !['diy-kitler', 'nbase'].includes(c.slug))
        .map((c) => ({ label: c.name, href: `/kategori/${c.slug}`, hint: c.tagline })),
    },
    {
      heading: 'Set & Baz',
      links: [
        ...categories
          .filter((c) => ['diy-kitler', 'nbase'].includes(c.slug))
          .map((c) => ({ label: c.name, href: `/kategori/${c.slug}`, hint: c.tagline })),
        { label: 'Aroma Rehberi', href: '/aroma-rehberi', hint: 'Oran, karışım ve saklama' },
        { label: 'Aroma Bulucu', href: '/aroma-rehberi#bulucu', hint: 'Sana uygun profili keşfet' },
      ],
    },
    {
      heading: 'Keşfet',
      links: [
        { label: 'Tüm Ürünler', href: '/urunler', hint: `${categories.length} kategori` },
        { label: 'Yeni Gelenler', href: '/yeni-gelenler', hint: 'Son eklenenler' },
        { label: 'Çok Satanlar', href: '/cok-satanlar', hint: 'En çok tercih edilenler' },
        { label: 'Kampanyalar', href: '/kampanyalar', hint: 'İndirimli seçkiler' },
      ],
    },
  ];
}

export function buildMegaMenuCollections(collections: Collection[]) {
  return collections.map((c) => ({
    label: c.name,
    href: `/koleksiyon/${c.slug}`,
    subtitle: c.subtitle,
    cover: c.cover,
  }));
}

export const footerNav = [
  {
    heading: 'Kurumsal',
    links: [
      { label: 'Hakkımızda', href: '/hakkimizda' },
      { label: 'Aroma Rehberi', href: '/aroma-rehberi' },
      { label: 'Sıkça Sorulan Sorular', href: '/sss' },
      { label: 'İletişim', href: '/iletisim' },
    ],
  },
  {
    heading: 'Alışveriş',
    links: [
      { label: 'Tüm Ürünler', href: '/urunler' },
      { label: 'Yeni Gelenler', href: '/yeni-gelenler' },
      { label: 'Çok Satanlar', href: '/cok-satanlar' },
      { label: 'Kampanyalar', href: '/kampanyalar' },
      { label: 'Favorilerim', href: '/favoriler' },
    ],
  },
  {
    heading: 'Yardım',
    links: [
      { label: 'İade ve Teslimat Koşulları', href: '/iade-ve-teslimat' },
      { label: 'Mesafeli Satış Sözleşmesi', href: '/mesafeli-satis-sozlesmesi' },
      { label: 'Sepetim', href: '/sepet' },
    ],
  },
  {
    heading: 'Yasal',
    links: [
      { label: 'Gizlilik Politikası', href: '/gizlilik-politikasi' },
      { label: 'Çerez Politikası', href: '/cerez-politikasi' },
      { label: 'KVKK Aydınlatma Metni', href: '/gizlilik-politikasi#kvkk' },
    ],
  },
];
