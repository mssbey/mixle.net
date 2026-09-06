# Nefis Aroma — Yönetim Paneli Genişletme Planı

> Durum: **onaylandı (2026-09-06)**. §5 kararları verildi, aşağıda özetli.
> Uygulama F0 ile başladı.
> Kaynak: "Tam Kapsamlı Yönetim Paneli Geliştirme Promptu" (F0–F8).

## 0. Verilen kararlar

| Konu | Karar |
|---|---|
| §5.1 Vitrin veri erişimi | **B — sunucu-only + `CatalogProvider` context.** `products.ts` async sunucu fonksiyonlarına döner; client bileşenler yalın projeksiyonu context'ten alır. Çıktı eşitliği HTML diff ile kanıtlanacak. |
| §5.2 Veritabanı | **SQLite + taşınabilir şema.** `data/nefis.db`; `String[]` yerine `Json`; `DATABASE_URL` ile Postgres'e geçilebilir. **Vercel'e çıkmadan önce Postgres migrasyonu zorunlu** (R3). |
| §5.3 Faz sırası | **F0 → F1 → F2** çekirdek; her fazın sonunda dur + rapor. |
| §5.4 Bağımlılıklar | `crypto.scrypt` (parola), `jose` (oturum), `prisma@7.10.0` sabit, `cacheComponents` **kapalı** kalır. |
| §5.5 Ödeme | Kullanıcıda **sandbox anahtarları var** — F3'te istenecek. |
| §5.5 E-posta | Kullanıcıda **anahtar var** (Resend/SMTP) — F1 sonunda istenecek; o zamana dek `DEMO_MODE=true`. |
| §5.5 Adres verisi | **Ajan ekleyecek** (il/ilçe paketlenir, mahalle API route ile). |

---

## 1. Mevcut durumun tespiti (kod okuması)

