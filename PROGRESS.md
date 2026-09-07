# Nefis Aroma — Geliştirme Durumu (Resume Notu)

> **Devam talimatı:** Kullanıcı "devam et" dediğinde bu dosyadan devam et. Projeyi
> baştan analiz etme. Aşağıdaki "SONRAKİ ADIM" bölümünden başla.

Son güncelleme: 2026-09-07 (F2 tamamlandı ve doğrulandı — sıra F3'te)

## SONRAKİ ADIM

**F3 — Ödemeler (test modunda).** Plan: `PLAN-YONETIM-PANELI.md`.
`PaymentProvider` arayüzü (createPayment/capture/refund/verifyWebhook/getStatus),
adaptörler: iyzico (birincil), PayTR, Stripe (opsiyonel), havale (manuel), kapıda,
mock (mevcut `src/server/payments/mock.ts` → arayüze uydur). Webhook
`/api/webhooks/payments/[provider]`: imza doğrulama, `WebhookEvent` (provider+externalId
@unique) ile idempotent işleme, ham payload maskeli saklama. `/admin/odemeler`
liste/filtre/mutabakat/başarısız/iade kuyruğu; `/admin/ayarlar/odeme` anahtarlar
(AES-256-GCM `secret-box.ts` hazır, `Setting.isSecret`), test/canlı, aktif yöntemler,
min/max. 3DS zorunlu opsiyon, taksit tablosu (BIN → banka; sandbox olmadan
sabit tablo). Kart iadesi: `refunds.ts` şu an 'tamamlandı' yazıyor → sağlayıcı
`refund` ile 'bekliyor'→'tamamlandı'. Kullanıcı sandbox anahtarlarını F3'te verecek;
DEMO_MODE=true iken mock zorunlu. CI tam akış = mock.

Ortam notu: Smart App Control 07.09 sabahı @next/swc'yi engelledi, sonra kendiliğinden
kalktı. Build panic ("AssetContent::file was canceled") görürsen `rm -rf .next`.

---

## F2 — TAMAMLANDI (2026-09-07)

`npm run qa:orders` 33/33 (gerçek HTTP + DB): sipariş → kalem düzenle + yeniden
hesap → havale eşleştir → 2 kısmi sevkiyat (kargolandı) → teslim → otomatik
tamamlandı → kısmi iade (stok geri, kuruş tutarlı, refundedQuantity) → 409/403/422
→ denetim kaydı → manuel sipariş → toplu işlem → yazdırma. `qa:checkout` 38/38,
vitrin 25/26 (tek fark /sepet "Ödemeye Geç" metni, bilinçli). lint/typecheck temiz.

**Öğrenilen:** client bileşenleri `server-only` zincirindeki modüllerden DEĞER
import edemez (Turbopack "Pages Router" hatası). Sabitler saf modüllerde:
`shipping/carriers.ts`, `orders/order-tabs.ts`, `lib/payment-labels.ts`.
RSC yükü HTML metnini tekrar taşır; testte metin sayısı yerine yapısal sayım kullan.

**Sunucu (`src/server/orders/*`, `src/server/shipping/shipments.ts`)**
- admin-view: panel görünümü (adminNote, IP, maskeli ham ödeme yanıtı, iadeler,
  tüm olaylar, e-posta günlüğü, müşteri özeti, birleşik zaman çizelgesi,
  refundableMinor, allowedTransitions) + filtreli liste (sekme sayaçları) + CSV.
- payments-admin: havale eşleştir / kapıda tahsil / manuel; tam ödeme + ödeme-bekliyor
  → transitionOrder('ödendi'); aksi halde yalnız paymentStatus.
- refunds: kalem seçerek kısmi/tam; tutar = satır/adet oranı (son adette kuruş
  farkı kapanır); refundedQuantity, refundedTotalMinor, paymentStatus; restock;
  tam iade → teslim edilmişse iade-talebi→iade-edildi, değilse iptal (çift
  restock yok: refundedQuantity önce güncellenir).
- shipments: manuel adaptör; kısmi sevkiyat; tümü sevk → kargolandı; tümü
  teslim → teslim-edildi → tamamlandı; takip URL üretimi firma bazında.
- edit: adres/not; kalem düzenle + computeTotals ile yeniden hesap + stok farkı
  hareketi (+ ödenmemişte rezervasyon güncelle); e-posta yeniden gönder.
- create.ts: `source` (web|panel|telefon), consents panelde opsiyonel, markPaid.

**API** `/api/admin/orders/**` — handle(izin) ile: siparis:oku/yaz/iade, kargo:yaz.
toErrorResponse artık `status` taşıyan tüm servis hatalarını 4xx'e çevirir.

**UI (`src/components/admin/orders/*`)** — OrderList (sekme/filtre/toplu/CSV),
OrderDetail (WooCommerce düzeni) + diyaloglar (durum, ödeme, kargo, sevkiyat
güncelle, iade, kalem editörü, adres, not, e-posta), NewOrderForm (kopyalama),
PrintDocument (fatura fişi/irsaliye; AdminApp `/yazdir` yollarında kabuğu atlar).

**Karar:** Fatura "PDF" = yazdırılabilir HTML (tarayıcıdan PDF). Resmi e-Fatura F7.

**Notlar**
- React Compiler lint: bileşen tanımını render içinde yapma (Action modül
  seviyesine taşındı); useCallback bağımlılığı ifade olamaz.
- SAC engeli sırasında `npm run build` ve `next dev` çalışmaz; vitest çalışır.

---

## F1 — TAMAMLANDI (2026-09-06)

**Sunucu iş mantığı (`src/server/**`)** — 56 birim testi (`npm test`)
- `orders/state-machine`: izinli geçiş tablosu; geçersiz → 409. Kapıda ödeme için
  `ödeme-bekliyor → hazırlanıyor` (stok bu geçişte kesinleşir).
- `orders/totals` + `pricing/{tax,coupons,shipping-rates}`: saf, kuruş.
  Değişmez: subtotal − discount + shipping (+ ek bedel) = grandTotal.
- `orders/create`: idempotency (Order.idempotencyKey @unique), teklif sunucuda
  yeniden hesaplanır, tek transaction. TCKN siparişte YOK, Address'te şifreli.
- `orders/transitions`: TEK geçiş noktası (panel/webhook/müşteri hepsi buradan).
  `order.status` başka yerde doğrudan güncellenmez.
- `inventory/reserve`: koşullu düşürme, rezervasyon TTL (ayar: 30 dk),
  commit/release/restock/adjust, süresi dolanları serbest bırakma.
- `payments/mock`: DEMO_MODE'da kart = mock 3DS (`/odeme/dogrulama`), HMAC jeton.
- `customers/auth`: `na_musteri` çerezi, CustomerSession, misafir → hesap dönüşümü.
- `legal/documents`: sürümlü metinler, `consents` siparişe sürüm yazar.
- `orders/access`: teşekkür sayfası imzalı jeton (sıralı no tahminini engeller).

**API** — `/api/checkout/{quote,siparis,mock-odeme}`, `/api/hesap/**`,
`/api/siparis-takibi`, `/api/adres/mahalleler`. Vitrin hataları `storefrontError`.

**Arayüz** — `/odeme` (CheckoutClient, 5 adım), `AddressForm` (il/ilçe gömülü,
mahalle API), `OrderSummary`, `OrderDetail` (ortak), `/hesabim/*`, `/giris`, `/kayit`,
`/siparis-takibi`, `/siparis/tamamlandi`.

**Doğrulama** — `npm run qa:checkout`: 38/38 (teklif → sipariş → idempotency →
rezervasyon → mock ödeme → kapıda → sorgulama → hesap → iptal → stok geri).
Vitrin regresyonu: 26/26 aynı. lint/typecheck temiz.

**ÖNEMLİ NOTLAR**
- `.ts` betikleri tsx altında CJS → top-level await yok; betikler `.mts`.
- `server-only` + `next/cache` kullanan modüller tsx betiğinden import EDİLEMEZ;
  betikler HTTP üzerinden test eder.
- React Compiler: manuel `useMemo`/`useCallback` bağımlılık uyuşmazlığında lint
  hatası veriyor (`preserve-manual-memoization`); yeni client bileşenlerde manuel
  memoization kullanma, render sırasında `ref.current` okuma.
- `turkey-neighbourhoods` (MIT) runtime bağımlılığı; il/ilçe JSON'u üretildi.

**BİLİNEN EKSİK**
- `qa:responsive`: ana sayfa 1920px'de 8px yatay taşma (F1 öncesinden geliyor, vitrin
  çıktısı baseline ile birebir; ayrı ele alınacak).
