// Site içeriği — metinler örnek/placeholder olarak hazırlanmıştır.
// Yorumlar ve değerlendirmeler DEMO'dur; gerçek müşteri verisi değildir.

export const heroContent = {
  eyebrow: 'Nefis Aroma',
  title: 'Her Damlasında Yeni Bir Deneyim',
  subtitle: 'Özenle geliştirilen aroma profilleriyle kendi dünyanı keşfet.',
  primaryCta: { label: 'Aromaları Keşfet', href: '/urunler' },
  secondaryCta: { label: 'Aroma Rehberini İncele', href: '/aroma-rehberi' },
  stats: [
    { value: '8', label: 'Tat ailesi' },
    { value: '60+', label: 'Aroma profili' },
    { value: '4', label: 'Hacim seçeneği' },
  ],
};

export interface ProcessStep {
  no: string;
  title: string;
  description: string;
  image: string;
}

export const processSteps: ProcessStep[] = [
  {
    no: '01',
    title: 'Fikir ve tat profili',
    description:
      'Bir tat ailesi ve hedeflenen his belirlenir. Referans notlar çıkarılır, profil kabaca kâğıt üzerinde tanımlanır.',
    image: '/images/process/1.webp',
  },
  {
    no: '02',
    title: 'Formülasyon',
    description:
      'Notalar farklı oranlarda denenir. Ana nota, destek notaları ve arka plan katmanı ayrı ayrı ayarlanır.',
    image: '/images/process/2.webp',
  },
  {
    no: '03',
    title: 'Test ve dengeleme',
    description:
      'Örnekler dinlendirilir ve tekrar tadılır. Tatlılık, ferahlık ve yoğunluk küçük adımlarla dengelenir.',
    image: '/images/process/3.webp',
  },
  {
    no: '04',
    title: 'Üretim ve paketleme',
    description:
      'Onaylanan tarif hazırlanır, sızdırmaz kapaklı şişelere alınır ve darbe emici paketle gönderime hazırlanır.',
    image: '/images/process/4.webp',
  },
];

export const processNote =
  'Yukarıdaki adımlar ürün geliştirme yaklaşımımızı özetleyen örnek içeriktir. Kesin oranlar, bekleme süreleri ve kullanım bilgileri her ürünün kendi sayfasında ve etiketinde yer alır.';

export interface GuideTopic {
  slug: string;
  title: string;
  summary: string;
  body: string[];
  image?: string;
}

export const guideTopics: GuideTopic[] = [
  {
    slug: 'aroma-turleri',
    title: 'Aroma türleri',
    summary: 'Konsantre aroma, shortfill, mix aroma ve baz arasındaki farklar.',
    body: [
      'Konsantre aroma, yüksek yoğunlukta hazırlanan ve baz ile seyreltilerek kullanılan formdur. En esnek seçenektir; oranı siz belirlersiniz.',
      'Shortfill, aromanın bir kısmının baz ile önceden karıştırıldığı, üzerine ekleme yapılmaya uygun formdur.',
      'Mix aroma, birden fazla profilin dengelenip tek şişede sunulduğu hazır tariftir.',
      'Baz (Nbase), aromayı taşıyan nötr sıvıdır ve tek başına belirgin bir tat vermez.',
    ],
  },
  {
    slug: 'tekli-karisim',
    title: 'Tekli ve karışım aroma farkı',
    summary: 'Tek notalı sadelik mi, katmanlı kompozisyon mu?',
    body: [
      'Tekli aroma, belirli bir meyveyi veya notayı olabildiğince net vermeye odaklanır. Katmanlamaya, kendi tarifinizi kurmaya uygundur.',
      'Karışım aroma, birden fazla notanın belirli bir his için birlikte kurgulandığı tariftir. Hazır ve dengeli bir sonuç sunar.',
      'Ürünleri bu ayrım üzerinden karşılaştırabilirsiniz; kullanım uygunluğunu ürün belgeleriyle doğrulayın.',
    ],
  },
  {
    slug: 'tat-profili-okuma',
    title: 'Tat profili nasıl okunur?',
    summary: 'Tatlılık, ferahlık, yoğunluk, ekşilik ve kremsilik göstergeleri.',
    body: [
      'Her ürün sayfasında beş eksenli bir tat profili bulunur: tatlılık, ferahlık, yoğunluk, ekşilik ve kremsilik.',
      'Değerler 0–10 arasında görecelidir ve ürünler arası karşılaştırma için tasarlanmıştır; mutlak bir ölçüm değildir.',
      'Bu vitrindeki profil değerleri örnektir; ölçüm veya kullanım dozu önerisi değildir.',
    ],
  },
  {
    slug: 'yogunluk-ferahlik',
    title: 'Yoğunluk ve ferahlık seviyeleri',
    summary: 'Standart, Yoğun ve Extra Fresh varyantları ne anlama gelir?',
    body: [
      'Standart varyant, profilin dengeli hâlidir ve çoğu kullanıcı için başlangıç noktasıdır.',
      'Yoğun, katalogda bulunan bir varyasyon adıdır; kullanım oranı hakkında tek başına bilgi vermez.',
      'Extra Fresh varyantı yalnızca ferah profillerde bulunur ve serinlik dozu belirgin biçimde daha yüksektir.',
    ],
  },
  {
    slug: 'saklama',
    title: 'Ürün saklama önerileri',
    summary: 'Işık, ısı ve hava ile temas aromayı nasıl etkiler?',
    body: [
      'Ürüne özel saklama sıcaklığı ve koşulları için resmi ürün etiketi esas alınmalıdır.',
      'Uzun süre yüksek sıcaklıkta kalan aromalarda nota kayması olabilir.',
      'Çocukların ve evcil hayvanların erişemeyeceği bir yerde tutun.',
    ],
  },
  {
    slug: 'bekleme-suresi',
    title: 'Bekleme / demlenme süresi nedir?',
    summary: 'Tarifin oturması için neden zaman gerekir?',
    body: [
      'Aroma baz ile karıştıktan sonra notaların birbirine yerleşmesi zaman alır. Bu süreye bekleme veya demlenme denir.',
      'Meyveli ve ferah profiller genellikle daha kısa; kremsi ve tütün profilleri daha uzun sürede oturur.',
      'Bu demo katalogda doğrulanmış bekleme süresi bulunmaz; üreticinin ürün talimatlarını esas alın.',
    ],
  },
  {
    slug: 'urun-secimi',
    title: 'Ürün seçerken dikkat edilecekler',
    summary: 'Profil, yoğunluk, hacim ve kullanım amacını birlikte değerlendirin.',
    body: [
      'Önce bir tat ailesi seçin, ardından tat profili göstergelerine bakarak tatlılık ve ferahlık beklentinizi eşleştirin.',
      'İlk denemede küçük hacim (10 ml) almak, profili tanımak için pratik bir yoldur.',
      'Kendi tarifinizi kuracaksanız tekli aroma + uygun baz; hazır sonuç istiyorsanız mix aroma veya shortfill tercih edin.',
    ],
  },
  {
    slug: 'terimler',
    title: 'Sık kullanılan terimler',
    summary: 'Baz, oran, steep, shortfill, VG/PG gibi kavramlar.',
    body: [
      'Oran: aromanın toplam karışıma göre yüzdesi.',
      'Steep / demlenme: karışımın dinlendirilme süresi.',
      'Shortfill: kısmen doldurulmuş, üzerine ekleme yapılmaya uygun şişe.',
      'VG / PG: bazın içindeki iki taşıyıcı bileşenin oranını tanımlayan kısaltmalar.',
    ],
  },
];