| Konu | Bugün |
|---|---|
| Katalog | `src/data/catalog.json` (825 KB, 100 ürün / 8 kategori / 3 koleksiyon) |
| Okuma yolu | `catalog.json` → `catalog.ts` → `catalog-adapter.ts` → `products.ts` / `categories.ts` |
| Yazma yolu | `src/lib/admin/store.ts` — atomik dosya yazımı + Zod doğrulaması |
| Admin auth | Tek paylaşılan parola, HMAC deterministik çerez (`src/lib/admin/auth.ts`) |
| Rota koruması | `src/proxy.ts` (Next 16'da `middleware` → `proxy`) |
| Yazma bayrağı | `ADMIN_WRITE_ENABLED` + `src/lib/admin/guard.ts` |
| Para | TL **float** (`129.9`), `currency()` `src/lib/site.ts` içinde |
| Sipariş / ödeme / kargo / müşteri | **Yok.** `/siparis/tamamlandi` sahte, `/hesabim` "yakında" |
| Test altyapısı | Yok (yalnız puppeteer QA script'leri) |
| Sürümler | Next 16.3.4 (`cacheComponents` **kapalı**), React 19.2, Tailwind 3.4, Zod 3 |

### Kritik bulgu — vitrin verisi 10 client component'te

`@/data/products` / `@/data/categories` **10 adet `'use client'` bileşeninde**
doğrudan import ediliyor:

```
FavoritesView, CartView, ActiveFilterChips, FilterPanel, AromaFinder,
FlavorExplorer, MobileMenu, SearchOverlay, PurchasePanel, RecentlyViewedSection
```

Bunlar `products.ts`'i **senkron modül sabiti** olarak kullanıyor
(`export const products: Product[]`). Veritabanı okuması asenkron ve sunucu-only
olduğu için promptun şu iki kuralı aynı anda tutulamaz:

- "`products.ts` export imzaları değişmeyecek" → senkron dizi gerekir
- "Vitrin sorguları `cache` ile sarılsın, yazma sonrası `revalidateTag` ile
  geçersiz kılınsın" → async + sunucu gerekir

**Bu çatışma §5.1'de karara bağlanmalı.** Planın geri kalanı bu karara göre dallanıyor.

### Next 16 belge notu

`node_modules/next/dist/docs/.../unstable_cache.md` bu API'yi **deprecate**
etmiş: Next 16'da yerine `'use cache'` + `cacheTag()` öneriliyor, ama bunlar
`next.config.mjs`'te `cacheComponents: true` ister ve bu bayrak şu an kapalı.
Bkz. §5.4.

---

## 2. Şema taslağı (prompttaki §3'ten sapmalar dahil)

Prompttaki model listesi temel alındı. **Zorunlu sapmalar:**

| Prompttaki | Sorun | Önerilen |
|---|---|---|
| `tags String[]`, `photos String[]`, `includeProductIds String[]`, `countries/cities String[]` | Prisma **scalar list** yalnızca PostgreSQL'de var; SQLite'ta şema derlenmez | `Json` sütun; `String[]` tipini uygulama katmanında Zod ile koru |
| — | Eşzamanlılık | Her mutable tabloya `version Int @default(0)` (optimistik kilit) |
| — | Katalog DB'ye taşınıyor | `Product`, `ProductImage`, `ProductOption`, `OptionValue`, `Variant`, `Category`, `Collection` tabloları (prompt bunları saymamış ama F0 gereği) |
| — | Oturum | `Session` (admin) + `CustomerSession`, `PasswordResetToken` |
| — | Terk edilmiş sepet (F6 raporu) | `Cart` + `CartItem` (sunucu sepeti, `abandonedAt`) |
| — | Medya kütüphanesi (F7) | `MediaAsset` |
| — | Panelden içerik (F7) | `Page`, `LegalDocument` (+ `version`; eski siparişler eski sürümü gösterir) |
| — | Checkout rezervasyonu | `StockReservation` (TTL'li) |

**Para:** tüm tutarlar `Int` kuruş. Katalog fiyatları migrasyonda
`Math.round(tl * 100)`. Vitrin `Product.basePrice` **TL float kalır**
(adapter `/100` yapar) → vitrin bileşenleri değişmez.

**Zaman:** DB'de UTC `DateTime`; gösterimde `Europe/Istanbul`.

**Durum makinesi** — `src/server/orders/state-machine.ts` içinde salt-okunur tablo:

```
taslak → ödeme-bekliyor → ödendi → hazırlanıyor → kargolandı → teslim-edildi → tamamlandı
*            → iptal            (yalnız kargolanmadıysa)
teslim-edildi → iade-talebi → iade-edildi
ödeme-bekliyor → başarısız
```

İzinsiz geçiş → `409` + Türkçe mesaj. Her geçiş bir `OrderEvent` + bir `AuditLog` üretir.

---

## 3. Dosya listesi (faz bazlı)

### F0 — Temel: veri katmanı + auth

```
prisma/schema.prisma                     yeni
prisma/seed.ts                           yeni  (catalog.seed.json → DB)
prisma/migrations/**                     yeni
scripts/migrate-catalog-to-db.ts         yeni  (tek seferlik, fiyat→kuruş, --dry-run)
scripts/create-admin-user.ts             yeni  (npm run admin:create-user)
src/server/db.ts                         yeni  (PrismaClient singleton + dev HMR guard)
src/server/catalog/queries.ts            yeni  (cache'li okuma + tag)
src/server/catalog/mutations.ts          yeni  (store.ts'in DB karşılığı)
src/server/auth/session.ts               yeni  (jose ile imzalı çerez)
src/server/auth/password.ts              yeni  (§5.4)
src/server/auth/rate-limit.ts            yeni
src/server/auth/rbac.ts                  yeni  (rol → izin matrisi)
src/server/audit.ts                      yeni  (AuditLog + alan diff'i)
src/lib/money.ts                         yeni  (minor↔major, formatPrice)
src/lib/admin/auth.ts                    SİL   → src/server/auth/*
src/lib/admin/guard.ts                   SİL   (ADMIN_WRITE_ENABLED kalkıyor)
src/lib/admin/store.ts                   SİL   → src/server/catalog/mutations.ts
src/data/catalog.ts                      DEĞİŞ (JSON yerine DB)
src/data/catalog-adapter.ts              DEĞİŞ (kuruş→TL; gövde/metinler aynen korunur)
src/data/products.ts                     DEĞİŞ (§5.1 kararına göre)
src/data/categories.ts                   DEĞİŞ (§5.1 kararına göre)
src/proxy.ts                             DEĞİŞ (rol bazlı rota koruması; /api/webhooks hariç)
src/app/admin/giris/page.tsx             DEĞİŞ (e-posta + parola)
src/app/api/admin/auth/route.ts          DEĞİŞ (login / logout / refresh)
src/app/api/admin/**                     DEĞİŞ (her handler'da işlem bazlı izin)
src/components/admin/AdminShell.tsx      DEĞİŞ (kullanıcı menüsü, rol rozeti, "salt okunur" kalkar)
.env.example / README.md / .gitignore    DEĞİŞ (data/nefis.db)
```

### F1 — Vitrin checkout

```
src/app/odeme/page.tsx + CheckoutClient + steps/*.tsx   yeni (5 adım)
src/app/siparis/tamamlandi/page.tsx                     DEĞİŞ (gerçek sipariş)
src/app/siparis-takibi/page.tsx                         yeni (misafir sorgulama)
src/app/hesabim/**  (siparişler, sipariş detayı, adresler, bilgilerim, iade)  DEĞİŞ+yeni
src/app/giris | kayit | parola-sifirla                  yeni (müşteri auth)
src/server/orders/{create,totals,numbering,state-machine}.ts   yeni
src/server/inventory/{reserve,movements}.ts             yeni
src/server/pricing/{coupons,tax,shipping-rates}.ts      yeni
src/server/customers/*.ts                               yeni
src/app/api/checkout/{quote,order}/route.ts             yeni (Idempotency-Key)
src/app/api/hesap/**                                    yeni
src/data/tr-address/{iller,ilceler}.json + mahalle API  yeni (§5.5)
src/lib/validators/{tckn,vkn,phone}.ts                  yeni
src/components/checkout/**                              yeni
```

### F2 — Sipariş yönetimi

```
src/app/admin/siparisler/{page,[id]/page,yeni/page}.tsx yeni
src/components/admin/orders/**  (OrderTable, OrderDetail, LineItemsEditor, Timeline,
  CustomerCard, AddressEditor, RefundDialog, ShipmentDialog, StatusMenu, BulkActions)  yeni
src/components/admin/DataTable/**  (F8'in temeli, burada başlar)  yeni
src/server/orders/{update,refund,cancel,recalculate}.ts yeni
src/server/documents/{invoice-pdf,packing-slip}.ts      yeni
src/app/api/admin/orders/**                             yeni
```

### F3 — Ödemeler

```
src/server/payments/provider.ts                                    yeni (arayüz)
src/server/payments/adapters/{iyzico,paytr,stripe,havale,kapida,mock}.ts  yeni
src/server/payments/{webhook,mask,installments}.ts                 yeni
src/app/api/webhooks/payments/[provider]/route.ts                  yeni (auth'suz, imzalı)
src/app/admin/odemeler/page.tsx                                    yeni
src/app/admin/ayarlar/odeme/page.tsx                               yeni
src/server/crypto/secret-box.ts                                    yeni (AES-256-GCM)
```

### F4 — Kargo

```
src/server/shipping/provider.ts + adapters/{yurtici,aras,mng,surat,ptt,manuel}.ts  yeni
src/server/shipping/{rates,labels,tracking}.ts   yeni
src/app/admin/kargolar/page.tsx                  yeni
src/app/admin/ayarlar/kargo/page.tsx             yeni
scripts/sync-shipments.ts                        yeni
```

### F5 — Müşteri / iade / kupon / stok

```
src/app/admin/{musteriler,iadeler,kuponlar,stok}/**   yeni
src/server/{returns,coupons,inventory,kvkk}/**        yeni
```

### F6 — Raporlar

```
src/app/admin/page.tsx        DEĞİŞ (yeni gösterge paneli)
src/app/admin/raporlar/**     yeni
src/server/reports/*.ts       yeni
+ recharts bağımlılığı
```

### F7 — Bildirim / ayar / içerik

```
src/server/notifications/{mailer,queue,templates/*}.ts  yeni
src/app/admin/ayarlar/**      DEĞİŞ (8 sekme)
src/app/admin/gorseller/**    yeni (medya kütüphanesi)
src/app/admin/sayfalar/**     yeni
src/data/content.ts           → DB'ye taşınır
src/server/einvoice/**        yeni (iskelet)
```

### F8 — Panel cilası

```
src/components/admin/DataTable/**                                genişletir
src/components/admin/{Notices,CommandPalette,Shortcuts,UndoToast}.tsx  yeni
src/app/admin/**/{error,loading,not-found}.tsx                   yeni
```

### Test (her fazla birlikte)

```
vitest.config.ts, src/**/*.test.ts     yeni
+ vitest, @vitest/coverage-v8 (dev)
scripts/qa-*.mjs                       DEĞİŞ (yeni rotalar) + qa-visual.mjs yeni
```

**Kabaca ~180 yeni dosya, ~45 değişen dosya.**

---

## 4. Migrasyon adımları (F0 — geri alınabilir sırayla)

1. `prisma`, `@prisma/client`, `jose` kur. `prisma/schema.prisma` yaz.
2. `prisma migrate dev --name init` → `data/nefis.db`. `.gitignore`'a `data/`.
3. `scripts/migrate-catalog-to-db.ts`: `catalog.json` oku → Zod doğrula →
   fiyatları `Math.round(x*100)` ile kuruşa çevir → tablolara yaz.
   **Idempotent** (slug/id upsert), `--dry-run` bayrağı, ekrana özet + toplam
   tutar checksum'ı.
4. `prisma/seed.ts`: aynı işi `catalog.seed.json`'dan yapar → "demo verisine sıfırla".
5. `catalog-adapter.ts` DB satırlarını `AdminProduct`'a, oradan `Product`'a çevirir.
   **`toStorefrontProduct` gövdesi ve placeholder metinleri aynen korunur** →
   vitrin çıktısı bit bazında aynı kalır.
6. `products.ts` / `categories.ts` §5.1 kararına göre yeniden yazılır.
7. Doğrulama: migrasyon **öncesi/sonrası** `npm run build` çıktısı + `qa:console`
   + `qa:responsive` ile HTML diff'lenir. Fark = regresyon.
8. `admin:create-user` ile ilk `sahip` kullanıcısı. Eski parola akışı ve
   `ADMIN_WRITE_ENABLED` kaldırılır.
9. `catalog.json` **silinmez**, `src/data/legacy/` altına arşivlenir (geri dönüş
   yolu); `catalog.seed.json` seed kaynağı olarak kalır.

**Geri alma:** F0 tek commit serisi → `git revert` + `data/nefis.db` sil.

---

## 5. Karar bekleyen sorular (bloklayıcı)

### 5.1 Vitrin veri erişimi — en kritik karar

`export const products: Product[]` senkron; 10 client component buna bağlı. Üç yol:

- **A) Snapshot (imza korunur, dinamiklik kaybolur).** DB kaynak; her admin yazımı
  `src/data/catalog.generated.json` üretir; `products.ts` bunu senkron import eder.
  Vitrin **hiç değişmez**. Bedeli: modül-kapsamı import olduğu için değişiklikler
  ancak yeniden derlemede görünür — Vercel'de admin düzenlemesi siteye yansımaz.
  Promptun `revalidateTag` şartını karşılamaz.
- **B) Sunucu-only + props/context (önerilen).** `products.ts` async sunucu
  fonksiyonlarına döner; client bileşenler veriyi layout seviyesindeki
  `CatalogProvider`'dan yalın projeksiyonla (id, slug, ad, fiyat, görsel, stok) alır.
  10 client dosyası + `cart-math`, `filters`, `search`, `seo` düzenlenir.
  Promptun caching şartını karşılar, **825 KB'ı client bundle'dan düşürür**;
  "imza değişmeyecek" kuralını *literal* olarak ihlal eder.
- **C) Hibrit.** Sunucu bileşenleri DB'den, client'lar snapshot'tan okur.
  İki kaynak = tutarsızlık riski.