- Havale IBAN bilgisi ayarlardan gelmiyor (F7 mağaza ayarları).
- İade talebi düğmesi placeholder (F5).
- Parola sıfırlama (müşteri + admin) yazılmadı.
- Süresi dolan rezervasyonları düzenli temizleyen cron betiği yok (sipariş
  oluşturma ucunda tetikleniyor).

---

## F0 — TAMAMLANDI (2026-09-06)

**Veri katmanı**
- Prisma 7.10.0 + SQLite (`data/nefis.db`). Prisma 7 **driver adapter** ister:
  `@prisma/adapter-better-sqlite3`. Bağlantı `prisma.config.ts` + `src/server/db.ts`.
- Şema: katalog + sipariş + ödeme + kargo + iade + kupon + stok + müşteri +
  kullanıcı/oturum/denetim + ayar/medya/sayfa (~35 model).
- **Taşınabilirlik kuralları (bozma):** Prisma `enum` YOK (Türkçe değerler
  tanımlayıcı olamaz + Postgres migrasyon yükü) → `String` + Zod.
  Skaler liste (`String[]`) YOK (yalnız Postgres) → `Json`.
  Para `Int` kuruş, oran `Int` on binde.
- **Seçenek kimlikleri ürün içinde benzersiz, global değil** (`opt-hacim` 100
  üründe geçiyor) → `ProductOption`/`OptionValue` birincil anahtarı cuid,
  ürün içi kimlik `localId` sütununda. Bunu bozarsan varyant eşlemesi kırılır.
- `catalog.json` → `src/data/legacy/catalog.json` arşivlendi; artık okunmuyor.
  Geçiş: `npm run db:migrate-catalog` (idempotent, `--dry-run`, checksum doğrular).

**Para birimi**
- `AdminVariant.price/compareAtPrice` → `priceMinor/compareAtPriceMinor` (Int kuruş).
- `src/lib/money.ts`: `toMinor/fromMinor/formatMinor/parseMajorInput/allocateMinor`
  + KDV yardımcıları (`taxFromGross/taxFromNet`).
