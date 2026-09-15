// Demo verisi — `src/data/catalog.seed.json` kaynağından.
//
// "Demo verisine sıfırla" akışının kaynağıdır (panel: Ayarlar → Bakım).
// Kataloğu SIFIRDAN yazar: mevcut katalog kayıtları silinir.
// Sipariş/müşteri/kullanıcı tablolarına DOKUNMAZ.
//
// Kullanım: npm run db:seed

import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { importCatalog, legacyCatalogSchema, legacyToCatalog } from '../src/server/catalog/import';

/** Varsayılan KDV oranları — Türkiye. Oran ON BİNDE tutulur (2000 = %20). */
const TAX_RATES = [
  { id: 'kdv-20', name: 'KDV %20', rateBps: 2000, isDefault: true },
  { id: 'kdv-10', name: 'KDV %10', rateBps: 1000, isDefault: false },
  { id: 'kdv-1', name: 'KDV %1', rateBps: 100, isDefault: false },
];

async function readCatalog(relative: string) {
  const file = path.resolve(process.cwd(), relative);
  const raw = JSON.parse(await readFile(file, 'utf8')) as unknown;
  const parsed = legacyCatalogSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `${relative} okunamadı: ${parsed.error.issues[0]?.path.join('.')} — ${parsed.error.issues[0]?.message}`,
    );
  }
  return legacyToCatalog(parsed.data);
}

export async function seed(db: PrismaClient): Promise<void> {
  // Demo katalog sıfırdan yazılır; ardından gerçek Puff Aromalar kataloğu
  // (scripts/build-puff-catalog.py çıktısı) aynı veritabanına eklenir.
  const catalog = await readCatalog('src/data/catalog.seed.json');
  const report = await importCatalog(db, catalog, { wipe: true });
  const puff = await readCatalog('src/data/catalog.puff.json');
  const puffReport = await importCatalog(db, puff);

  for (const rate of TAX_RATES) {
    await db.taxRate.upsert({
      where: { id: rate.id },
      create: rate,
      update: { name: rate.name, rateBps: rate.rateBps, isDefault: rate.isDefault },
    });
  }

  // Demo kuponlar — vitrindeki kampanya sayfasında ilan edilen kodlar.
  // Yüzde tipinde value ON BİNDE, tutar tipinde KURUŞ.
  const coupons = [
    { code: 'NEFIS10', type: 'yüzde', value: 1000, minCartTotalMinor: null, firstOrderOnly: false },
    { code: 'ILKAROMA', type: 'tutar', value: 6000, minCartTotalMinor: 30_000, firstOrderOnly: true },
    { code: 'GOLDENDROP', type: 'yüzde', value: 1500, minCartTotalMinor: null, firstOrderOnly: false },
  ];
  for (const c of coupons) {
    await db.coupon.upsert({
      where: { code: c.code },
      create: {
        ...c,
        maxDiscountMinor: null,
        includeProductIds: [],
        excludeProductIds: [],
        includeCategoryIds: c.code === 'GOLDENDROP' ? ['golden-drop'] : [],
        isActive: true,
        stackable: false,
      },
      update: { type: c.type, value: c.value, minCartTotalMinor: c.minCartTotalMinor, firstOrderOnly: c.firstOrderOnly, isActive: true },
    });
  }

  // Sipariş numarası sayacı (NA-YYYY-000123) — yalnızca yoksa oluşturulur.
  await db.counter.upsert({
    where: { key: 'siparis-no' },
    create: { key: 'siparis-no', value: 0 },
    update: {},
  });

  console.log(
    `Demo verisi yüklendi: ${report.products} ürün, ${report.variants} varyant, ` +
      `${report.categories} kategori, ${report.collections} koleksiyon. ` +
      `Puff Aromalar: ${puffReport.products} ürün, ${puffReport.variants} varyant.`,
  );
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL tanımlı değil (.env dosyasına ekleyin).');

  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  try {
    await seed(db);
  } finally {
    await db.$disconnect();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
