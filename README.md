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
| Veritabanı | Prisma 7 + SQLite (`data/nefis.db`); `DATABASE_URL` ile Postgres'e taşınabilir |
| Kimlik doğrulama | `jose` imzalı httpOnly oturum çerezi + `crypto.scrypt` parola özeti, rol tabanlı yetki |

## Kurulum ve çalıştırma

Node.js ve npm kurulu olmalıdır.

```sh
npm ci                      # postinstall Prisma istemcisini üretir
cp .env.example .env        # SESSION_SECRET ve ENCRYPTION_KEY doldurun
npm run db:deploy           # veritabanı şemasını uygula
npm run db:seed             # demo kataloğu yükle
npm run admin:create-user   # ilk `sahip` kullanıcısını oluştur
npm run dev
```

Uygulamayı http://localhost:3000, paneli http://localhost:3000/admin adresinde açın.

`SESSION_SECRET` ve `ENCRYPTION_KEY` üretmek için:

```sh
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"  # SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"     # ENCRYPTION_KEY
```

Üretim derlemesi:

```sh
npm run build
npm start
```

## Ortam değişkenleri

Şablon `.env.example` dosyasındadır; gerçek değerleri `.env` içine yazın
(`.env` git'e girmez).

| Değişken | Zorunlu | Açıklama |
| --- | --- | --- |
| `DATABASE_URL` | evet | Prisma bağlantısı. Varsayılan `file:./data/nefis.db` (yol proje köküne göre) |
| `SESSION_SECRET` | evet | Oturum çerezini imzalar; en az 32 karakter |
| `ENCRYPTION_KEY` | `DEMO_MODE=false` iken | Hassas ayarların AES-256-GCM anahtarı (32 bayt base64). **Kaybedilirse şifreli veriler okunamaz** |
| `DEMO_MODE` | hayır (varsayılan `true`) | Ödeme sağlayıcılarını test moduna zorlar; e-postalar gönderilmez, `EmailLog`'a yazılır |
| `NEXT_PUBLIC_SITE_URL` | hayır | Canonical, Open Graph ve sitemap için doğrulanmış alan adı |
| `CHROME_PATH` | hayır | Yerel tarayıcı QA betikleri için Chrome/Chromium yolu |
| `CRON_SECRET` | zamanlanmış kargo takibi için | `/api/cron/kargo-takip` ve `scripts/sync-shipments.mts`'i korur (paylaşımlı rastgele dize) |

Ödeme, kargo, e-posta ve e-fatura değişkenleri `.env.example` içinde listelenir;
ilgili faz (F3/F4/F7) uygulanana kadar boş kalabilir.

> **Dağıtım uyarısı:** SQLite dosyası Vercel gibi sunucusuz ortamlarda kalıcı
> **değildir**. Canlıya çıkmadan önce `DATABASE_URL`'i Postgres'e çevirin ve
> `prisma/schema.prisma` içindeki `provider` alanını `postgresql` yapıp yeniden
> migration üretin.

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

### Checkout ve hesap (F1)

| Rota | İçerik |
| --- | --- |
| `/odeme` | Beş adımlı checkout: iletişim → adres (il/ilçe/mahalle) → kargo → ödeme → özet + yasal onaylar |
| `/odeme/dogrulama` | **Test modu** mock 3D Secure sayfası; müşteri sonucu seçer. `DEMO_MODE=false` iken müşteri sağlayıcının kendi sayfasına gider |
| `/siparis/tamamlandi?no=…&t=…` | Gerçek sipariş özeti; `t` imzalı erişim jetonu, yoksa yalnız "alındı" mesajı |
| `/siparis-takibi` | Misafir sorgulama: sipariş no + e-posta (IP başına dakikada 10 deneme) |
| `/giris` · `/kayit` | Müşteri hesabı; misafir siparişleri aynı e-postayla kayıt olunca hesaba bağlanır |
| `/hesabim/siparisler` · `/hesabim/siparisler/[no]` | Siparişlerim, detay, kargolanmamış siparişi iptal, ödemeyi tamamla, teslim edilmiş siparişte iade talebi aç |
| `/hesabim/adresler` · `/hesabim/bilgilerim` | Adres defteri (TCKN şifreli, maskeli), profil ve parola |

Ödeme yöntemleri: kart (`DEMO_MODE=true` iken mock; taksit seçenekleri teklifte
gösterilir), havale/EFT (panelden eşleştirilir), kapıda ödeme (ek hizmet bedeli ve
üst tutar sınırı ayarlanabilir). Yöntemlerin açık/kapalı durumu ve min/maks tutarları
`/admin/ayarlar/odeme` ekranından yönetilir. Kupon kodları
veritabanındaki `Coupon` tablosundan gelir; demo kodlar seed ile yüklenir
(`NEFIS10`, `ILKAROMA`, `GOLDENDROP`).

**Güvenlik ilkeleri.** Tutar istemciden alınmaz — her adımda `/api/checkout/quote`
sunucuda yeniden hesaplar ve sipariş oluşturulurken bir kez daha hesaplanır.
Stok rezervasyonla düşürülür (`stock >= adet` koşullu güncelleme), ödeme
onaylanınca kesinleşir, süresi dolarsa geri verilir. `Idempotency-Key` başlığı
aynı isteğin ikinci gönderiminde aynı siparişi döndürür. Kabul edilen mesafeli
satış / ön bilgilendirme / KVKK metinlerinin **sürümü** siparişe yazılır.
Yazma uçları `Origin` doğrulaması + `sameSite=lax` çerezle korunur.

### Ödeme altyapısı (F3)

Tüm sağlayıcılar tek arayüzü uygular (`src/server/payments/provider.ts`:
`createPayment / capture / refund / verifyWebhook / getStatus`). Kart verisi
**hiçbir zaman** bu sunucuya gelmez; müşteri sağlayıcının barındırılan (hosted)
sayfasına yönlendirilir, sonuç webhook/dönüş adresiyle işlenir.

| Sağlayıcı | Dosya | Durum |
| --- | --- | --- |
| `mock` | `adapters/mock.ts` | Test akışı; `DEMO_MODE=true` iken kart için zorunlu |
| `iyzico` | `adapters/iyzico.ts` | Checkout Form (initialize/retrieve). **Sandbox'ta doğrulanmadı** |
| `paytr` | `adapters/paytr.ts` | iFrame token + HMAC bildirim. İmza birim testli; **canlıda doğrulanmadı** |
| `stripe` | `adapters/stripe.ts` | Checkout Session + imzalı webhook. **Test anahtarıyla doğrulanmadı** |
| `havale`, `kapida` | `adapters/manual.ts` | Manuel; panelden "ödeme alındı" |

Akış: `createOrder` → `startCardPayment` (Payment `başlatıldı`) → sağlayıcı sayfası →
`POST /api/webhooks/payments/[provider]` (veya `/api/payments/[provider]/donus`) →
`handlePaymentWebhook`: imza doğrulama, `WebhookEvent(provider, externalId)` ile
**idempotent** işleme (aynı olay ikinci kez gelirse dokunulmaz), tutar karşılaştırma,
`transitionOrder` ile `ödendi` / `başarısız`. Başarılı ödemeden sonra gelen geç
"başarısız" bildirimi yoksayılır. Ham yükler maskelenerek saklanır (PAN/CVV/TCKN
kalıpları ve `cardNumber`, `cvv`, `secretKey` gibi anahtarlar `src/server/log.ts`
içinde silinir). Kart iadesi önce sağlayıcıda denenir; `Refund.status`
`bekliyor → tamamlandı` webhook'la kesinleşir.

Panel: `/admin/odemeler` (tüm işlemler, başarısız, iadeler, mutabakat, webhook
günlüğü) ve `/admin/ayarlar/odeme` (yalnız `sahip`; sağlayıcı anahtarları
`ENCRYPTION_KEY` ile AES-256-GCM şifrelenip `Setting` tablosuna yazılır, panele
maskeli döner, boş/maskeli gönderilen alan değiştirilmez). Ortam değişkenleri
(`IYZICO_*`, `PAYTR_*`, `STRIPE_*`) panelde kayıt yoksa yedek olarak okunur.
Webhook adresleri `NEXT_PUBLIC_SITE_URL` üzerinden üretilir; yerelde sağlayıcı
webhook'u için tünel (ör. `cloudflared`, `ngrok`) gerekir.

### Kargo altyapısı (F4)

Sevkiyat oluşturma ve durum güncelleme bu sürümde tamamen manueldir: takip
numarası panelden elle girilir/güncellenir (`src/server/shipping/shipments.ts`).
`src/server/shipping/provider.ts` + `adapters/{yurtici,aras,mng,surat,ptt}.ts`
gerçek taşıyıcı API'lerine bağlanmak İÇİNDİR, ama bu firmaların merchant API'leri
herkese açık/standart olmadığından **gerçek bir HTTP çağrısı bu sürümde
uygulanmadı** — yanlış bir istek gövdesi üretip sessizce hata almaktansa,
`configured()` paneldeki ayarları yansıtır ve çağrılar açıkça "uygulanmadı" hatası
döner (`manuel` ve `kendi-kuryemiz` her zaman çalışır). Anahtarlar yine de
şifrelenip saklanır ki gerçek entegrasyon eklenince panel değişmeden çalışsın.

Takip senkronizasyonunun TEK giriş noktası `src/server/shipping/tracking.ts`
(`syncShipment` / `syncAllActiveShipments`) — panelin "Takibi yenile" düğmesi,
zamanlanmış `POST /api/cron/kargo-takip` (paylaşımlı `CRON_SECRET` ile korunur,
`src/proxy.ts` matcher'ının kapsamı dışındadır — tıpkı `/api/webhooks/**` gibi)
ve `scripts/sync-shipments.mts` (`npm run kargo:sync`, ops betiği; gerçek bir
zamanlayıcının üretimde yapacağı HTTP isteğinin aynısını atar) aynı fonksiyonu
kullanır. Bugün tüm taşıyıcılar için `updated: false` döner (dürüst mesajla) —
bağlı bir API olmadığı için beklenen davranış budur.

Bölge/tarife: `/admin/ayarlar/kargo` bölgeleri (il eşleşmesi, ilk eşleşen
kazanır — bir il için özel tarife istenirse o bölge varsayılan "Türkiye"
bölgesinden ÖNCE sıralanmalıdır) ve her bölgenin yöntemlerini (sabit / desiye
göre kademeli / sepet tutarına göre kademeli / her zaman ücretsiz / kapıda)
yönetir; checkout `src/server/shipping/zones.ts` üzerinden okur (React `cache()`
— istek başına önbellek, yazma sonrası bir sonraki istekte güncel gelir). Kapıda
ödeme hizmet bedeli ve üst tutar sınırı da bu ekrandan yönetilir; ayrıca
Ayarlar → Ödeme → Kapıda ödeme limitleri de uygulanır (iki ayrı kısıtlama).

Etiket: `/admin/kargolar/yazdir?ids=…` gerçek bir taşıyıcı barkodu DEĞİLDİR —
adres, takip no ve içerik özetini taşıyan A6 paket etiketi (tarayıcıdan PDF).

### Müşteri hizmetleri (F5)

**İadeler.** Sipariş durum makinesindeki `teslim-edildi`/`tamamlandı` → `iade-talebi`
geçişi bu fazda ilk kez kullanılır. Müşteri `/hesabim/siparisler/[no]`'dan kalem
seçip talep açar (cayma hakkı süresi `withdrawalDays` ile sınırlı, aynı anda tek
açık talep); sipariş otomatik `iade-talebi`ne geçer ve "talebiniz alındı" e-postası
gider. Panelde (`/admin/iadeler`) akış: **onayla** (talimat + iade kodu, e-posta
gider) → müşteri kargoyla gönderir → **ürün alındı** → **tamamla** (mevcut
`orders/refunds.ts::createRefund` çağrılır — sağlayıcı iadesi, stok geri, e-posta).
Tam iade + teslim edilmiş sipariş otomatik `iade-edildi`ye geçer; kısmi iadede
sipariş `tamamlandı`/`teslim-edildi`ye geri döner (iade-talebinde takılı kalmaz).
**Reddet** her aşamada mümkündür (gerekçe zorunlu, e-posta gider, sipariş eski
durumuna döner) — reddedilen talep sonrası yeni talep açılabilir.

**Kuponlar.** `/admin/kuponlar` mevcut `Coupon` tablosunu ve `pricing/coupons.ts`
değerlendirme mantığını (F1'den beri checkout'ta kullanılıyor) panelden yönetir.
Kullanılmış kupon (`usedCount > 0`) silinemez — geçmiş kullanım kaydı
(`CouponRedemption`) korunsun diye pasife alınır.

**Stok.** `/admin/stok` düşük stok raporu (`lowStockThreshold` ayarı, yayındaki
ürünler) ve tüm `StockMovement` geçmişinin dökümünü gösterir. Manuel düzeltme
(sayım farkı, fire) negatif stoku engeller ve denetim kaydına yazılır; sipariş/
iptal/iade hareketleri zaten F1'den beri otomatik yazılıyordu, burası yalnız
görünürlük ve manuel müdahale ekler.

**Müşteriler.** `/admin/musteriler` sipariş sayısı ve toplam harcamayı (iptal/
başarısız hariç durumlar üzerinden) hesaplar, panel notu ve etiket düzenlemeye
izin verir. **KVKK anonimleştirme** geri alınamaz: e-posta/ad/telefon/adres
defteri silinir, oturumlar kapatılır, giriş engellenir — ama geçmiş
siparişlerdeki adres ANLIK GÖRÜNTÜSÜ (`Order.shippingAddress` vb.) bilinçli
olarak korunur; bunlar mali/hukuki saklama süresine tabi belgelerdir, müşteri
profiliyle aynı şey değildir.

### Veri

Vitrin bileşenleri `src/data/products.ts` ve `src/data/categories.ts`'ten okur.
Bu modüller **veritabanından** okur ve `src/data/catalog-adapter.ts` üzerinden
mevcut `Product` / `Category` tiplerine indirger; yalnızca `status: "yayında"`
olan ürünler vitrinde görünür. Genel metinler `src/data/content.ts` içindedir.

**Sunucu / istemci ayrımı.** Veri katmanı `server-only`dir; artık asenkron
fonksiyonlar dışa verir (`getProducts()`, `getCategories()`, …). Client
bileşenleri veriyi üç yoldan alır:

| Kaynak | Kullanan |
| --- | --- |
| Sunucu bileşeninden prop | Ana sayfa bölümleri, ürün/kategori sayfaları |
| `CatalogProvider` context'i (kategoriler + koleksiyonlar, ~10 KB) | Header, mega menü, filtreler, footer |
| `/api/catalog/slim` (talep üzerine) | Sepet, favoriler, arama katmanı, son görüntülenenler |

Bu ayrım sayesinde 527 KB'lık katalog artık istemci paketine **girmiyor**.
Vitrin sorguları `unstable_cache` ile etiketlenir; panelden her yazma sonrası
`revalidateCatalog()` önbelleği düşürür.

**Para birimi.** Tutarlar veritabanında ve admin modelinde tam sayı **kuruş**
olarak tutulur (`priceMinor: 12990` = 129,90 ₺). Vitrin `Product` tipi geriye
dönük uyumluluk için TL cinsindedir; dönüşüm yalnızca
`src/data/catalog-adapter.ts` içinde yapılır. Yardımcılar `src/lib/money.ts`.

---

## Admin paneli

`/admin` altında, vitrinden ayrı bir yerleşimle çalışan katalog yönetimi.
`robots: noindex, nofollow`.

### Giriş

E-posta + parola ile gerçek kimlik doğrulama. Kullanıcılar `User` tablosunda
tutulur; parolalar Node yerleşik `crypto.scrypt` ile özetlenir (native derleme
gerektirmez). Oturum, `jose` ile imzalanmış bir JWT'yi `httpOnly` + `sameSite=lax`
çerezde taşır ve ayrıca `Session` tablosunda kayıtlıdır.

İlk kullanıcıyı oluşturmak için:

```sh
npm run admin:create-user                 # etkileşimli
npm run admin:create-user -- --list       # mevcut kullanıcıları listele
```

**Roller ve izinler** `src/server/auth/rbac.ts` içinde tek tablo olarak tanımlıdır:

| Rol | Yetki |
| --- | --- |
| `sahip` | Tam yetki (kullanıcı yönetimi + ödeme anahtarları dahil) |
| `yönetici` | Kullanıcı yönetimi ve ödeme anahtarları hariç her şey |
| `editör` | Yalnızca katalog: ürün, kategori, koleksiyon, stok |
| `sipariş-sorumlusu` | Sipariş, kargo, iade; **ürün silemez** |
| `görüntüleyici` | Salt okunur |

**İki katmanlı kontrol.** `src/proxy.ts` (Next.js 16'da `middleware` yerine
`proxy`) yalnızca jetonun imzasına ve rolün rotaya yetip yetmediğine bakan kaba
bir filtredir — Edge'de çalıştığı için veritabanına erişemez. **Asıl kontrol**
her Route Handler'da `requirePermission()` ile yapılır: oturum iptal edilmiş mi,
kullanıcı hâlâ aktif mi, rol bu işleme yetiyor mu. Rol jetondan değil
veritabanından okunur, böylece rol değişikliği anında geçerli olur.

Yetki asla yalnızca arayüzde gizlenerek uygulanmaz.

**Kaba kuvvet koruması.** IP + e-posta bazlı sayaç (`LoginAttempt`): 15 dakika
içinde 5 hatalı denemede 15 dakika kilit. Hata mesajı hesabın var olup
olmadığını sızdırmaz ve kullanıcı bulunamadığında da parola doğrulaması kadar
zaman harcanır.

**Denetim kaydı.** Katalog, ayar ve oturum işlemleri `AuditLog`'a yazılır: kim,
ne zaman, hangi kaydın hangi alanlarını değiştirdi (öncesi/sonrası diff).

### Rotalar

| Rota | İçerik |
| --- | --- |
| `/admin` | Özet: toplam ürün, yayında/taslak/arşiv dağılımı, stokta olmayan varyant sayısı, son düzenlenenler |
| `/admin/urunler` | Liste: arama, kategori/koleksiyon/durum filtresi, sıralama, sayfalama, toplu seçim (toplu aktif/pasif, durum, kategori değiştir, sil) |
| `/admin/urunler/yeni` · `/admin/urunler/[slug]` | Ürün formu: solda içerik, sağda durum/kategori/koleksiyon/SEO yan paneli; tam genişlik varyant tablosu; yapışkan alt kaydet çubuğu |
| `/admin/kategoriler` · `/admin/koleksiyonlar` | Ekle / düzenle / sil + sürükle-bırak sıralama |
| `/admin/ayarlar` | Veri dışa aktar (JSON/CSV), içe aktar, demo verisine sıfırla |
| `/admin/siparisler` | Sipariş listesi: durum sekmeleri (sayaçlı), arama (no/ad/e-posta/telefon/ürün/SKU/takip no), tarih/tutar/ödeme/kargo/kaynak filtreleri, sıralama, sayfalama, toplu işlemler (durum, kargoya ver, yazdır), CSV |
| `/admin/siparisler/[id]` | WooCommerce düzeninde detay: kalemler (düzenle + yeniden hesapla), toplamlar ve KDV matrahı, müşteri kartı (sipariş sayısı, harcama), adresler (düzenlenebilir), ödemeler (maskeli), sevkiyatlar, iadeler, zaman çizelgesi, admin/müşteri notu |
| `/admin/siparisler/yeni` | Manuel / telefon siparişi (`?kopya=<id>` ile kopyalama); vitrinle aynı `createOrder` servisi |
| `/admin/siparisler/[id]/yazdir?tip=fatura\|irsaliye` | Yazdırılabilir bilgi fişi / irsaliye (tarayıcıdan PDF); toplu: `/admin/siparisler/yazdir?ids=…` |
| `/admin/odemeler` | Ödeme işlemleri: sağlayıcı/durum/tarih filtresi, tutar özetleri, başarısız ödemeler, iade kuyruğu, mutabakat (sipariş toplamı ≠ başarılı tahsilat), webhook günlüğü (maskeli yük) |
| `/admin/ayarlar/odeme` | Yalnız `sahip`: aktif kart sağlayıcısı, yöntem açık/kapalı + min/maks tutar, 3DS zorunluluğu, iyzico/PayTR/Stripe anahtarları (şifreli, maskeli), havale IBAN bilgisi |
| `/admin/kargolar` | Tüm siparişlerdeki sevkiyatlar: durum sekmeleri, firma/arama filtresi, hızlı durum güncelleme, toplu takip yenileme, toplu etiket yazdırma |
| `/admin/kargolar/yazdir?ids=…` | Yazdırılabilir kargo etiketi (A6), her sevkiyat ayrı sayfada |
| `/admin/ayarlar/kargo` | Bölge/tarife yönetimi (il eşleşmesi, sabit/desi/tutara-göre/ücretsiz/kapıda kademeler), taşıyıcı bağlantıları (şifreli, maskeli), kapıda ödeme hizmet bedeli ve üst tutar sınırı |
| `/admin/iadeler` | Müşteri iade talepleri: durum sekmeleri (talep/onaylandı/ürün-alındı/tamamlandı/reddedildi), onay/red (e-posta gider), ürün alındı, tamamla (gerçek iade işler, stok geri) |
| `/admin/musteriler` · `/admin/musteriler/[id]` | Hesaplı müşteriler: sipariş sayısı/harcama, adres defteri, son siparişler, panel notu/etiket, KVKK anonimleştirme |
| `/admin/kuponlar` | İndirim kodu CRUD: yüzde/tutar/ücretsiz kargo, tarih/limit/ürün-kategori kısıtları |
| `/admin/stok` | Düşük stok raporu (+ manuel düzelt), tüm stok hareketlerinin dökümü (sipariş/iptal/iade/manuel/sayım/fire) |
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

Katalog verisi **veritabanındadır** (`prisma/schema.prisma`).
`src/data/catalog.seed.json` demoya sıfırlama kaynağıdır; özgün
`catalog.json` geçiş sonrası `src/data/legacy/` altına arşivlenmiştir ve
uygulama tarafından okunmaz.

Veritabanı komutları:

| Komut | İş |
| --- | --- |
| `npm run db:deploy` | Migration'ları uygula (kurulum / dağıtım) |
| `npm run db:migrate` | Şema değişikliğinden yeni migration üret (geliştirme) |
| `npm run db:seed` | Demo kataloğu yükle (katalog tablolarını sıfırlar) |
| `npm run db:migrate-catalog` | Arşivlenmiş JSON'dan içe aktar (`--dry-run` destekler) |
| `npm run db:studio` | Prisma Studio |

Şema taşınabilirlik kuralları (bozmayın): Prisma `enum` ve skaler liste
(`String[]`) **kullanılmaz** — ikisi de SQLite'ta yok; durum alanları `String` +
Zod, listeler `Json`. Tutarlar `Int` kuruş, oranlar `Int` on binde.

CRUD işlemleri `src/app/api/admin/**` Route Handler'larıyla yapılır:

| Uç | Metotlar |
| --- | --- |
| `/api/admin/catalog` | `GET` (tüm katalog + kullanıcı/izinler) |
| `/api/admin/products` | `GET` (filtreli liste), `POST` |
| `/api/admin/products/[id]` | `GET`, `PATCH`, `DELETE` |
| `/api/admin/products/bulk` | `POST` (aktif/pasif, durum, kategori, sil) |
| `/api/admin/categories` · `/api/admin/categories/[id]` · `/api/admin/categories/reorder` | CRUD + sıralama |
| `/api/admin/collections` · `/api/admin/collections/[id]` · `/api/admin/collections/reorder` | CRUD + sıralama |
| `/api/admin/settings/export` | `GET` (`?format=json` \| `csv`) |
| `/api/admin/settings/import` | `POST` (JSON tam katalog \| CSV fiyat/stok yaması) |
| `/api/admin/settings/reset` | `POST` (seed'den geri yükle) |
| `/api/admin/auth` | `POST` (giriş), `DELETE` (çıkış), `GET` (oturum bilgisi) |
| `/api/admin/orders` | `GET` liste (+`format=csv`), `POST` manuel sipariş |
| `/api/admin/orders/[id]` | `GET` panel görünümü, `PATCH` adres/not |
| `/api/admin/orders/[id]/durum` · `odeme` · `iade` · `kargo` · `kargo/[shipmentId]` · `kalemler` · `eposta` | Durum geçişi (409 ile korunur), ödeme al, kısmi iade, kısmi sevkiyat, sevkiyat güncelle, kalem düzenle + yeniden hesapla, e-posta yeniden gönder |
| `/api/admin/orders/toplu` | Toplu durum / kargoya ver / e-posta — kısmi başarı raporlanır |
| `/api/catalog/slim` | `GET` — vitrin client bileşenleri için hafif katalog (herkese açık) |

- **Yetki:** her uç `handle(<izin>, …)` ile sarılır; izin yoksa **403**, oturum
  yoksa **401**. `ADMIN_WRITE_ENABLED` bayrağı ve "salt okunur" rozeti
  kaldırılmıştır.
- **Doğrulama:** hem istemci formu hem sunucu tarafı Zod ile
  (`src/lib/admin/schema.ts`). Slug tekilliği, varyant matrisi ve tek varsayılan
  varyant kuralları saf fonksiyonlarda (`src/lib/admin/mutations.ts`) kalır;
  veritabanına yalnızca etkilenen kayıt yazılır (`src/server/catalog/persist.ts`).
- **Varyant kimlikleri korunur:** yazma sırasında "hepsini sil, yeniden yaz"
  yapılmaz — `StockMovement` ve `OrderItem` varyant kimliğine bağlıdır.
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
| `src/app/api/admin` | Admin CRUD Route Handler'ları (izin kontrollü) |
| `src/app/api/catalog` | Vitrin client bileşenleri için hafif katalog ucu |
| `src/proxy.ts` | `/admin` ve `/api/admin` rota bazlı kaba erişim filtresi |
| `src/components` | Vitrin bileşenleri + `layout/LayoutFrame.tsx` (vitrin/panel ayrımı) |
| `src/components/admin` | Panel bileşenleri (shell, veri sağlayıcı, form, varyant tablosu, taksonomi vb.) |
| `src/data` | `catalog.seed.json`, adaptör, `products.ts`, `categories.ts`, `content.ts`, `legacy/` |
| `src/store` | Sepet, favoriler, arayüz, toast |
| `src/lib` | Arama, filtreleme, sepet hesapları, para (`money.ts`), yardımcılar |
| `src/lib/admin` | Şema, saf mutasyonlar, varyant matrisi, CSV, HTTP yardımcıları |
| `src/server` | **Sunucu-only iş mantığı** (`server-only`): `db.ts`, `config.ts`, `audit.ts` |
| `src/server/auth` | Parola, oturum, roller/izinler, oran sınırı, geçerli kullanıcı |
| `src/server/catalog` | DB↔model eşleme, önbellekli sorgular, yazma katmanı, içe aktarım |
| `src/server/orders` | Durum makinesi, toplamlar, teklif, oluşturma, geçişler, numaralandırma, müşteri görünümü |
| `src/server/pricing` | KDV, kupon kuralları, kargo tarife motoru (saf, testli) |
| `src/server/inventory` | Stok rezervasyonu / kesinleştirme / geri verme, hareket günlüğü |
| `src/server/customers` | Müşteri oturumu, adres defteri, adres şeması |
| `src/server/payments` | Mock sağlayıcı (F3'te gerçek adaptörler) |
| `src/server/notifications` | E-posta şablonları ve kuyruk (demo modda `EmailLog`) |
| `src/server/legal` | Sürümlü yasal metinler |
| `src/data/tr-address` | İl/ilçe listesi (gömülü); mahalle `/api/adres/mahalleler` |
| `src/generated/prisma` | Üretilen Prisma istemcisi (git'e girmez) |
| `prisma/` | `schema.prisma`, migration'lar, `seed.ts` |
| `data/nefis.db` | SQLite veritabanı (git'e girmez) |
| `src/types` | `index.ts` (vitrin), `admin.ts` (panel) |
| `public` | Statik dosyalar ve görseller |
| `scripts` | Görsel işleme, veri geçişi, kullanıcı oluşturma ve QA betikleri |

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

### Vitrin regresyon karşılaştırması

Veri katmanına dokunan her değişiklikten **önce ve sonra** çalıştırılır; vitrinin
görünür çıktısının değişmediğini kanıtlar. Ham HTML yerine görünür metin,
bağlantılar ve görsel yolları karşılaştırılır (chunk/CSS karmaları yok sayılır).

```sh
npm run build
npm run qa:snapshot -- ./onceki 3999    # değişiklikten ÖNCE
# … değişikliği uygula, yeniden derle …
npm run qa:snapshot -- ./sonraki 3999
npm run qa:compare -- ./onceki ./sonraki
```

Fark çıkması = vitrin regresyonu. F0 geçişi bu yöntemle doğrulandı: 26 rota,
0 fark.

### Birim ve uçtan uca testler

```sh
npm test                    # vitest: durum makinesi, KDV, kupon, kargo tarifesi, toplamlar, TCKN/VKN/telefon, taksit, PayTR imzası
npm run build && npm run qa:checkout   # gerçek HTTP + veritabanı: teklif → sipariş → mock ödeme → webhook idempotency → kapıda → iptal → hesap (42 kontrol)
```

`qa:checkout` test verisini sonunda temizler ve stoku geri koyar.

### Panel sipariş, ödeme, kargo, iade, kupon, stok ve müşteri duman testi (F2–F5)

```sh
npm run build
SMOKE_OWNER_EMAIL=… SMOKE_OWNER_PASSWORD=… npm run qa:orders -- 3993
```

Vitrinden havale siparişi açar; panel API'siyle kalem düzenler, ödeme alır, iki
kısmi sevkiyat yapar (ikincisinde sipariş `kargolandı`), tüm sevkiyatları teslim
edip otomatik `tamamlandı`yı doğrular, kısmi iade yapar (stok geri, tutar kuruş
tutarlı), geçersiz geçiş 409 / görüntüleyici 403, denetim kaydı, manuel sipariş,
toplu işlem ve yazdırma sayfalarını sınar. F3 bölümü ödeme listesi, mutabakat,
iade kuyruğu ve ödeme ayarlarını (görüntüleyiciye 403, gizli alanın veritabanında
`v1.` şifreli ve yanıtta maskeli olması, maskeli değerle tekrar kayıtta
değişmemesi, denetim kaydında gizli değerin bulunmaması) doğrular. F4 bölümü
kargo listesi/hızlı güncelleme, takip yenileme (bağlı sağlayıcı yokken dürüst
"updated:false"), `/api/cron/kargo-takip` yetkilendirmesi (anahtarsız/yanlış
401, doğru anahtarla oturumsuz 200), kargo etiketi sayfası, bölge/tarife CRUD'un
checkout teklifine gerçekten yansıması (yeni bölge → ücret görünür → ücretsize
çevrilince 0 → silinince varsayılana döner) ve taşıyıcı anahtarı şifreleme/
maskelemesini sınar. F5 bölümü uçtan uca iade akışını (müşteri hesabı → sipariş
→ teslim → talep → onay/ürün alındı/tamamla ile gerçek iade, ayrıca red akışı
ve red sonrası yeni talep açılabildiği), kupon CRUD'un checkout indirimine
gerçekten yansımasını (aktif → pasif → silme kısıtı), stok manuel düzeltmesini
(negatif stok reddi dahil) ve müşteri listesi/notu/KVKK anonimleştirmesini
(giriş engeli, geçmiş sipariş adresinin korunduğu) doğrular (111 kontrol).
Test verisini ve ayar değişikliklerini geri alır.

### Kimlik doğrulama duman testi

Oturum, roller ve yetki reddini gerçek HTTP istekleriyle sınar (18 kontrol):

```sh
npm run build
SMOKE_OWNER_EMAIL=... SMOKE_OWNER_PASSWORD=... SMOKE_VIEWER_EMAIL=... SMOKE_VIEWER_PASSWORD=...   npm run qa:auth -- 3996
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
Ürün görselleri temsilidir; fiyat/varyasyon/stok verileri gerçek veritabanı
kayıtlarıdır (demo içerikle tohumlanmıştır — bkz. "Demo verisine sıfırla").
Müşteri puanı/yorumu şu an yok.

## Kapsam dışı (bilinçli, bu sürümde yok)

- **Gerçek taşıyıcı kargo API'si** — Yurtiçi/Aras/MNG/Sürat/PTT adaptörleri
  iskelet halinde (bkz. "Kargo altyapısı"); bayi/entegrasyon belgesi gerekir.
- **e-Fatura / e-Arşiv** — panel yalnızca bilgi fişi/irsaliye üretir, resmî
  fatura değildir; gerçek entegrasyon F7'de e-fatura sağlayıcısıyla eklenir.
- **Gerçek e-posta gönderimi** — `DEMO_MODE=true` iken tüm e-postalar
  `EmailLog`'a yazılır, gerçekten gönderilmez (bkz. F7).
- **iyzico/PayTR/Stripe canlı doğrulaması** — kod yazıldı ama gerçek sandbox
  hesabıyla test edilmedi (bkz. "Ödeme altyapısı").
- **KVKK anonimleştirme kapsamı** — yalnız müşteri profilini/adres defterini
  siler; geçmiş sipariş belgelerindeki adres anlık görüntüsü yasal saklama
  süresi nedeniyle korunur (bkz. "Müşteriler").
- **İade fotoğrafı yükleme** — `ReturnRequest.photos` alanı hazır ama yükleme
  arayüzü yok.