export const guideDisclaimer =
  'Bu içerikler genel bilgilendirme amaçlıdır ve sağlıkla ilgili bir iddia taşımaz. Kesin kullanım oranları, bekleme süreleri ve uyarılar için ürün etiketini ve üretici talimatlarını esas alın.';

export interface Testimonial {
  name: string;
  location: string;
  rating: number;
  text: string;
  product: string;
  demo: true;
}

// DEMO içerik — gerçek müşteri yorumu değildir.
export const testimonials: Testimonial[] = [
  {
    name: 'Deniz K.',
    location: 'İzmir',
    rating: 5,
    text: 'Frozen Orchard tam beklediğim gibi çıktı; elma notası yapay değil, buz dozu da abartısız. Paketleme özenliydi.',
    product: 'Frozen Orchard',
    demo: true,
  },
  {
    name: 'Mert A.',
    location: 'İstanbul',
    rating: 4,
    text: 'Velvet Custard’ı bir haftada oturttum, kremsi ama ağır değil. Tek eksik bende biraz daha vanilya isteğiydi.',
    product: 'Velvet Custard',
    demo: true,
  },
  {
    name: 'Selin T.',
    location: 'Ankara',
    rating: 5,
    text: 'DIY setiyle ilk karışımımı yaptım, tarif kartı çok açıklayıcıydı. Ölçüm için gereken her şey kutudaydı.',
    product: 'Fresh Lab DIY Seti',
    demo: true,
  },
  {
    name: 'Onur B.',
    location: 'Bursa',
    rating: 5,
    text: 'Mystic Tobacco akşamları için ideal; tütün notası sert değil, vanilya ile güzel dengelenmiş.',
    product: 'Mystic Tobacco',
    demo: true,
  },
  {
    name: 'Ece M.',
    location: 'Antalya',
    rating: 4,
    text: 'Citrus Pulse sabah kullanımı için birebir. Greyfurt kabuğu notası tarifi tekdüzelikten kurtarıyor.',
    product: 'Citrus Pulse',
    demo: true,
  },
  {
    name: 'Kaan Y.',
    location: 'Eskişehir',
    rating: 5,
    text: 'Golden Mango Reserve gerçekten olgun mango gibi. Tatlı karışımlara taban olarak da çok iyi çalışıyor.',
    product: 'Golden Mango Reserve',
    demo: true,
  },
];

