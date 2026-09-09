// Merkezi site yapılandırması.
// Buradaki bilgiler örnek/placeholder'dır; backend veya kurumsal bilgiler
// hazır olduğunda tek yerden güncellenebilir.

export const site = {
  name: 'Nefis Aroma',
  shortName: 'Nefis Aroma',
  domain: process.env.NEXT_PUBLIC_SITE_URL || 'https://nefisaroma.example', // placeholder — gerçek alan adıyla değiştirin
  description:
    'Özenle geliştirilen aroma profilleri, DIY kitleri ve baz ürünleri. Her damlasında yeni bir deneyim.',
  locale: 'tr_TR',
  // İletişim — PLACEHOLDER. Gerçek bilgiler panel → Ayarlar → Mağaza'dan girilir
  // ve `getStoreInfo()` ile bu değerlerin yerine geçer.
  contact: {
    whatsapp: '+90 000 000 00 00',
    whatsappUrl: 'https://wa.me/900000000000',
    phone: '+90 000 000 00 00',
    phoneUrl: 'tel:+900000000000',
    email: 'destek@nefisaroma.example',
    addressLines: ['Örnek Mah. Aroma Sok. No: 0', 'Kadıköy / İstanbul (örnek adres)'],
    mapNote: 'Harita entegrasyonu için ayrılmış alan — gerçek konum eklenecek.',
    workingHours: 'Hafta içi 09:00 – 19:00 · Cumartesi 10:00 – 13:00',
  },
  // Alt bilgide gösterilen ödeme yöntemi rozetleri (metinsel; panelden
  // yüklenen gerçek ikonlar Vitrin Yönetimi fazında bağlanacak).
  payments: ['Visa', 'Mastercard', 'Troy', 'Axess', 'Bonus', 'Maximum', 'Paraf', 'World'],
  legal: {
    sslNote: 'Kredi kartı bilgileriniz 256bit SSL sertifikası ile korunmaktadır.',
  },
  // Kargo / kampanya — örnek değerler
  commerce: {
    freeShippingThreshold: 750,
    shippingFee: 54.9,
    currency: 'TRY',
    currencySymbol: '₺',
    estimatedDelivery: '1–3 iş günü içinde kargoda',
    securePackaging: 'Sızdırmaz kapak + darbe emici çift katman paketleme',
  },
  social: {
    instagram: 'https://instagram.com',
    x: 'https://x.com',
    youtube: 'https://youtube.com',
  },
  announcements: [
    'Güvenli ve sızdırmaz paketleme',
    '750 ₺ üzeri siparişlerde kargo bizden (örnek kampanya)',
    'WhatsApp destek hattı hafta içi 09:00 – 18:00',
  ],
  // Hakkımızda / kurumsal — DOĞRULANMAMIŞ bilgiler placeholder olarak işaretli
  companyPlaceholders: {
    foundedYear: '—', // örnek: doğrulanınca girin
    productionNote: 'Üretim ve kapasite bilgileri kurumsal onay sonrası eklenecektir.',
    certificationNote: 'Sertifika bilgileri için ürün etiketleri ve resmi belgeler esas alınır.',
  },
} as const;

export const currency = (value: number) =>
  new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: site.commerce.currency,
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);

export const discountPercent = (price: number, oldPrice?: number) =>
  oldPrice && oldPrice > price ? Math.round((1 - price / oldPrice) * 100) : 0;
