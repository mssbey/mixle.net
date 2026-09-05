# Nefis Aroma

Nefis Aroma için hazırlanmış Türkçe ürün vitrini, e-ticaret arayüzü ve katalog
yönetim paneli. İki bölümden oluşur:

- **Vitrin (normal site)** — `/` altındaki herkese açık mağaza.
- **Admin paneli** — `/admin` altındaki ürün ve varyasyon yönetimi.

Next.js App Router, React, TypeScript ve Tailwind CSS kullanır. Sepet/favori
durumu Zustand ile, katalog verisi tek bir JSON dosyasıyla yönetilir.

> Bu bir vitrin/demo uygulamasıdır. Gerçek ödeme, üyelik, sipariş takibi veya
> çoklu kullanıcı rolü yoktur. Sipariş tamamlama ekranı gerçek sipariş oluşturmaz;
> admin girişi gerçek bir kimlik doğrulama değildir.

## Teknoloji

| Katman | Seçim |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | React 19, TypeScript 5, Tailwind CSS 3 |
| Durum | Zustand (sepet, favoriler, arayüz, admin veri sağlayıcısı) |
| Doğrulama | Zod (admin formları + Route Handler'lar) |
| Animasyon | framer-motion (`LazyMotion`, `reducedMotion="user"`) |
| İkon | lucide-react |
| Kalıcılık | `src/data/catalog.json` + atomik dosya yazımı (backend yok) |

## Kurulum ve çalıştırma

Node.js ve npm kurulu olmalıdır.

```sh
npm ci
npm run dev
```

Uygulamayı http://localhost:3000 adresinde açın.

Üretim derlemesi:

```sh
npm run build
npm start
```

## Ortam değişkenleri

Zorunlu değişken yoktur. Örnekler `.env.example` dosyasındadır; gerçek değerleri
`.env.local` içine yazın.

| Değişken | Varsayılan | Açıklama |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `https://nefisaroma.example` | Canonical, Open Graph ve sitemap için doğrulanmış alan adı |
| `ADMIN_PASSWORD` | `nefis-admin` | Admin paneli giriş parolası (tek paylaşılan parola) |
| `ADMIN_WRITE_ENABLED` | `false` | Üretimde katalog dosyasına yazmayı açar; geliştirmede zaten açıktır |
| `CHROME_PATH` | — | Yerel tarayıcı QA betikleri için Chrome/Chromium yolu |

---

## Vitrin (normal site)

Herkese açık Türkçe mağaza arayüzü. Tüm veriler demo kataloğundan gelir; fiyat,
stok ve varyasyonlar temsilidir.

### Özellikler

- Ürün listeleme, kategori ve koleksiyon sayfaları
- Ürün arama, çok kriterli filtreleme (kategori, profil, form, hacim, fiyat, tat)
  ve sıralama; filtre durumu URL'ye yazılır
- Ürün detayları: galeri + tam ekran, varyant seçimi, tat radarı, demo yorum/soru
- Sepet ve favoriler; tarayıcıda yerel olarak saklanır (Zustand `persist`)
- Aroma rehberi, aroma bulucu quiz, kampanyalar ve bilgilendirme sayfaları
- Mobil ve masaüstü uyumlu; `prefers-reduced-motion` desteği
- Her sayfada metadata/OG/canonical, JSON-LD (Organization, WebSite, Product,
  Breadcrumb, FAQPage), `sitemap.xml`, `robots.txt`, web manifest

### Sayfalar

| Rota | İçerik |
| --- | --- |
| `/` | Ana sayfa (hero, çok satanlar, yeni gelenler, koleksiyonlar, aroma bulucu, kampanya, rehber, bülten) |
| `/urunler` | Tüm ürünler + filtre/sıralama |
| `/kategori/[slug]` · `/koleksiyon/[slug]` | Kategori / koleksiyon vitrinleri |
| `/urun/[slug]` | Ürün detay sayfası |
| `/yeni-gelenler` · `/cok-satanlar` · `/kampanyalar` | Seçki sayfaları |
| `/arama` | Arama sonuçları |
| `/sepet` · `/favoriler` · `/hesabim` | Sepet, favoriler, hesap (üyelik placeholder) |
| `/siparis/tamamlandi` | Demo sipariş tamamlandı ekranı (gerçek sipariş oluşturmaz) |
| `/aroma-rehberi` · `/hakkimizda` · `/sss` · `/iletisim` | Bilgilendirme |
| `/gizlilik-politikasi` · `/cerez-politikasi` · `/mesafeli-satis-sozlesmesi` · `/iade-ve-teslimat` | Hukuki metinler |

### Veri

Vitrin bileşenleri `src/data/products.ts` ve `src/data/categories.ts`'ten okur.
Bu modüller `src/data/catalog.json`'u `src/data/catalog-adapter.ts` üzerinden
mevcut `Product` / `Category` tiplerine indirger — **export imzaları
değişmez**, yalnızca `status: "yayında"` olan ürünler vitrinde görünür. Genel
metinler `src/data/content.ts` içindedir.

---

## Admin paneli

`/admin` altında, vitrinden ayrı bir yerleşimle çalışan katalog yönetimi.
`robots: noindex, nofollow`.

### Giriş

`/admin/giris` üzerinden çerez tabanlı basit bir giriş vardır. Parola
`ADMIN_PASSWORD`'den okunur; tanımlı değilse `nefis-admin`. Erişim
`src/proxy.ts` ile sağlanır (Next.js 16'da `middleware` yerine `proxy`);
`/admin/**` ve `/api/admin/**` çerezsiz istekte sırasıyla `/admin/giris`'e
yönlendirilir veya **401** döner.

> **Bu gerçek bir kimlik doğrulama değildir:** tek paylaşılan parola, tek
> kullanıcı, rol yok. Yalnızca demo/vitrin korumasıdır.

### Rotalar

| Rota | İçerik |
| --- | --- |
| `/admin` | Özet: toplam ürün, yayında/taslak/arşiv dağılımı, stokta olmayan varyant sayısı, son düzenlenenler |
| `/admin/urunler` | Liste: arama, kategori/koleksiyon/durum filtresi, sıralama, sayfalama, toplu seçim (toplu aktif/pasif, durum, kategori değiştir, sil) |
| `/admin/urunler/yeni` · `/admin/urunler/[slug]` | Ürün formu: solda içerik, sağda durum/kategori/koleksiyon/SEO yan paneli; tam genişlik varyant tablosu; yapışkan alt kaydet çubuğu |
| `/admin/kategoriler` · `/admin/koleksiyonlar` | Ekle / düzenle / sil + sürükle-bırak sıralama |
| `/admin/ayarlar` | Veri dışa aktar (JSON/CSV), içe aktar, demo verisine sıfırla |
| `/admin/giris` | Parola girişi |

### Ürün ve varyasyon modeli

Tipler `src/types/admin.ts` içindedir. Ürün alanları: `slug`, `name`,
`shortDescription`, `description`, `categoryIds[]`, `collectionIds[]`, `tags[]`,
`images[]` (sıralanabilir, alt metin zorunlu), `status` (`taslak` | `yayında` |
`arşiv`), `seo` (title, description), tat profili/notaları, `createdAt`,
`updatedAt`.

Varyasyon iki katmanlıdır:

1. **Seçenek tanımları** (ürün bazında) — ör. `Aroma` → Vanilya / Fındık;
   `Hacim` → 30ml / 60ml / 100ml. Ad ve değerler eklenip sıralanabilir.
2. **Varyantlar** — seçenek kombinasyonlarından matris olarak üretilir. Her
   varyantta `sku`, `price`, `compareAtPrice` (indirim öncesi), `stock`,
   `barcode?`, `image?`, `isDefault`, `isActive`.

Davranışlar:

- Seçenek değeri eklenince matris yeniden üretilir; mevcut varyant verisi
  kombinasyon anahtarına göre eşleştirilerek korunur.
- Varyant tablosunda satır içi düzenleme + "tüm satırlara uygula" (fiyat, stok,
  yüzdesel indirim) ve genişletilebilir satır (barkod, görsel).
- Tam olarak bir varsayılan varyant zorunludur; ürün fiyat aralığı
  varyantlardan hesaplanır.
- Seçeneksiz ürün için tek bir gizli varsayılan varyant oluşturulur.

### Kalıcılık ve API

Katalog verisi tek kaynak olarak `src/data/catalog.json`'da tutulur;
`src/data/catalog.seed.json` demoya sıfırlama yedeğidir.

CRUD işlemleri `src/app/api/admin/**` Route Handler'larıyla yapılır:

| Uç | Metotlar |
| --- | --- |
| `/api/admin/catalog` | `GET` (tüm katalog + `canWrite`), `PUT` |
| `/api/admin/products` | `GET` (filtreli liste), `POST` |
| `/api/admin/products/[id]` | `GET`, `PATCH`, `DELETE` |
| `/api/admin/products/bulk` | `POST` (aktif/pasif, durum, kategori, sil) |
| `/api/admin/categories` · `/api/admin/categories/[id]` · `/api/admin/categories/reorder` | CRUD + sıralama |
| `/api/admin/collections` · `/api/admin/collections/[id]` · `/api/admin/collections/reorder` | CRUD + sıralama |
| `/api/admin/settings/export` | `GET` (`?format=json` \| `csv`) |
| `/api/admin/settings/import` | `POST` (JSON tam katalog \| CSV fiyat/stok yaması) |
| `/api/admin/settings/reset` | `POST` (seed'den geri yükle) |
| `/api/admin/auth` | `POST` (giriş), `DELETE` (çıkış) |

- **Yazma koruması:** yazma yalnızca `NODE_ENV !== "production"` **veya**
  `ADMIN_WRITE_ENABLED=true` iken çalışır. Aksi halde yazma uçları **403** döner
  ve panelde "salt okunur" rozeti görünür.
- **Doğrulama:** hem istemci formu hem sunucu tarafı Zod ile
  (`src/lib/admin/schema.ts`).
- **Atomik yazım:** geçici dosya + `rename`; `schemaVersion` alanı taşınır
  (`src/lib/admin/store.ts`).
- Kaydedilmemiş değişiklikte sayfadan ayrılma uyarısı gösterilir.

### Tasarım ve erişilebilirlik

- Vitrinle ayni token ailesi (`globals.css` / `tailwind.config.ts`), yeni renk
  yok. Sol ikonlu daraltılabilir sidebar, üstte breadcrumb + arama, yapışkan
  tablo başlığı ve yapışkan alt kaydet çubuğu.
- Durum rozetleri, boş durum ekranları, iskelet yükleme, optimistik güncelleme,
  toast bildirimleri, yıkıcı işlemler için onay diyaloğu.
- Tam klavye desteği, görünür odak halkası, modal/drawer'da odak tuzağı,
  `aria-live` bildirim bölgesi, form hataları alan altında metinle.
- Mobilde tablo kart görünümüne düşer.
- Tüm metinler Türkçe; tarih ve para birimi `tr-TR` / `TRY`.

---

## Proje yapısı

| Yol | İçerik |
| --- | --- |
| `src/app` | Vitrin sayfaları, ana yerleşim, genel stiller, SEO uçları |
| `src/app/admin` | Admin paneli sayfaları + `admin.css` |
| `src/app/api/admin` | Admin CRUD Route Handler'ları |
| `src/proxy.ts` | `/admin` ve `/api/admin` erişim koruması |
| `src/components` | Vitrin bileşenleri + `layout/LayoutFrame.tsx` (vitrin/panel ayrımı) |
| `src/components/admin` | Panel bileşenleri (shell, veri sağlayıcı, form, varyant tablosu, taksonomi vb.) |
| `src/data` | `catalog.json`, `catalog.seed.json`, adaptör, `products.ts`, `categories.ts`, `content.ts` |
| `src/store` | Sepet, favoriler, arayüz, toast |
| `src/lib` | Arama, filtreleme, sepet hesapları, yardımcılar |
| `src/lib/admin` | Şema, kalıcılık, varyant matrisi, CSV, kimlik, HTTP yardımcıları |
| `src/types` | `index.ts` (vitrin), `admin.ts` (panel) |
| `public` | Statik dosyalar ve görseller |
| `scripts` | Görsel işleme ve tarayıcı QA betikleri |

## Kontroller ve QA

```sh
npm run lint
npm run typecheck
```

Tarayıcı kontrolleri için uygulamayı ayrı bir terminalde 3111 portunda başlatın:

```sh
npm run dev -- --port 3111
```

Ardından:

```sh
npm run qa:console        # 20 sayfa: konsol / hydration hataları
npm run qa:interactions   # arama, menü, sepet, varyant, favori, filtre, galeri…
npm run qa:responsive     # 360–1920px × sayfalar: yatay taşma taraması
node scripts/qa-visual.mjs # ekran görüntüleri + axe (WCAG 2 A/AA) → artifacts/qa/
```

Betikler Puppeteer kullanır; önce `CHROME_PATH`, sonra yaygın Windows/macOS/Linux
Chrome yolları denenir. Hedef adres `http://localhost:3111`.

## Geliştirme notu

Kod değişikliğinden önce `AGENTS.md` yönergelerini ve kullanılan Next.js
sürümüne ait `node_modules/next/dist/docs/` belgelerini okuyun. `next dev`,
proje köküne kendi ajan bloğunu yeniden ekler (Next 16 davranışı).

## Tasarım ve görseller

Sıcak krem ve marka moru üzerine kurulu ortak tasarım sistemi. Görsel kaynakları
ve üretim promptları [GENERATED_ASSETS.md](GENERATED_ASSETS.md) dosyasındadır.
Görseller temsilidir; fiyat, varyasyon ve stoklar demo katalog verileridir.
Gerçek müşteri puanı, doğrulanmış yorum veya ödeme altyapısı sunulmaz.

## Kapsam dışı

Gerçek ödeme, üyelik, sipariş yönetimi, çoklu kullanıcı rolleri, harici
veritabanı.