export const campaign = {
  eyebrow: 'Sınırlı Süreli',
  title: 'Purple Reserve Koleksiyonu',
  description:
    'Koyu meyve ve derin karakterli profiller. Seçili Purple Reserve ürünlerinde sepette ekstra avantaj.',
  code: 'GOLDENDROP',
  codeNote: 'Sepette “GOLDENDROP” kodu ile %15 indirim (örnek kampanya).',
  cta: { label: 'Koleksiyonu İncele', href: '/koleksiyon/purple-reserve' },
  image: '/images/nefisaroma/collections/aroma-seckisi.webp',
};

export interface TimelineItem {
  year: string;
  title: string;
  text: string;
}

// Zaman çizelgesi — yıllar PLACEHOLDER'dır, kurumsal onay sonrası güncellenecek.
export const aboutTimeline: TimelineItem[] = [
  { year: '—', title: 'İlk tarifler', text: 'Küçük ölçekli denemelerle birkaç temel profilin oluşturulması.' },
  { year: '—', title: 'Profil ailesi', text: 'Meyveli, ferah ve tatlı ailelerinin genişletilmesi, tat profili göstergesinin tasarlanması.' },
  { year: '—', title: 'DIY yaklaşımı', text: 'Aroma, baz ve tarif kartını bir araya getiren setlerin hazırlanması.' },
  { year: '—', title: 'Bugün', text: 'Sekiz tat ailesinde, kontrollü varyasyonlarla büyüyen bir aroma kataloğu.' },
];

export const aboutValues = [
  {
    title: 'Doğadan ilham',
    text: 'Profilleri gerçek meyve, tatlı ve içecek deneyimlerinden yola çıkarak kurarız; hedef tanıdık bir tat hissidir.',
  },
  {
    title: 'Dengeli formülasyon',
    text: 'Tek bir notayı öne çıkarmak yerine tatlılık, ferahlık ve yoğunluğu birlikte ayarlarız.',
  },
  {
    title: 'Şeffaf bilgi',
    text: 'Kullanım oranı, bekleme süresi ve uyarıları ürün sayfasında açıkça belirtiriz; abartılı iddialardan kaçınırız.',
  },
  {
    title: 'Özenli teslim',
    text: 'Sızdırmaz kapak ve darbe emici paketleme ile ürünün size sağlam ulaşmasını önemseriz.',
  },
];

export const faqGroups: { heading: string; items: { q: string; a: string }[] }[] = [
  {
    heading: 'Ürünler',
    items: [
      {
        q: 'Aromalarınız nikotin içeriyor mu?',
        a: 'Hayır. Nefis Aroma ürünleri aroma konsantreleri, DIY kitleri ve nötr bazlardan oluşur; nikotin içermez.',
      },
      {
        q: 'Konsantre aroma ile shortfill arasındaki fark nedir?',
        a: 'Konsantre aroma, baz ile seyreltilerek kullanılır ve oranı siz belirlersiniz. Shortfill ise kısmen bazla hazırlanmıştır, üzerine ekleme yapılır.',
      },
      {
        q: 'Ürünlerin son kullanma tarihi var mı?',
        a: 'Her şişenin üzerinde üretim ve tavsiye edilen kullanım bilgisi yer alır. Doğru saklandığında aromalar uzun süre karakterini korur.',
      },
    ],
  },
  {
    heading: 'Kullanım',
    items: [
      {
        q: 'Hangi oranda kullanmalıyım?',
        a: 'Her ürün sayfasında önerilen bir başlangıç aralığı belirtilir. Kesin oran damak tercihine ve baz oranına göre değişir; etiket bilgisi esastır.',
      },
      {
        q: 'Bekleme süresi neden önemli?',
        a: 'Notaların birbirine yerleşmesi zaman alır. Meyveli profiller kısa, kremsi ve tütün profilleri daha uzun sürede oturur.',
      },
    ],
  },
  {
    heading: 'Sipariş & Teslimat',
    items: [
      {
        q: 'Kargo ne kadar sürede gelir?',
        a: 'Siparişler örnek olarak 1–3 iş günü içinde kargoya verilir. Kesin süreler kampanya dönemlerine göre değişebilir.',
      },
      {
        q: 'Ücretsiz kargo koşulu nedir?',
        a: 'Örnek kampanyaya göre belirli bir tutar üzeri siparişlerde kargo ücretsizdir. Güncel tutar sepet sayfasında görünür.',
      },
      {
        q: 'İade yapabilir miyim?',
        a: 'Ambalajı açılmamış ürünler için iade ve teslimat koşulları sayfasındaki şartlar geçerlidir.',
      },
    ],
  },
  {
    heading: 'Hesap & Gizlilik',
    items: [
      {
        q: 'Üyelik zorunlu mu?',
        a: 'Hayır. Misafir olarak da sipariş verebilirsiniz. Üyelik; sipariş geçmişinizi görmek, adreslerinizi kaydetmek ve iade talebi açmak için önerilir.',
      },
      {
        q: 'Bilgilerim nasıl korunuyor?',
        a: 'Gizlilik ve çerez politikası sayfalarında verilerin nasıl işlendiği örnek metinlerle açıklanır.',
      },
    ],
  },
];