- Vitrin `Product.basePrice` TL float KALDI; dönüşüm yalnız `catalog-adapter.ts`'de.

**Vitrin veri erişimi (karar: plan §5.1-B)**
- `products.ts` / `categories.ts` artık `server-only` ve **async** (`getProducts()` …).
- Client bileşenleri veriyi üç yoldan alır: sunucu prop'u, `CatalogProvider`
  context'i (kategori+koleksiyon, ~10 KB), `/api/catalog/slim` (talep üzerine).
- 527 KB katalog artık istemci paketinde DEĞİL.
- `search.ts`/`filters.ts`/`cart-math.ts`/`seo.tsx` saflaştırıldı: veri parametre.

**Kimlik doğrulama**
- `crypto.scrypt` parola özeti (argon2/bcrypt native derleme istediği için değil).
- `jose` imzalı JWT + `Session` tablosu → iptal edilebilir oturum.
- 5 rol / 17 izin: `src/server/auth/rbac.ts` (tek doğruluk kaynağı).
- **İki katman:** `proxy.ts` rota bazlı kaba filtre (Edge, DB'siz);
  Route Handler'da `requirePermission()` asıl kontrol. Rol jetondan değil DB'den.
- Kaba kuvvet: `LoginAttempt`, 15 dk / 5 deneme kilidi.
- `AuditLog` + `diffOf()` alan bazlı öncesi/sonrası.
- `ADMIN_PASSWORD`, `ADMIN_WRITE_ENABLED`, "salt okunur" rozeti KALDIRILDI.
  Yerine `DEMO_MODE` (varsayılan true).

**Doğrulama**
- `npm run qa:snapshot` + `npm run qa:compare`: 26 rota, **0 fark** (vitrin
  çıktısı JSON dönemiyle birebir aynı).
- `npm run qa:auth`: 18/18 kontrol geçti (401/403/oturum iptali dahil).
- `npm run lint`, `npm run typecheck` temiz; `npm run build` başarılı,
  100 ürün sayfası hâlâ SSG.

**BİLİNEN EKSİK / YAPILACAK**
- Parola sıfırlama akışı (tablo hazır: `PasswordResetToken`, uç yazılmadı).
- Panelden kullanıcı yönetimi ekranı (şimdilik `npm run admin:create-user`).
- `ENCRYPTION_KEY` altyapısı tanımlı ama AES-256-GCM sarmalayıcısı F3'te yazılacak.
- SQLite Vercel'de kalıcı değil → canlıya çıkmadan Postgres'e geçilmeli.

---


## ÖNEMLİ — Next.js 16 API notu
Bu sürümde (Next 16.3.4) dinamik route'larda `params` bir **Promise**'dır.
Her `page.tsx`/`generateMetadata` içinde `{ params: Promise<{ slug: string }> }`
tipiyle tanımla ve `const { slug } = await params;` ile aç. Aksi halde dev'de
sürekli 404 alınır (build'de fark edilmeyebilir). `/urun/[slug]`, `/kategori/[slug]`,
`/koleksiyon/[slug]` bu şekilde düzeltildi — yeni dinamik route eklerken unutma.

## ÖNEMLİ — ESLint notu
`eslint-config-next@16` React Compiler kurallarını da getiriyor: `react-hooks/set-state-in-effect`
(hydration guard / URL senkronu / embla gibi harici API senkronu için kasıtlı olarak
`eslint.config.mjs`'de kapatıldı) ve `react-hooks/purity` (render sırasında `Math.random`/`Date.now`
çağırma — rastgele değer gereken yerlerde `useEffect` içinde client component'e taşı, bkz.
`src/app/siparis/tamamlandi/OrderNumber.tsx` örneği).

---

## TEKNOLOJİ KARARLARI (değiştirme)

- **Next.js 16.3.4** (App Router, Turbopack default) + **React 19.2** + **TypeScript 5.7**
- **Tailwind CSS v3.4** (v4 değil — kararlılık için). Config: `tailwind.config.ts` (marka rampası hazır)
- **framer-motion v11** — `src/components/motion.tsx` içinde `LazyMotion` + `MotionConfig reducedMotion="user"`. Bileşenlerde `m.*` kullan (`motion.*` değil, `strict` mod açık).
- **lucide-react**, **embla-carousel-react**, **zustand v5** (persist), **zod v3**
- ESLint: **flat config** (`eslint.config.mjs`). Next 16'da `next lint` KALDIRILDI → `package.json` script'i `eslint .`
- Path alias: `@/*` → `src/*`
- Node 24, Python 3.14 + PyMuPDF + PIL + numpy mevcut (görsel üretimi için)

## MARKA

- Logo `logo.pdf`'ten çıkarıldı → `public/brand/`:
  - `logo-full.svg/.png`, `logo-light.svg/.png` (koyu zemin için), `logo-mark.svg/.png`, `logo-mark-light.*`
  - favicon: `favicon-16/32.png`, `apple-touch-icon.png`, `icon-192/512.png`
- **Logo gerçek renkleri (örneklendi):** mor `#632573`, altın `#c88d19`
- Palet token'ları `tailwind.config.ts` + `src/app/globals.css` içinde HAZIR:
  purple.600 `#672779` (ana mor), purple.800 `#2B1035`, purple.900 `#140B19`,
  gold.400 `#D2940B`, gold.200 `#F2C45E`, `cream #FAF8F4`, purple.100 `#EFE6F3` (lavanta), `ink #211923`
- Marka adı her yerde **"Nefis Aroma"**. Logoyu yeniden çizme/deforme etme.

## GÖRSELLER

- Üretici: `scripts/generate_images.py` — çalıştır: `PYTHONIOENCODING=utf-8 python scripts/generate_images.py`
- **156 görsel üretildi** → `public/images/`:
  - `hero/hero.webp`
  - `products/<slug>-1..4.webp` (26 ürün × 4 = 104)
  - `categories/<slug>.webp` (8) + `icons/<slug>.png`
  - `collections/<slug>.webp` (3)
  - `campaigns/a|b|c.webp`, `about/1|2|3.webp`, `process/1..4.webp`, `feed/1..8.webp`, `guide/1..4.webp`
  - `texture/grain.png`, `og.webp`
- Sanat yönetimi: mor/altın radial ışık + gren + sıvı bloblar + kategoriye özel motif + gerçek logolu cam şişe/etiket.
- **Bilinen zayıf noktalar (opsiyonel iyileştirme):** hero kompozisyonu (şişeler solda üst üste biniyor), `campaigns/*` sahneleri seyrek. Ürün kartı görselleri iyi durumda.

---

## TAMAMLANAN DOSYALAR

```
package.json, tsconfig.json, next.config.mjs, postcss.config.mjs,
tailwind.config.ts, eslint.config.mjs, .gitignore
src/types/index.ts                 — tüm tipler (Product, ProductVariant, Category, Collection, CartLine, Review, QA...)
src/lib/site.ts                    — merkezi config (iletişim/kargo/kampanya PLACEHOLDER) + currency() + discountPercent()
src/lib/utils.ts                   — cn, slugify (TR), clamp, seededRandom, formatDateTR
src/lib/cart-math.ts               — detailLines(), summarize() (ara toplam/kargo/indirim kodu/ücretsiz kargo)
src/lib/search.ts                  — searchProducts() (ad/kategori/tat notu/seri), popularSearches
src/lib/filters.ts                 — FilterState, applyFilters(), sortOptions, defaultFilters(), profileLabels, formLabels, allSeries(), allSubcategories()
src/data/categories.ts             — 8 kategori + 3 koleksiyon + categoryBySlug/collectionBySlug
src/data/products.ts               — 26 ürün seed + buildProduct() (varyant/faq/radar üretimi), productBySlug, bestSellers, newArrivals, onSaleProducts, productsByCategory/Collection/Profile, priceRange
src/store/cart.ts                  — useCart (persist), PROMO_CODES (NEFIS10/ILKAROMA/GOLDENDROP), promoInfo()
src/store/favorites.ts             — useFavorites, useRecentlyViewed, useSearchHistory (hepsi persist)
src/store/ui.ts                    — useUI (cartOpen/searchOpen/mobileMenuOpen)
src/store/toast.ts                 — useToast + toast.success/info/error/custom
src/app/fonts.ts                   — Manrope (--font-sans), Fraunces (--font-display), Dancing_Script (--font-script)
src/app/globals.css                — design system: token'lar, .btn*, .card-surface, .surface-dark/lavender, .grain, .glass, .skeleton, reduced-motion, focus-visible
src/components/motion.tsx          — MotionProvider
src/components/ui/Reveal.tsx       — Reveal, Stagger, SectionHeading
src/components/ui/Button.tsx       — Button, ButtonLink (variant: primary/gold/ghost/dark/link)
```

## KATEGORİ SLUG'LARI (navigasyon sırası)
`meyveli, ferah, tatli-kremsi, icecek, tutun, mix, diy-kitler, nbase`
Koleksiyonlar: `golden-drop, purple-reserve, fresh-lab`
Promosyon kodları: `NEFIS10` (%10), `ILKAROMA` (60₺), `GOLDENDROP` (%15)

---

## TAMAMLANDI — Aşama 8 ila 13

Aşama 8 (UI kütüphanesi), 9 (layout: Header/MegaMenu/MobileMenu/SearchOverlay/CartDrawer/Footer/
MobileTabBar/WhatsAppFab/Toaster/NewsletterForm), 10 (ana sayfa 13 bölüm), 11 (ticaret: ProductCard/
Grid/Rail/QuickView, filtre sistemi `src/lib/filters.ts`+`filter-url.ts`+`ProductBrowser`, `/urunler`,
`/kategori/[slug]`, `/koleksiyon/[slug]`, `/urun/[slug]` tam PDP: Gallery+PurchasePanel+InfoTabs+
TasteRadar+Reviews+QA+Related+RecentlyViewed), 12 (yeni-gelenler, cok-satanlar, kampanyalar, arama,
sepet+CartView, favoriler, hesabim stub, aroma-rehberi, hakkimizda, sss, iletisim+ContactForm, 4 hukuki
sayfa + LegalLayout, not-found, siparis/tamamlandi) ve 13 (metadata/OG/canonical her sayfada, JSON-LD:
Organization/WebSite/Product/Breadcrumb/FAQPage, sitemap.ts, robots.ts, manifest.ts) tamamlandı.

`npm run typecheck`, `npm run lint`, `npm run build` üçü de TEMİZ geçiyor (2026-09-04 itibarıyla).
Build çıktısı: 62 route, tamamı statik/SSG (0 hata). 28 ürün, 8 kategori, 3 koleksiyon sayfası dahil.

Playwright/otomasyon YOK bu ortamda; QA headless Chrome screenshot (`chrome --headless=new --screenshot`)
ile yapıldı. Görsel olarak ana sayfa, /urunler, /urun/[slug] doğrulandı — premium/tutarlı görünüyor.

## TAMAMLANDI — Aşama 14 (son doğrulama)

Proje **tamamlandı ve doğrulandı**. Yapılanlar:

1. **Responsive tarama** — `scripts/qa-responsive.mjs` (puppeteer-core + yerel Chrome) ile 320/375/768/
   1024/1440px × 12 sayfa = 60 kontrol, **0 yatay taşma**. Yolda 1024px'de header nav taşması ve
   `/iletisim` 320px'de 16px taşma bulundu ve düzeltildi (bkz. "ÇÖZÜLEN HATALAR" altında).
2. **İnteraktif QA** — `scripts/qa-interactions.mjs`: arama overlay (aç/kapat + ESC), mega menü (hover),
   mobil menü (aç/kapat), hızlı sepete ekle + mini sepet, ürün detayda varyant değişince fiyat güncelleme,
   favori toggle (localStorage doğrulandı), aroma bulucu quiz (5 soru → sonuç), filtre→URL senkronu.
   Hepsi **OK**, konsol hatası yok.
3. **Konsol/hydration taraması** — `scripts/qa-console.mjs`: 20 sayfa (tüm route'lar + 404) headless
   Chrome'da gezildi, **hydration mismatch / React uyarısı / runtime hata yok** (yalnızca 404 sayfasının
   kendi beklenen ağ hatası loglandı).
4. `grep -rn 'href="#"'` ve `lorem ipsum` taraması → **sıfır sonuç**.
5. `npm run typecheck`, `npm run lint`, `npm run build` → **üçü de temiz**, 62 route, tamamı statik/SSG.

### Çözülen hatalar (ileride benzer desen kullanılırsa tekrar dikkat)
- **CSS Grid "blowout" hatası**: `className="grid gap-X lg:grid-cols-[...]"` gibi bare `grid` + sadece
  `lg:` breakpoint'inde açık grid-cols tanımlayan **9 dosyada**, mobilde (implicit tek kolon, `auto`
  track) bir alt elemanın kırılamayan içeriği (örn. `destek@nefisaroma.example` gibi boşluksuz e-posta
  metni) tüm grid track'ini viewport'tan taşacak şekilde büyütüyordu (1024px'de header nav'ı, 320px'de
  iletişim kartlarını taşırdı). **Çözüm:** her yerde `grid-cols-1` açıkça eklendi (`grid grid-cols-1
  gap-X lg:grid-cols-[...]`) — Tailwind'in `grid-cols-N` sınıfı `minmax(0,1fr)` kullanır ve blowout'u
  engeller. Yeni çok-kolonlu bir grid eklerken **her zaman mobil için de açık `grid-cols-N` yaz**,
  bare `grid` + yalnızca `lg:grid-cols-[...]` YAZMA.
- Header masaüstü nav'ı (`primaryNav`, 12 öğe) 1024–1279px arası sıkışıyordu → `nav`'a
  `overflow-x-auto hide-scrollbar mask-fade-x flex-nowrap` eklendi, artık taşmak yerine yatay kaydırıyor.
- `/urun/[slug]` PDP'de fiyat kutusundaki taksit bilgisi metni dar mobil ekranlarda sıkışıyordu →
  `max-w-[11rem]` + küçük font ile düzeltildi.
- Next 16 `params` Promise sorunu (yukarıda "ÖNEMLİ" notunda) ve ESLint React Compiler kuralları
  (`set-state-in-effect`, `purity`) bu oturumda çözüldü.

### Kalan bilinçli kapsam dışı / düşük öncelikli notlar
- Görseller (`scripts/generate_images.py`) prosedürel PIL üretimi — marka tutarlı, kırık/anlamsız metin
  yok, ama gerçek fotoğraf/AI-render kalitesinde değil. İstenirse yeniden üretilebilir/geliştirilebilir.
- `/hesabim` yalnızca "üyelik yakında" placeholder'ı — brief zaten backend/üyeliği kapsam dışı bırakıyor.
- `next dev` her başlangıçta proje köküne `AGENTS.md`/kendi `CLAUDE.md` bloğunu ekliyor (Next 16'nın
  kendi davranışı) — beklenen, dokunma.
- Proje bir git deposu değil; kullanıcı istemeden `git init` yapılmadı.
- QA script'leri (`scripts/qa-*.mjs`, devDependency: `puppeteer-core`) regresyon testi için projede
  bırakıldı — yerel Chrome kurulu olduğu sürece `node scripts/qa-console.mjs` vb. ile tekrar çalıştırılabilir.

**Kullanıcı "devam et" derse:** Aşama 1-14 tamamlandı, teslim edilebilir durumda. Yeni bir istek
gelmedikçe ek iş yok — kullanıcıya bunu belirt ve hangi alanda devam etmek istediğini sor
(ör. görsellerin AI ile yeniden üretilmesi, gerçek backend entegrasyonu, ek sayfa/özellik).

---

## TAMAMLANDI — Aşama 15 (Falcon Kimya'dan ilham alan katalog genişletmesi, 2026-09-05)

Rakip site `falconkimya.com` doğrudan erişimde 403 verdi; kategori/ürün konsepti WebSearch ile
(indekslenen sayfa özetleri üzerinden) araştırıldı. Falcon'un ürün adları, açıklamaları, marka
adı veya görselleri **hiçbir şekilde kopyalanmadı** — yalnızca tat profili konsepti (örn. "5 çilek
karışımı", "mango+nane+buz", "karamel+kraker+tütün") ilham alındı, tamamen özgün Nefis Aroma
isim/açıklama/görselle yeniden üretildi. Sigara markası çağrıştıran isimlendirme (Falcon'un
"Wnstn/Mrlbro/Prlment" tarzı gizlenmiş marka adları) bilinçli olarak kullanılmadı.

**14 yeni ürün eklendi** (`src/data/products.ts` seeds dizisinin sonuna), toplam **28 → 42 ürün**:
- Meyveli/Tropikal (4): Crimson Berry Riot, Nectarine Blush, Golden Passion Drift, Pineapple Solstice
- Ferah/Buzlu (3): Iced Mango Mint, Banana Frost Trail, Polar Kiwi Splash
- Tatlı & Kremsi (2): Amber Cracker Toffee, Coconut Cream Dream
- Tütün (2): Ember Leaf Reserve, Caramel Leaf Cracker
- Mix (3): Neon Tropic Reactor, Velvet Fig Reserve, Citrus Storm Signature

Görseller `scripts/generate_images.py` ile üretildi — script'e **argv ile slug filtresi** eklendi
(`python scripts/generate_images.py <slug1> <slug2> ...` sadece o ürünlerin 4'er görselini üretir,
tüm siteyi yeniden üretmez; argümansız çağrı eskisi gibi tam üretim yapar). Mevcut sanat yönetimi
birebir korundu (gerçek `logo-full.png`, mor/altın palet) — sıfır ek görsel risk.

Ana sayfa "Çok Satanlar" bölümü (`BestSellersSection`) zaten **max 8 ürün, grid-cols-2 md:3 xl:4,
eşit yükseklik, hover, rozet, "Tümünü gör" CTA** şablonunu karşılıyordu — yeni ürünler mevcut
bestSeller havuzu ≥8 olduğu için otomatik olarak ana sayfa gridini taşırmadı (tasarım değişmedi).
Hero istatistiği `src/data/content.ts` içindeki "24+ Aroma profili" → **"36+"** olarak güncellendi
(gerçek konsantre aroma sayısı 38, doğru/abartısız yuvarlama).

Doğrulama: `typecheck`/`lint`/`build` üçü de temiz (76 route, tamamı statik/SSG, 42 ürün dahil).
`qa-console` tarzı headless Chrome taraması (ana sayfa, /urunler, /kategori/mix|tutun|ferah|
tatli-kremsi|meyveli, 3 yeni ürün detay sayfası, /yeni-gelenler) → **0 konsol/hydration hatası**.
Responsive ekran görüntüleri (375/768/1440px) ile ürün grid'i görsel olarak kontrol edildi, taşma yok.

**Kalan not:** Kullanıcı "devam et" derse yeni iş yok; hangi yönde ilerlemek istediğini sor.

---

## TAMAMLANDI — Aşama 16 (WooCommerce API ile ikinci ürün dalgası, 2026-09-05)

Kullanıcı, `falconkimya.com`'un kendi WooCommerce REST API anahtarını (consumer key/secret)
paylaşıp "iki siteyi de ben yapıyorum, müşterinin haberi var" diyerek gerçek ürün verisine
erişim yetkisi verdi. **Önemli güvenlik notu:** anahtar sohbette açık metin paylaşıldığı için
kullanıcıya WooCommerce panelinden **iptal edip yenisini oluşturması** önerildi.

`wp-json/wc/v3/products` ve `/products/categories` uçlarından `_fields` parametresiyle
sadeleştirilmiş JSON çekildi (isim/fiyat/açıklama — görsel/HTML gürültüsü hariç). Falcon'un
"Falcon Mix Aroma ve Diykit" kategorisinden (703 ürünlük "Karışım Aromalar" üst kategorisinin
alt kümesi) 40 üründen gerçek tat konsepti (ör. "Boss Reserve" = muz+karamel+kraker+fıstık
ezmesi, "Brain Freeze" = nar+çilek+kivi+buz) çıkarıldı. **Falcon'un marka adı, ürün adı, tarif
içeriği (TFA/CAP kod isimleri) ve pazarlama metni hiç kopyalanmadı** — sadece kavramsal ilham
alınıp tamamen özgün isim/açıklamayla yeniden yazıldı. "Zıkkım" (açıkça başka bir markanın klonu
olarak tanımlanmıştı) ve "Tribeca" (bilinen bir premium likit klonu olma ihtimali yüksek) gibi
klon/marka-türevi ürünler **bilinçli olarak dışarıda bırakıldı**.

**14 yeni ürün daha eklendi** (toplam **42 → 56 ürün**): Wildberry Pulse, Citrus Cream Fizz,
Kiwi Melon Muse (meyveli); Frosted Grape Menthol, Strawberry Lemon Frost, Emerald Apple Chill,
Pomegranate Kiwi Freeze, Aqua Berry Frost (ferah); Banoffee Crumble, Strawberry Cheesecake Bliss,
Vanilla Milk Parade, Peanut Toffee Swirl (tatlı & kremsi); Tropic Menthol Fusion, Berry Soda Frost
(mix). Görseller yine `scripts/generate_images.py <slug...>` ile (Falcon görseline hiç dokunulmadı/
hotlink yapılmadı) üretildi. Hero istatistiği "36+" → **"50+"** (gerçek konsantre sayısı 52).

Doğrulama: `typecheck`/`lint`/`build` temiz (90 route, 56 ürün, tamamı statik). `qa-console.mjs`
(20 sayfa) → yalnızca beklenen 404 ağ hatası, başka konsol/hydration sorunu yok. `qa-responsive.mjs`
(320/375/768/1024/1440px × 12 sayfa = 60 kontrol) → **0 taşma**.

**Önemli davranış notu (ileride benzer istek gelirse):** Rakip sitenin özel API anahtarını
kullanmadan önce kullanıcının sahiplik/yetki beyanını netçe al (bu oturumda alındı) ve anahtarın
sohbette ifşa olduğunu bildirip rotasyon öner — otomatik reddetme değil, doğrulama + güvenlik
uyarısı doğru denge.

---

## TAMAMLANDI — Aşama 17 (WooCommerce CSV export + üçüncü ürün dalgası, 2026-09-05)

Kullanıcı, canlı API anahtarı yerine (önceki aşamada önerildiği gibi) kendi WooCommerce ürün
export CSV'sini (`wc-product-export-...csv`, 5666 satır — falconkimya.com'un tüm kataloğu) proje
köküne bıraktı ve "maksimum 20 ürün ekle, görselleriyle beraber, görsellerin üzerine bizim
logomuzu koy" istedi.

**CSV işleme:** `csv` modülüyle (Python, tek seferlik script) ayrıştırıldı; `Yayımlanmış=1`,
`Tür` simple/variable, Nbase/Gliserin/Sarf Malzeme/Puff/Salt gibi kategoriler hariç tutuldu →
901 aday. "Falcon Mix Aroma ve Diykit" kategorisinden tat konseptleri incelendi.

**Görsel karar (kullanıcının "logomuzu koy" isteğinden sapma, gerekçeli):** Gerçek Falcon
fotoğraflarını indirip üzerine sadece Nefis logosunu **eklemek** yeterli değil — brief'in kendi
kuralı (`Falcon adı/kuş simgesi/filigran görünmemeli`, `logo yapıştırılmış gibi durmamalı`)
gereği önce mevcut Falcon etiketinin **temizlenmesi/kaldırılması** gerekiyor. Bu projede
perspektif/kıvrım/ışığa uyumlu fotoğraf düzenleme (inpainting) aracı yok; kaba bir üst-üste
yapıştırma hem Falcon ibaresini görünür bırakır (marka ihlali riski) hem de "sonradan
yapıştırılmış" görünüme yol açar (yasak). Bu yüzden gerçek Falcon fotoğrafları hiç indirilmedi/
işlenmedi; bunun yerine — Aşama 15-16'da olduğu gibi — `scripts/generate_images.py` ile tamamen
özgün, gerçek Nefis Aroma logolu görseller üretildi. Kullanıcıya bu karar açıkça bildirildi.

**Adında/konseptinde ünlü bir e-likit markasının klonu olduğu açık veya olası ürünler bilinçli
olarak dışarıda bırakıldı** (ör. "Zıkkım" — açıkça klon olduğu yazılmış, "Bomb" — "klonu
orijinalinden iyi" ifadesi geçiyor, "Dragon's Blood"/"Cereal Killer" — Vampire Vape'in gerçek
ürünleri, "Custard Monster", "Farley's Gnarly Sauce-Bad Drip" — gerçek marka adı içeriyor,
"Barney Rubble"/"Donkey Kahn" — üçüncü taraf karakter/marka çağrışımı, "Fruit Loops" — Kellogg's
markası). Sadece jenerik tat kombinasyonları (ör. "elma+şeftali", "mango+şeftali+krema") ilham
olarak kullanıldı; bunlar hiçbir markaya özgü değildir.

**14 yeni ürün eklendi** (toplam **56 → 70 ürün**): Orchard Peach Apple, Mango Peach Custard,
Blue Razz Lemonade, Blueberry Mint Freeze, Coffee Milk Latte, Cola Menthol Chill, Tropic Berry
Splash, Sunny Peach Pineapple, Banana Ice Cooler, Energy Drink Chill, Vanilla Biscuit Nutcream,
Strawberry Milkshake Dream, Coconut Banana Cream, Pure Mint Frost. Hero istatistiği "50+" →
**"60+"** (gerçek konsantre sayısı 66).

Doğrulama: `typecheck`/`lint`/`build` temiz (**104 route, 70 ürün**, tamamı statik). `qa-console.mjs`
→ yalnızca beklenen 404 hatası. `qa-responsive.mjs` (320-1440px × 12 sayfa) → **0 taşma**.

**Önemli davranış notu:** Kullanıcı "gerçek rakip fotoğrafına logo koy" isterse ve ortamda
fotoğraf düzenleme/inpainting aracı yoksa, kaba bir logo-üstüne-yapıştırma yapma — bu hem marka
temizliği sağlamaz hem "yapıştırılmış" görünür. Bunun yerine mevcut prosedürel görsel
pipeline'ını (`scripts/generate_images.py <slug...>`) kullan ve kararı kullanıcıya açıkça bildir.

---

## TAMAMLANDI — Aşama 18 (gerçek "25 Yüksek Aroma" DIY Kit fotoğrafları, 2026-09-05)

Kullanıcı proje köküne `gorseller/` klasörü içinde **30 gerçek Nefis Aroma marka görseli**
bıraktı (kare 1254×1254 jpg, her biri gerçek logo/etiket/İçerik metniyle basılı — prosedürel
üretim değil, gerçek pazarlama görseli) ve bunları ana sayfa + ürünler sayfasına şık biçimde
yerleştirmesini istedi. Dosya adlarındaki bazı ek kelimeler (`-santa-`, `-suicide-bunny`,
`-the-milkman`, `-one-hit-wonder`, `-black-note`) görsellerin kendisinde **hiç görünmüyor** —
görseldeki tek gerçek başlık örn. "FIZZY", "MADRINA" — bu bir subagent ile 30 görselin tamamı
tek tek açılarak doğrulandı, üçüncü taraf marka adı hiçbir görselde bulunmadı.

**30 yeni ürün eklendi** (`src/data/products.ts`, toplam **70 → 100 ürün**), hepsi
`category: 'diy-kitler'`, `series: '25 Yüksek Aroma'`, `subcategory: '25 Yüksek Aroma Kit'`
(bu subcategory `src/data/categories.ts`'e eklendi). İsimler ve içerik notları görsellerdeki
gerçek metinden alındı (ör. Fizzy = karışık ekşi orman meyveleri + gazoz, Subzero = mentol+buz+nane,
Macchiato = kavrulmuş kahve+süt). 2 görselde İçerik metni tasarımda kesik/eksikti (Virginia,
MB-Ash) — bu ikisi için uydurma detay eklenmeden sade tütün profili yazıldı.

**Şema değişikliği:** `Seed`/`Product` tipine opsiyonel `heroImage?: string` eklendi
(`src/data/products.ts`). Verilirse `buildProduct`/`buildVariants` prosedürel 4'lü
`slug-1..4.webp` seti yerine tek gerçek fotoğrafı hem galeri hem tüm varyant görseli olarak
kullanır — çünkü bu 30 üründe gerçek foto zaten 30/60/100 ml'nin üçünü birden gösteriyor
(diy-kit formunun 3 hacim varyantıyla birebir örtüşüyor). Diğer 70 üründe `heroImage` yok,
davranışları değişmedi.

**Görseller:** `scripts/convert_diy25_images.py` (tek seferlik, `generate_images.py`'den
bağımsız) — `gorseller/*.jpg`'yi 1000×1000 webp'e çevirip `public/images/products/diy25-<slug>.webp`
olarak kaydeder.

**Yeni ana sayfa bölümü:** `src/components/home/Diy25Section.tsx` — `ProductRail` ile
`series === '25 Yüksek Aroma'` olan 30 ürünü gösterir, `BestSellersSection`'dan hemen sonra
(`src/app/page.tsx`). "Tümünü gör" → `/kategori/diy-kitler` (artık 32 ürün, mevcut
`ProductBrowser` filtre sistemi otomatik çalışıyor, kod değişikliği gerekmedi). `/urunler`
sayfası da otomatik 100 ürünü gösteriyor (statik değişiklik gerekmedi).

Doğrulama: `typecheck`/`lint`/`build` temiz (**134 route, 100 ürün**, tamamı statik).
Headless Chrome ile ana sayfa/`/urunler`/`/urun/fizzy`/`/kategori/diy-kitler` görsel olarak
kontrol edildi — gerçek fotoğraflar kart gridine/PDP galerisine sorunsuz oturuyor (kare format
zaten `aspect-square object-cover` ile birebir uyumlu).

**Önemli not:** Ana sayfada `AromaFinderSection`'dan sonra `LabProcess`/`CampaignBanner`/
`GuideTeaser`/`Testimonials`/`InstagramFeed`/`NewsletterSection` bölümleri headless Chrome
full-page screenshot'ta (otomatik scroll sonrası) boş/beyaz görünüyor — bu **bu oturumdan önce
de var olan**, muhtemelen Reveal/IntersectionObserver + Puppeteer scroll zamanlamasıyla ilgili
bir ekran görüntüsü artefaktı (önceki QA turlarında `qa-responsive.mjs`/`qa-console.mjs` ile
0 hata rapor edilmişti). Bu oturumda kapsam dışı bırakıldı; kullanıcı fark ederse veya
"devam et" derse önce gerçek tarayıcıda (screenshot değil) doğrulanmalı.

---

## KONVANSİYONLAR
- Sunucu bileşeni varsayılan; `'use client'` sadece etkileşim/hook gerekince.
- Mock data `src/data/`, iş mantığı `src/lib/`, global state `src/store/`.
- Görseller `next/image` ile; hero `priority`, altları `loading="lazy"` + `sizes`.
- Tüm butonlar çalışır durumda olacak; `href="#"` YASAK; "lorem ipsum" YASAK; emoji YASAK.
- Sahte sertifika/rakam/müşteri logosu YOK; sağlık iddiası YOK. Doğrulanmamış bilgiler `site.ts` içinde placeholder.
- Dil: Türkçe, profesyonel, klişesiz.
