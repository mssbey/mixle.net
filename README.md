# Nefis Aroma

Nefis Aroma için hazırlanmış Türkçe ürün vitrini ve e-ticaret arayüzü. Next.js App Router, React, TypeScript ve Tailwind CSS kullanır. Sepet ve favori durumu Zustand ile yönetilir.

## Özellikler

- Ürün listeleme, kategori ve koleksiyon sayfaları
- Ürün arama, filtreleme ve ürün detayları
- Sepet ve favoriler; tarayıcıda yerel olarak saklanan veriler
- Aroma rehberi, kampanyalar ve bilgilendirme sayfaları
- Mobil ve masaüstü ekranlara uyumlu tasarım

Bu sürüm bir vitrin/demo uygulamasıdır. Gerçek ödeme, üyelik ve sipariş takibi altyapısı bulunmaz. Sipariş tamamlama ekranı gerçek sipariş oluşturmaz.

## Kurulum ve çalıştırma

Node.js ve npm kurulu olmalıdır. Proje klasöründe:

```sh
npm ci
npm run dev
```

Uygulamayı http://localhost:3000 adresinde açın. Zorunlu ortam değişkeni yoktur. Yayın alan adı doğrulandığında `.env.local` içinde `NEXT_PUBLIC_SITE_URL` tanımlayın; aksi durumda SEO bağlantıları `https://nefisaroma.example` placeholder alan adını kullanır. Örnekler `.env.example` dosyasındadır.

Üretim derlemesini yerelde çalıştırmak için:

```sh
npm run build
npm start
```

## Kontroller

```sh
npm run lint
npm run typecheck
```

Tarayıcı kontrolleri için önce uygulamayı ayrı bir terminalde 3111 portunda başlatın:

```sh
npm run dev -- --port 3111
```

Ardından kontrolleri çalıştırın:

```sh
npm run qa:console
npm run qa:interactions
npm run qa:responsive
```

Bu betikler Puppeteer kullanır. Önce `CHROME_PATH`, sonra yaygın Windows, macOS ve Linux Chrome/Chromium yolları kontrol edilir. Tarayıcı bulunamazsa açıklayıcı hata verilir. Hedef adres `http://localhost:3111` olarak tanımlıdır.

## Admin paneli

`/admin` altında ürün ve varyasyon yönetimi için ayrı bir panel bulunur.

### Giriş

`/admin/giris` üzerinden çerez tabanlı basit bir giriş vardır. Parola
`ADMIN_PASSWORD` ortam değişkeninden okunur; tanımlı değilse `nefis-admin`
kullanılır. **Bu gerçek bir kimlik doğrulama değildir:** tek paylaşılan parola,
tek kullanıcı, rol yok. Yalnızca demo/vitrin korumasıdır. Erişim `src/proxy.ts`
ile (Next.js 16'da `middleware` yerine `proxy`) sağlanır.

### Rotalar

| Rota | İçerik |
| --- | --- |
| `/admin` | Özet: toplam ürün, durum dağılımı, stokta olmayan varyant sayısı, son düzenlenenler |
| `/admin/urunler` | Liste: arama, kategori/koleksiyon/durum filtresi, sıralama, sayfalama, toplu işlemler |
| `/admin/urunler/yeni` · `/admin/urunler/[slug]` | Ürün formu (iki kolon + varyant tablosu) |
| `/admin/kategoriler` · `/admin/koleksiyonlar` | Ekle/düzenle/sil + sürükle-bırak sıralama |
| `/admin/ayarlar` | Dışa aktar (JSON/CSV), içe aktar, demo verisine sıfırla |

### Veri ve kalıcılık

Katalog verisi tek kaynak olarak `src/data/catalog.json` dosyasında tutulur
(`src/data/catalog.seed.json` demoya sıfırlama yedeğidir). `src/data/products.ts`
ve `src/data/categories.ts` bu JSON'u `src/data/catalog-adapter.ts` üzerinden
mevcut `Product` / `Category` tiplerine indirger; vitrin bileşenlerinin gördüğü
export imzaları değişmez.

Yazma işlemleri `src/app/api/admin/**` altındaki Route Handler'larla yapılır.
Yazma yalnızca `NODE_ENV !== "production"` veya `ADMIN_WRITE_ENABLED=true` iken
çalışır; aksi halde uçlar **403** döner ve panelde "salt okunur" rozeti görünür.
Kayıt öncesi hem istemci hem sunucu tarafında Zod ile doğrulama yapılır; dosyaya
yazım atomiktir (geçici dosya + `rename`) ve `schemaVersion` alanı taşınır.

### Varyasyon modeli

İki katmanlıdır: ürün bazında **seçenek tanımları** (ör. `Aroma` → Vanilya/Fındık,
`Hacim` → 30ml/60ml/100ml) ve bu seçeneklerin kombinasyonundan üretilen
**varyantlar** (`sku`, `price`, `compareAtPrice`, `stock`, `barcode`, `image`,
`isDefault`, `isActive`). Seçenek değeri eklenince matris yeniden üretilir ve
mevcut varyant verisi kombinasyon anahtarına göre korunur. Her üründe tam olarak
bir varsayılan varyant bulunur; seçeneksiz ürünler tek gizli varyantla yönetilir.

## Proje yapısı

| Klasör | İçerik |
| --- | --- |
| `src/app` | Sayfalar, ana yerleşim, genel stiller, SEO uçları ve `/admin` paneli |
| `src/app/api/admin` | Admin CRUD Route Handler'ları |
| `src/components` | Arayüz, ürün, ana sayfa, yerleşim ve `admin/` bileşenleri |
| `src/data` | Ürünler, kategoriler, menüler, içerikler ve `catalog.json` |
| `src/store` | Sepet, favoriler ve arayüz durumu |
| `src/lib` | Arama, filtreleme, sepet hesapları, yardımcılar ve `admin/` (şema, kalıcılık, varyant) |
| `src/types` | TypeScript tipleri (`index.ts`, `admin.ts`) |
| `public` | Statik dosyalar |
| `scripts` | Görsel işleme ve tarayıcı kontrol betikleri |

Ürün içerikleri artık admin panelinden (`/admin`) veya doğrudan
`src/data/catalog.json` üzerinden düzenlenebilir; genel içerikler
`src/data/content.ts` üzerindedir.

## Geliştirme notu

Kod değişikliklerinden önce `AGENTS.md` yönergelerini ve kullanılan Next.js sürümüne ait `node_modules/next/dist/docs/` belgelerini okuyun.

## Tasarım ve görseller

Sıcak krem ve marka moru üzerine kurulu ortak tasarım sistemi kullanılır. Görsel kaynakları ve üretim promptları [GENERATED_ASSETS.md](GENERATED_ASSETS.md) dosyasındadır. Görseller temsilidir; fiyat, varyasyon ve stoklar demo katalog verileridir. Gerçek müşteri puanı, doğrulanmış yorum veya ödeme altyapısı sunulmaz.

Ek görsel ve erişilebilirlik kontrolü: `node scripts/qa-visual.mjs`. Ekran görüntüleri ve axe raporu `artifacts/qa/` altında oluşturulur. Kontrol genişlikleri: 360, 390, 768, 1024, 1440 ve 1920 piksel.