> **Önerim: B.** Promptun kendi caching şartı zaten B'yi zorunlu kılıyor.
> "Vitrin bileşenlerini kırma" kuralına davranış/çıktı düzeyinde sadık kalırım
> (HTML diff ile kanıtlarım); yalnız import biçimi değişir.

### 5.2 Veritabanı ve dağıtım hedefi

Proje Vercel'e bağlı (`vercel.json`, `.vercel/`). **SQLite dosyası Vercel'de kalıcı
değildir** (salt-okunur FS, ephemeral). `/admin/gorseller` yüklemeleri de kalıcı
depolama ister.

- (a) Şimdilik yalnız yerel/VPS: SQLite; dağıtım sonra düşünülür.
- (b) Baştan Postgres (Neon / Vercel Postgres) + Blob storage — `String[]` alanları
  da olduğu gibi kullanılabilir.
- (c) SQLite ile geliştir + Postgres'e taşınabilir şema (Json sütunlar) — prompttaki
  tercih; dağıtımda `DATABASE_URL` değiştirip yeniden migrate.

### 5.3 Faz kapsamı ve sıra

F0–F8 tek oturumda bitmez. Önerim: **F0 → F1 → F2** (sipariş uçtan uca çalışır hale
gelir), sonra F3/F4, sonra F5–F8. Her faz ayrı commit serisi + `lint` + `typecheck`
+ testler + özet, sonra dur. Bu sıra uygun mu?

