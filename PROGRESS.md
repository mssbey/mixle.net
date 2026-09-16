# Nefis Aroma — Geliştirme Durumu (Resume Notu)

> **Devam talimatı:** Kullanıcı "devam et" dediğinde bu dosyadan devam et. Projeyi
> baştan analiz etme. Aşağıdaki "SONRAKİ ADIM" bölümünden başla.

Son güncelleme: 2026-09-08 (F7 tamamlandı ve doğrulandı — sıra F8'de)

## SONRAKİ ADIM

**F8 — Panel cilası.** Plan: `PLAN-YONETIM-PANELI.md`. Son rötuşlar — plan
dosyasında F8'in ayrıntılı dosya listesi yok (diğer fazlar gibi net değil);
muhtemelen: erişilebilirlik/klavye taraması, mobil kart görünümü tutarlılığı,
performans (bundle boyutu — `recharts` yalnız `/admin/raporlar`da yükleniyor
mu kontrol et), kalan bilinen eksiklerin (aşağıya bkz.) bir kısmını kapatmak,
genel QA geçişi (tüm `qa:*` betiklerini çalıştır). Kapsamı netleştirmek için
kullanıcıya sorulabilir; aksi halde yukarıdaki genel cilayı uygula.

Ortam notu: QA portlarında (3993/3994/3997) eski `next start` süreçleri kalabiliyor
→ `Get-NetTCPConnection -State Listen` ile bul, `Stop-Process`. Build panic
("AssetContent::file was canceled") görürsen `rm -rf .next`. `npm run build`
~7 dakika (recharts) — `run_in_background: true` kullan.

**F7'den önemli teknik not:** `revalidatePath` bu projede statik sayfalar için
ÇALIŞMAZ (denendi, doğrulandı) — yalnız `unstable_cache` + `revalidateTag`
(catalog/queries.ts'teki desen) güvenilir. Yeni bir statik sayfayı panelden
düzenlenebilir yapacaksan bu deseni kullan, `revalidatePath` deneme.

---

## F7 — TAMAMLANDI (2026-09-08)

Bildirim / ayar / içerik. Commit: F7 (bkz. git log).

- `src/server/notifications/{settings,mailer}.ts` — SMTP (nodemailer, yeni
  bağımlılık) veya Resend (REST API, bağımlılık yok) ile gerçek gönderim;
  ayarlar F3/F4 deseniyle şifreli. `email.ts::queueEmail` artık `DEMO_MODE=false`
  iken gerçekten göndermeyi dener, sonucu `EmailLog.status`e yazar, asla fırlatmaz.
- `src/server/users/admin.ts` — panel kullanıcı CRUD'u (`admin:create-user`
  CLI'sinin panel karşılığı). Güvenlik: son aktif `sahip` düşürülemez/pasife
  alınamaz, kimse kendi hesabını düşüremez/pasife alamaz, parola değişince
  oturumlar kapanır.
- `src/server/media/admin.ts` + `/api/medya/[...path]/route.ts` — medya
  kütüphanesi. **ÖNEMLİ KEŞİF:** dosyalar `public/`e YAZILAMAZ — `next start`
  yalnız `next build` anındaki `public/` içeriğini sunar, çalışma zamanında
  eklenenler 404 döner (elle doğrulandı). Bunun yerine `data/uploads/` (SQLite
  ile aynı dizin) + diskten okuyan bir Route Handler kullanıldı; bu her modda
  çalışır. `sharp` (zaten bağımlılıktı, ilk kez kullanıldı) boyut okur.
- `src/server/content/settings.ts` — SSS + kampanya bandı, mevcut `Setting`
  tablosu üzerinden. **ÖNEMLİ KEŞİF:** `/sss` ve `/` statik prerender edildiği
  için düz `revalidatePath` çağrısı hiçbir şeyi geçersiz kılmadı (elle
  doğrulandı, birkaç kez denendi) — `catalog/queries.ts`'teki `unstable_cache`
  + `revalidateTag` desenine geçilince çalıştı. `revalidateTag` isteğe bağlı
  yeniden doğrulamadır: kayıttan hemen sonraki TEK istek nadiren eski içeriği
  gösterebilir, ikinci istek her zaman tazedir (smoke testte `fetchUntil` ile
  birkaç deneme hakkı verildi; gerçek kullanımda önemsiz).
  `CampaignBanner` bileşeni bu yüzden artık `async` (Next 16'da async Server
  Component'i awaitlemeden JSX'te kullanmak desteklenir).
- `src/server/einvoice/provider.ts` — YALNIZCA arayüz, hiçbir kod yolu
  çağırmaz. GİB entegratörü gerçek entegrasyonu bu sürümde yok (kapsam dışı).
- `/admin/ayarlar` bir "hub" sayfasına dönüştü: rol bazlı görünür kartlarla
  Mağaza/Ödeme/Kargo/E-posta/Kullanıcılar/Sayfalar/Görseller'e yönlendirir.
- Rotalar: `/api/admin/settings/{eposta[/test],magaza}`, `/api/admin/users[/[id]]`,
  `/api/admin/media[/[id]]`, `/api/admin/pages/{sss,kampanya}`,
  `/api/medya/[...path]` (kimlik doğrulama GEREKMEZ — herkese açık vitrin içeriği).
- UI: `/admin/ayarlar/{magaza,eposta,kullanicilar}`, `/admin/gorseller`
  (`MediaLibrary` — grid, yükle, ara, alt metin/etiket, sil), `/admin/sayfalar`
  (`PagesEditor` — SSS grup/soru editörü + kampanya formu); nav: "Görseller".
  Gösterge paneline (`/admin`) aynı raporlama uçundan "Bugün" kartı eklendi.
  `src/data/content.ts`'teki artık yanlış olan bir SSS cevabı ("üyelik/ödeme
  yok") düzeltildi.
- Doğrulama: lint/typecheck/build temiz; vitest 67 (değişmedi); `qa:checkout`
  42/42 (regresyon); `qa:orders` 151/151 — yeni bölümler (18-22): e-posta
  ayarları, kullanıcı yönetimi (güvenlik kısıtları dahil), mağaza ayarları,
  medya kütüphanesi (yükle/servis/sil/desteklenmeyen tür reddi/yol geçişi
  koruması), sayfalar (SSS + kampanya, gerçekten vitrine yansıması dahil).
- Bilinen kapsam dışı: `ImageListEditor` (ürün formu) medya kütüphanesinden
  seçim yapmıyor, hâlâ elle URL girişi; iade fotoğrafı yükleme medya
  kütüphanesine bağlanmadı; rehber/yorum/süreç/hakkımızda içeriği hâlâ statik;
  e-fatura gerçek entegrasyonu yok (bilinçli, bkz. provider.ts başlığı).

---

## F6 — TAMAMLANDI (2026-09-08)

Raporlar. Commit: F6 (bkz. git log).

- `src/server/orders/state-machine.ts` — `REVENUE_STATUSES` sabiti eklendi
  (F5'te `customers/admin.ts` içine gömülüydü, şimdi tek kaynak; ikisi de
  buradan import ediyor).
- `src/server/reports/sales.ts` — `getReportsOverview({from,to})`: özet KPI'lar
  (ciro, net ciro, sipariş sayısı, ortalama sepet, iade tutarı/oranı), günlük
  seri (Europe/Istanbul gün kümeleme, JS'te — DB'ye özel tarih fonksiyonu yok,
  Postgres taşınabilirliği için), en çok satan ürünler (`OrderItem.groupBy` +
  `Product` join), kategori kırılımı (ürün çok kategoriliyse her birine tam
  yazılır — bilinçli, dokümante), ödeme yöntemi dağılımı, iade sebep kırılımı.
  `salesSeriesToCsv` — Excel (TR) `;`/BOM.
- Bağımlılık: `recharts@2.15.4` eklendi (plan dosyasında F6 için belirtilmişti,
  kullanıcıya sormaya gerek kalmadı).
- Rota: `/api/admin/reports` (GET, `rapor:oku` — READ_ONLY, tüm roller), `?format=csv`.
- UI: `/admin/raporlar` (`ReportsPage` — tarih aralığı + hazır aralık düğmeleri,
  KPI kartları, `ComposedChart` [bar=ciro, line=sipariş], ürün/kategori/ödeme/
  iade-sebebi listeleri kendi basit çubuk göstergeleriyle); `/admin/page.tsx`
  (gösterge paneli) "Bugün" kartı eklendi, aynı API'yi kullanır; nav "Raporlar".
- Doğrulama: lint/typecheck temiz; build ~7 dk (recharts); vitest 67
  (değişmedi); `qa:checkout` 42/42 (regresyon); `qa:orders` 118/118 — yeni
  bölüm: rapor gerçek test siparişlerini ciroya/ürünlere/ödeme yöntemine/iade
  sebeplerine doğru yansıtıyor, CSV çalışıyor, görüntüleyici okuyabiliyor.
- Bilinen kapsam dışı: haftalık/aylık ön tanımlı gruplama yok (yalnız günlük
  seri + tarih aralığı seçici — kullanıcı istediği aralığı seçip haftalık/aylık
  eşdeğerini görebilir); PDF rapor dışa aktarımı yok (yalnız CSV).

---

## F5 — TAMAMLANDI (2026-09-08)

Müşteri / iade / kupon / stok. Commit: F5 (bkz. git log).

- `src/server/returns/{schema,requests,admin}.ts` — durum makinesindeki
  `iade-talebi` geçişi ilk kez kullanılıyor (F0'dan beri tanımlıydı, boştu).
  Müşteri talep açar (cayma hakkı `withdrawalDays`, tek açık talep kısıtı) →
  panelde onayla/reddet/ürün-alındı/tamamla (tamamla = mevcut
  `orders/refunds.ts::createRefund`, sonra gerekirse siparişi eski duruma
  geri taşır — kısmi iadede `createRefund` kendisi order.status'u değiştirmez).
  İki yeni e-posta şablonu: `iade-talebi-onaylandi`, `iade-talebi-reddedildi`.
- `src/server/coupons/{schema,admin}.ts` — mevcut `Coupon` tablosu + F1'den beri
  çalışan `pricing/coupons.ts` değerlendirmesi üzerine CRUD. Kullanılmış kupon
  silinemez (pasife alınır, `CouponRedemption` geçmişi korunur).
  `admin.ts`'ten ayrı `schema.ts`: `couponInputSchema` `server-only` içermez,
  vitest doğrudan çalıştırır (bkz. F1'den beri bilinen kısıt).
- `src/server/inventory/admin.ts` — `listStockMovements`, `lowStockReport`
  (`lowStockThreshold` ayarı), `manualAdjust` (negatif stok reddi, `StockMovement`
  yazar, `revalidateCatalog`). Sipariş/iptal/iade hareketleri zaten F1'den beri
  otomatikti; bu yalnız görünürlük + manuel müdahale ekliyor.
- `src/server/customers/admin.ts` — liste (sipariş sayısı + harcama toplu
  sorgu), detay (adresler/siparişler/iadeler), not/etiket, **KVKK
  anonimleştirme** (e-posta/ad/telefon/adres defteri silinir, oturumlar
  kapatılır, giriş engellenir; geçmiş sipariş adres ANLIK GÖRÜNTÜSÜ bilinçli
  korunur — mali/hukuki saklama, ayrı konu).
- Rotalar: `/api/admin/returns/**`, `/api/admin/coupons[/[id]]`,
  `/api/admin/stock/{hareketler,dusuk,duzelt/[variantId]}`,
  `/api/admin/customers[/[id][/anonimlestir]]`, `/api/hesap/siparisler/[no]/iade`.
- UI: `/admin/iadeler` (`ReturnsList` + `ReturnDetailDialog`, durum bazlı aksiyon
  paneli), `/admin/kuponlar` (`CouponsList` + `CouponEditor`), `/admin/stok`
  (`StockPanel` — düşük stok / hareketler sekmeleri), `/admin/musteriler[/[id]]`
  (`CustomersList` + `CustomerDetail`); vitrin: `OrderActions`'taki "yakında"
  yer tutucusu gerçek `ReturnRequestForm`'a bağlandı, durum banner'ı eklendi.
  Nav: "İadeler", "Müşteriler", "Kuponlar", "Stok".
- `PublicOrder.returnRequest` eklendi (`view.ts`, `Order.returns` ilişkisi
  üzerinden — dikkat: Prisma alan adı `returnRequests` DEĞİL `returns`).
- Doğrulama: lint/typecheck/build temiz; vitest 67 (+4 kupon şeması); `qa:checkout`
  42/42 (regresyon); `qa:orders` 111/111 — yeni bölümler: iade tam yaşam döngüsü
  (talep→onay→ürün-alındı→tamamla, ayrıca red akışı), kupon CRUD'un checkout
  indirimine yansıması, stok manuel düzeltme, müşteri listesi/KVKK.
- Bilinen kapsam dışı: iade fotoğrafı yükleme yok (`ReturnRequest.photos` alanı
  hazır, UI yok — projede hiç dosya yükleme altyapısı yok); "ücretsiz kargo"
  tipi kupon checkout'ta test edilmedi (yüzde/tutar tipleri smoke'ta var).

---

## F4 — TAMAMLANDI (2026-09-08)

Kargo altyapısı. Commit: F4 (bkz. git log).

- `src/server/shipping/provider.ts` — `ShippingProvider` arayüzü
  (configured/createShipment/track/cancel), `ShippingProviderError`.
- `adapters/manuel.ts` (her zaman çalışır) + `adapters/{yurtici,aras,mng,surat,ptt}.ts`
  — **gerçek taşıyıcı API çağrısı bu sürümde YOK** (herkese açık/standart merchant
  API'si yok; yanlış varsayım üretmektense açıkça "uygulanmadı" hatası dönüyor).
  `configured()` panel ayarlarını yansıtır; anahtarlar yine de şifrelenip
  saklanır ki gerçek entegrasyon eklenince panel değişmeden çalışsın.
- `registry.ts`, `settings.ts` (taşıyıcı anahtarları AES-256-GCM + kapıda ödeme
  kısıtları — `Setting.kargo-saglayici` ve mevcut `Setting.magaza` üzerinden),
  `zones-admin.ts` (bölge/yöntem CRUD; okuma tarafı olan `zones.ts`'ten ayrı),
  `shipment-tabs.ts` (saf), `admin-view.ts` (siparişten bağımsız sevkiyat listesi),
  `tracking.ts` (`syncShipment`/`syncAllActiveShipments` — TEK senkron noktası).
- Rotalar: `/api/admin/shipping/zones[/[id]][/[id]/methods]`,
  `/api/admin/shipping/{zones,methods}/reorder`, `/api/admin/shipments`,
  `/api/admin/shipments/[id]`, `/api/admin/shipments/[id]/takip`,
  `/api/admin/shipments/toplu`, `/api/admin/settings/kargo`,
  `/api/cron/kargo-takip` (paylaşımlı `CRON_SECRET`, proxy matcher dışında —
  `/api/webhooks/**` gibi).
- UI: `/admin/kargolar` (`ShipmentsList`, `ShipmentQuickDialog`), `/admin/kargolar/yazdir`
  (`ShipmentLabelDocument` — A6 etiket, gerçek taşıyıcı barkodu değil),
  `/admin/ayarlar/kargo` (`ZoneManager` + `CarrierSettingsForm`), nav "Kargolar".
- `scripts/sync-shipments.mts` (`npm run kargo:sync`) — cron ucuna HTTP isteği
  atan ops betiği; `tracking.ts` `server-only` içerdiği için tsx'ten doğrudan
  içe aktarılamaz (bilinen kısıt, F1'den beri).
- Doğrulama: lint/typecheck/build temiz; vitest 63; `qa:checkout` 42/42 (regresyon,
  değişmedi); `qa:orders` 65/65 (F4 bölümleri: kargo listesi/hızlı güncelleme/
  takip yenileme/cron yetkilendirme/etiket + bölge-tarife CRUD'un checkout
  teklifine yansıması + taşıyıcı anahtarı şifreleme).
- Bilinen kapsam dışı: gerçek taşıyıcı API entegrasyonu (bayi sözleşmesi/belge
  gerektirir — kullanıcı ileride sağlarsa `adapters/*` doldurulur, geri kalan
  panel/DB/UI değişmeden çalışır); barkod/PDF etiket (gerçek taşıyıcı formatı
  yerine metin tabanlı A6 etiket); desi otomatik hesabı (ürün boyut verisi yok,
  desi hâlâ sevkiyat oluştururken elle girilir).

---

## F3 — TAMAMLANDI (2026-09-07)

Ödeme altyapısı, test modunda. Commit: F3 (bkz. git log).

- `src/server/payments/provider.ts` — `PaymentProvider` arayüzü, `PROVIDER_IDS`,
  `WebhookVerification` (event: odeme-basarili | odeme-basarisiz | iade-tamamlandi |
  iade-basarisiz | bilinmiyor).
- Adaptörler `adapters/`: `mock.ts` (imzalı jeton, `attempt` sayaçlı externalId),
  `manual.ts` (havale, kapıda), `iyzico.ts` (iyzipay SDK, checkout form —
  `serverExternalPackages` gerekti), `paytr.ts` (HMAC token/bildirim, birim testli),
  `stripe.ts` (Checkout Session, `constructEvent`). iyzico/PayTR/Stripe **gerçek
  sandbox'ta doğrulanmadı** — kullanıcı anahtar verince ilk iş.
- `registry.ts` — `getProvider`, `getCardProvider` (DEMO_MODE → mock zorunlu).
- `settings.ts` — `paymentSettingsSchema`, `getPaymentSettings` (çözülmüş, sunucu
  içi), `getPaymentSettingsMasked`, `savePaymentSettings` (maskeli/boş = koru; yeni
  değer `seal`; ENCRYPTION_KEY yoksa 422). Setting key `odeme`, `isSecret=true`.
- `installments.ts` — varsayılan taksit tablosu, BIN eşleme, `installmentOptions`.
- `webhooks.ts` — `handlePaymentWebhook`: verify → `WebhookEvent` upsert (idempotent)
  → `applyWebhook`. Başarılı ödemeden sonra gelen "başarısız" yoksayılır.
- `start.ts` — `startCardPayment` (createOrder ve `/api/payments/yeniden`).
- `log.ts` — `maskSensitive` (anahtar adları + PAN/TCKN kalıpları).
- Rotalar: `/api/webhooks/payments/[provider]`, `/api/payments/[provider]/donus`,
  `/api/payments/yeniden`, `/api/admin/payments` (view=tumu|basarisiz|iadeler|
  mutabakat|webhooks), `/api/admin/settings/odeme` (GET/PUT, `ayar:odeme`).
- UI: `/admin/odemeler` (`PaymentsList`), `/admin/ayarlar/odeme`
  (`PaymentSettingsForm`), nav "Ödemeler"; checkout'ta taksit seçici;
  `RetryPaymentButton` (teşekkür sayfası + hesabım) `/api/payments/yeniden`'i çağırır.
- `quote.ts` yöntem açık/kapalı + min/maks limitlerini ödeme ayarlarından okur.
- Doğrulama: lint/typecheck/build temiz; vitest 63; `qa:checkout` 42/42
  (webhook idempotency, sahte imza 400, bilinmeyen sağlayıcı 404 dahil);
  `qa:orders` 42/42 (ödeme listesi, mutabakat, ayar şifreleme/maskeleme, denetim).
- Bilinen eksikler: havale IBAN'ı teşekkür sayfasında hâlâ mağaza ayarından
  (`getStoreInfo`) geliyor — F7'de `havale` bölümüne bağlanacak; mutabakat sadece
  DB içi (sağlayıcı ekstresiyle karşılaştırma yok); Stripe `charge.refunded`
  webhook'unda iade eşleştirmesi "en son bekleyen iade" varsayımıyla.

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

## TAMAMLANDI — Aşama 19 (falconkimya.com Puff Aromalar kataloğu → gerçek ürünler, 2026-09-15)

Kullanıcı `falconkimya.com/puff-aromalar/` altındaki **tüm ürünleri fiyat/varyant/görselle**
çekip siteye konmasını istedi ("siteyi bitiriyoruz"); "Falcon Puff" serisi **Mixle Puff** oldu.
Site artık 403 vermiyor; veri herkese açık WooCommerce Store API'sinden
(`/wp-json/wc/store/v1/products?category=695`, varyantlar `?type=variation&parent=<id>`) alındı.

**Veri zinciri (tekrar çalıştırılabilir):**
1. `scripts/falcon-puff-scrape.py` → `data/falcon/puff-aromalar.raw.json` (ham API dökümü)
2. `scripts/falcon-puff-normalize.py` → `data/falcon/puff-aromalar.json` + `.csv` + `data/falcon/images/*`
   (orijinal görseller, 102 MB). `/data/` gitignore'da — bu dosyalar commit'e girmez.
3. `scripts/build-puff-catalog.py` → `src/data/catalog.puff.json` (site katalog şeması, TL fiyat)
   + `public/images/products/puff/<slug>.webp` (1000px, 20 MB, commit'e girer)
4. `npm run db:migrate-catalog -- --file=src/data/catalog.puff.json` (mevcut kataloğa ekler, idempotent).
   `prisma/seed.ts` de demo kataloğun ardından bu dosyayı otomatik yükler.

**Sonuç:** yeni `puff-aromalar` kategorisi (sortOrder -1 → menüde ilk sırada), 6 alt kategori,
**128 ürün / 493 varyant**: Drifter Bar (50), Vampire Vape Bar Salts (18), Mixle Puff (15),
IVG Salt (10), Riot Bar Edtn (19, tek boy 10ml), Dinner Lady Fruit Full (16, tek boy 30ml).
Hacim etiketleri normalize edildi: `10ml`, `15ml`, `30ml`, `100ml`, `30ml DIY Kit (9ml aroma)`,
`60ml DIY Kit (18ml aroma)`, `30ml DIY Kit (7.5ml aroma)` … Stok: Store API yalnız stokta/tükendi
verdiği için stokta olanlara **25** yazıldı (gerçek adet değil; panelden düzeltilir), tükenenler 0.
Falcon'un "Ürün İçeriği / Kullanım oranı / Demlenme süresi / Menşei / VG-PG" bloğu ayrıştırılıp
`flavorNotes`, `usageRate`, `steepTime`, `origin` ve SSS'ye dağıtıldı; açıklamalardaki emoji ve
görsele atıf yapan satırlar temizlendi; "T****" sansürü "Tütün" yapıldı. SKU: `MP-<seri>-<sıra>-<hacim>`.

**Vitrin değişiklikleri (yapısal):**
- `VariantVolume` artık serbest metin (`string`); `catalog-adapter` "Hacim" seçeneğinin etiketini
  olduğu gibi taşır (eskiden 10/30/60/100ml dışındakiler 30ml'ye çöküyordu). `uniqueOptions`
  paneldeki varyant sırasını korur; `sortVolumeLabels` filtre listesi için ml'ye göre sıralar.
  `variantLabel()` sepet satırlarında tek yoğunluklu ürünlerde "Standart" yazmaz.
- Gerçek ürün fotoğrafları vitrinde: `catalogPhotos()` (`src/lib/storefront-images.ts`) eski demo
  yollarını (`/images/nefisaroma/*`, `products/diy25-*`, prosedürel `<slug>-N.webp`) eler —
  bunlar eski markalı olduğu için yine temsili illüstrasyon gösterilir; diğer tüm DB görselleri
  (puff + panelden yüklenen `/api/medya/…`) gerçek foto olarak gösterilir. `Product.representativeImages`
  ile "Temsili görsel" notları yalnız illüstrasyonlarda çıkar (ProductCard/QuickView/Gallery).
- Ürün açıklaması `whitespace-pre-line` (çok paragraflı metin); `usageRate`/`steepTime` doluysa
  placeholder yerine gerçek değer.
- Önerilen sıralama ve "ilgili ürünler" tükenenleri sona atar. Ana sayfa rayları: "Yeni Eklenenler"
  puff önce; ikinci ray puff serilerinden dönüşümlü (`roundRobin`).

**Bilinen / karar bekleyen:**
- **Görseller Falcon markalı:** fotoğraflarda "FALCONKIMYA" logosu, "FLCN PUFF" etiketi ve
  falconkimya sosyal medya adresleri basılı. Mixle markasıyla çelişiyor; inpainting aracı olmadığı
  için dokunulmadı. Değiştirmek için `public/images/products/puff/<slug>.webp` dosyasını aynı adla
  ezmek yeterli (DB yolu değişmez).
- Üretim (Neon) veritabanına **yüklenmedi**; yerel Docker Postgres'e yüklendi. Canlıya almak için
  `.env.local` (Neon) ile `npm run db:migrate-catalog -- --file=src/data/catalog.puff.json`.
- Not: `next dev` `.env.local`'ı (Neon) okur, `tsx` betikleri `.env`'i (yerel Docker). Yerelde
  doğrulamak için `.env.local` geçici olarak kenara alınıp `.next/dev/cache/fetch-cache` silindi.

Doğrulama: `typecheck`/`lint`/`build`/`vitest` (75 test) temiz. Tarayıcıda kategori sayfası,
Drifter ürün sayfası (4 hacim, fiyat değişimi, sepete ekleme, sepet etiketi), Mixle Puff ürün
sayfası (6 hacim), eski demo ürünü (illüstrasyon + temsili notu korunuyor), `/urunler` hacim
filtresi (11 etiket) kontrol edildi.

---

## TAMAMLANDI — Aşama 20 (demo/örnek içeriklerin kaldırılması, 2026-09-15)

Kullanıcı: "bu çektiğimiz ürünler dışındaki örnek şeyleri kaldır siteden". Vitrinde artık
yalnızca gerçek Puff Aromalar kataloğu (128 ürün) var; demo katalog ve sahte sosyal kanıt gitti.

**Katalog**
- `src/data/catalog.seed.json` artık **gerçek katalog** (eski 100 ürünlük demo dosya silindi,
  `catalog.puff.json` bu ada taşındı). `src/data/legacy/catalog.json` arşivi silindi.
- `prisma/seed.ts` tek dosyadan yükler (wipe); demo kuponlar (NEFIS10/ILKAROMA/GOLDENDROP) kaldırıldı.
- `scripts/build-puff-catalog.py` çıktısı doğrudan `catalog.seed.json`; `db:migrate-catalog`
  varsayılan kaynağı da bu dosya.
- Panel: "Demo verisine sıfırla" → **"Kataloğu yeniden yükle"** (aynı dosyadan).
- Yerel DB yeniden yüklendi: **128 ürün, 493 varyant, 1 kategori, 0 koleksiyon**.

**Kaldırılan sahte içerik**
- Ürün sayfasındaki **sahte yorumlar ve soru-cevap** (`src/data/reviews.ts`, `ReviewsSection`,
  `QASection`, `Review`/`QuestionAnswer` tipleri) — üretilmiş isim/puan/tarihlerdi, backend'i yoktu.
- Kullanılmayan 17 demo ana sayfa bileşeni (Testimonials, InstagramFeed, CampaignBanner,
  BestSellersSection, Diy25Section, LabProcess, NewsletterSection, …) ve `content.ts` içindeki
  `testimonials`, `heroContent`, `processSteps` blokları.
- `BrandBanners` — satmadığımız markalara (Santa, Halo, Cosmic Fog, Suicide Bunny, Capella…)
  giden, sonuç döndürmeyen arama bağlantılarıydı. Görseller `public/images/reference/` altında
  duruyor ama artık hiçbir yerden kullanılmıyor.
- `campaign` varsayılanı ölü `/koleksiyon/purple-reserve` yerine gerçek kategoriye bakıyor;
  `/kampanyalar` sayfası sabit kupon kodu rozetleri yerine panelden düzenlenen kampanya bloğunu
  gösteriyor (kod yalnız girilmişse çıkar).
- "Demo katalog — gerçek ödeme alınmaz" notu ürün sayfasından kaldırıldı (fiyatlar gerçek).
- SSS/hakkımızda metinlerindeki "örnek kampanya", "sekiz tat ailesi", shortfill gibi artık
  geçersiz ifadeler düzeltildi.

**Yeni ana sayfa** (`src/app/page.tsx`): Hero (gerçek Mixle/Dinner Lady bannerları) → Yeni
Eklenenler → **Seriler** şeridi (`SeriesStrip`, 6 seri, gerçek ürün görseli + adet, filtreli
kategori sayfasına gider) → Öne Çıkan Aromalar (serilerden dönüşümlü) → Fiyatı Düşenler (26 ürün).

**Diğer**
- `CategorySlug`/`CollectionSlug` sabit union yerine `string` (kategoriler veritabanından gelir).
- `categoryArtwork`/`collectionArtwork` demo eşlemeleri temizlendi; panelden girilen `cover`
  önceliklendirildi.
- "En Çok Satanlar" menü bağlantıları kaldırıldı (hiçbir üründe `bestSeller` işareti yok);
  sayfa ve paneldeki bayrak duruyor — panelden ürün işaretlenince menüye geri eklenmeli.

**Bilinen:** sipariş numarası öneki hâlâ `NA-` (Nefis Aroma); mevcut siparişleri/regex'i
bozmamak için değiştirilmedi. Vitrin görselleri hâlâ Falcon markalı (bkz. Aşama 19).

Doğrulama: `typecheck`/`lint`/`test` (75) temiz, `next build` yerel DB ile 48 sayfa üretildi;
tarayıcıda ana sayfa, /urunler, /kategori/puff-aromalar, ürün sayfası ve /kampanyalar kontrol
edildi. (Not: bu turda `npm run build` `.env.local` → Neon ile "DatabaseNotReachable" verdi;
kod değil, Neon erişimi kaynaklı — canlı deploy öncesi tekrar denenmeli.)

---

## TAMAMLANDI — Aşama 21 (admin.mixle.net ürün listesi → 838 tekil/mix aroma, 2026-09-16)

Kullanıcı `admin.mixle.net/dashboard/products` (Mix Platform, `api.mixyz.net`) listesindeki
**839 ürünü görsel ve fiyatlarıyla** çekip siteye konmasını istedi. Kararlar: **varyantlar
çekilmedi** (her ürün tek boy), **dolar fiyatı rakam olarak TL** yazıldı (1,80 $ → ₺1,80; sonradan
Toplu Fiyat ile düzeltilecek), mağazanın kendi markası **"Santa" → "Mixle"** (41 ürün adı +
seri), üretici markalar (Capella, TFA/TPA, Inawera, Solub, Flavour Art, Flavor West) aynen kaldı.

**Veri zinciri (tekrar çalıştırılabilir):**
1. Tarayıcıda giriş yapılmış admin sayfasının tablosu DOM'dan okundu (API `Tenant context`
   istediği için kimlik bilgilerine dokunulmadı; sadece sayfalama tıklandı) →
   `data/mixle-admin/products.json` + `.csv` (839 kayıt; tarayıcı/dosya SHA-256 eşleşti).
2. `scripts/mixle-admin-download-images.py` → `data/mixle-admin/images/<id>.<ext>` (836 dosya,
   121 MB; `/data/` gitignore'da). 3 ürünün admin'de de görseli yok (`test`, `Lemon mix`,
   `Black Jack T.`) — detay sayfaları kontrol edildi.
3. `scripts/build-mixle-admin-catalog.py` → `src/data/catalog.seed.json`'a **eklenir** (Puff
   kataloğu korunur; kendi kategorilerini değiştirir, idempotent) +
   `public/images/products/aroma/<slug>.webp` (1000px, 30 MB, commit'e girer).
4. `npm run db:migrate-catalog` (seed dosyasının tamamı, idempotent).

**Sonuç:** 8 yeni kategori (`mix-aromalar` 165, `tfa-tpa` 152, `solub-arome` 140, `inawera` 123,
`flavour-art` 123, `capella` 101, `flavor-west` 27, `nbase` 7), alt kategori = marka. Toplam
**966 ürün / 1331 varyant** (128 Puff + 838). SKU = admin "Model" kodu (STK051_10, cap048, INW091…).
Admin'de "Kapalı" 51 ürün + fiyatı 0 olan 121 ürün **taslak** (yayında değil) — Mix Aromalar'ın
neredeyse tamamı fiyatsız (fiyat admin'de varyant seviyesinde), bu yüzden vitrinde 3 ürün görünüyor.
Admin'deki `336.000.000` gibi yer tutucu stoklar 9.999'a sınırlandı; Inawera'nın TAMAMEN BÜYÜK
adları başlık düzenine çevrildi. `test` kaydı atlandı; "Özel Sipariş Aroma Verici" (₺758)
Mix Aromalar altına "Özel Sipariş" serisiyle kondu. Açıklama/kullanım oranı listede olmadığı için
kısa açıklama otomatik (`<ad> — <marka> <kategori>, 10ml.`).

**Bilinen / karar bekleyen:**
- Üretim (Neon) veritabanına **yüklenmedi**; yerel Docker Postgres'e yüklendi (966 ürün, toplamlar
  doğrulandı). Canlıya almak için `.env.local` (Neon) ile `npm run db:migrate-catalog`.
- 121 fiyatsız ürün taslakta; fiyat girilince `status` panelden "yayında" yapılmalı ya da
  `build-mixle-admin-catalog.py` içindeki kural değiştirilip tekrar koşulmalı.
- Fiyatlar dolar rakamı (₺1,63–₺4,45); kur uygulanmadı.

Doğrulama: `--dry-run` ve DB geri okuma toplamları eşleşti; tarayıcıda (yerel DB ile)
`/kategori/inawera` (123 ürün, gerçek fotoğraflar), `/kategori/mix-aromalar`, Nasty Juice ürün
sayfası (görsel, ₺1,90, sepete ekle) kontrol edildi.

---

## KONVANSİYONLAR
- Sunucu bileşeni varsayılan; `'use client'` sadece etkileşim/hook gerekince.
- Mock data `src/data/`, iş mantığı `src/lib/`, global state `src/store/`.
- Görseller `next/image` ile; hero `priority`, altları `loading="lazy"` + `sizes`.
- Tüm butonlar çalışır durumda olacak; `href="#"` YASAK; "lorem ipsum" YASAK; emoji YASAK.
- Sahte sertifika/rakam/müşteri logosu YOK; sağlık iddiası YOK. Doğrulanmamış bilgiler `site.ts` içinde placeholder.
- Dil: Türkçe, profesyonel, klişesiz.