### 5.4 Bağımlılık tercihleri

- **Parola:** `argon2`/`bcrypt` native derleme ister (Windows'ta sorunlu).
  Önerim: Node yerleşik `crypto.scrypt` — bağımlılıksız, güvenli. Kabul mü?
- **Oturum:** `jose` (küçük, edge-uyumlu) vs `iron-session`. Önerim: `jose`.
- **Prisma sürümü:** npm'de `latest` = **8.0.0-rc.13 (RC)**; kararlı sürüm `7.10.0`.
  Önerim: `7.10.0` sabitle.
- **`cacheComponents: true`** açılsın mı? Açılırsa `unstable_cache` yerine Next 16'nın
  önerdiği `'use cache'` + `cacheTag` kullanılır; ancak vitrin render davranışını
  etkiler, ayrı bir doğrulama turu ister.

### 5.5 Dış servisler ve veri setleri

- **Ödeme:** iyzico/PayTR **sandbox anahtarların var mı?** Yoksa gerçek adaptörler
  yalnız iskelet + `mock` sağlayıcı ile test edilir; F3 kabul kriteri
  ("test kartıyla 3DS") sandbox olmadan doğrulanamaz.
- **Kargo:** Yurtiçi/Aras/MNG API'leri kurumsal sözleşme ister. Varsayılan **manuel
  adaptör**, canlı adaptörler iskelet — kabul mü?
- **E-posta:** Resend API key mi, SMTP mi? Yoksa `DEMO_MODE=true` ile `EmailLog`'a
  yazıp panelde gösteririm.
- **Adres verisi:** İl (81) + ilçe (~970) küçük, paketlenebilir. **Mahalle ~50k kayıt
  / ~5 MB** — bundle'a girmez, API route + arama ile sunulur. Veri setini sen mi
  sağlayacaksın, yoksa açık kaynak bir listeyi ben mi ekleyeyim?

---

## 6. Riskler

| # | Risk | Etki | Önlem |
|---|---|---|---|
| R1 | §5.1-B refactor'ü 14 dosyayı etkiler | Vitrin regresyonu | Öncesi/sonrası HTML diff + `qa:*`; ayrı commit |
| R2 | Prisma `String[]` SQLite'ta yok | Şema derlenmez | Json sütun + Zod tipleme (§2) |
| R3 | SQLite Vercel'de kalıcı değil | Canlıda veri kaybı | §5.2 kararı; (c) ise dağıtım öncesi Postgres migrasyonu zorunlu |
| R4 | Float → kuruş yuvarlaması | Kuruş kayması | `Math.round` + migrasyon sonrası toplam tutar checksum'ı |
| R5 | Ödeme/kargo sandbox erişimi yok | F3/F4 kabul kriteri doğrulanamaz | `mock` sağlayıcı + entegrasyon testi; canlı doğrulama kullanıcıya kalır |
| R6 | Webhook'lar `proxy` matcher'ında kalırsa 401 | Ödeme bildirimi kaybı | `/api/webhooks/*` matcher'dan hariç + imza doğrulaması |
| R7 | Eşzamanlı stok düşümü | Aşırı satış | Transaction + `version` optimistik kilit + `StockReservation` TTL |
| R8 | `cacheComponents` açmak render davranışını değiştirir | Beklenmedik dinamiklik | §5.4 kararı; açılırsa ayrı commit + tam QA turu |
| R9 | `ENCRYPTION_KEY` kaybı | Şifreli TCKN/anahtarlar okunamaz | Anahtar rotasyonu + yedekleme talimatı README'de |
| R10 | Kapsam büyüklüğü (~180 dosya) | Yarım kalma | Faz faz commit; her faz kendi başına çalışır durumda bırakılır |
| R11 | `catalog.json` 825 KB hâlâ client bundle'da | Performans | §5.1-B bunu çözer (yan kazanç) |
| R12 | KVKK / mesafeli satış metinleri hukuki içerik | Yasal risk | Şablon + sürümleme altyapısı verilir; **metinlerin hukuki onayı kullanıcıya aittir** — README'de açıkça belirtilir |

---

## 7. Onaydan sonraki ilk adım

§5'teki kararlar netleşince **F0** başlar: `prisma/schema.prisma` + migration +
`migrate-catalog-to-db.ts` + auth/rol/audit; sonunda `npm run lint`,
`npm run typecheck` ve vitrin regresyon karşılaştırması + kısa rapor.
