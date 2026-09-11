// Tek seferlik geçiş: katalog JSON dosyası → veritabanı.
//
// Özgün dosya geçiş sonrası src/data/legacy/catalog.json altına arşivlendi;
// geri dönüş yolu olarak duruyor, uygulama artık onu okumuyor.
//
// Kullanım:
//   npm run db:migrate-catalog -- --dry-run     (yazmadan rapor)
//   npm run db:migrate-catalog                  (uygula)
//   npm run db:migrate-catalog -- --wipe        (önce katalog tablolarını boşalt)
//   npm run db:migrate-catalog -- --file=src/data/catalog.seed.json
//
// Fiyatlar TL float'tan KURUŞ tam sayısına çevrilir. Betik idempotenttir:
// aynı dosyayla iki kez çalıştırmak aynı sonucu verir.

import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import {
  importCatalog,
  legacyCatalogSchema,
  legacyToCatalog,
  reportOf,
  type ImportReport,
} from '../src/server/catalog/import';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const wipe = args.includes('--wipe');
const fileArg = args.find((a) => a.startsWith('--file='));
const sourceFile = fileArg ? fileArg.slice('--file='.length) : 'src/data/legacy/catalog.json';

function formatReport(label: string, r: ImportReport): string {
  const tl = (minor: number) =>
    new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(minor / 100);
  return [
    `${label}`,
    `  Kategoriler      : ${r.categories}`,
    `  Koleksiyonlar    : ${r.collections}`,
    `  Ürünler          : ${r.products}`,
    `  Varyantlar       : ${r.variants}`,
    `  Görseller        : ${r.images}`,
    `  Seçenekler       : ${r.options} (${r.optionValues} değer)`,
    `  Fiyat toplamı    : ${r.totalPriceMinor} kuruş = ${tl(r.totalPriceMinor)}`,
    `  Stok toplamı     : ${r.totalStock}`,
  ].join('\n');
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL tanımlı değil (.env dosyasına ekleyin).');

  const absolute = path.resolve(process.cwd(), sourceFile);
  console.log(`Kaynak dosya: ${absolute}`);

  const raw = JSON.parse(await readFile(absolute, 'utf8')) as unknown;
  const parsed = legacyCatalogSchema.safeParse(raw);
  if (!parsed.success) {
    console.error('Kaynak dosya okunamadı — şema uyuşmuyor:');
    for (const issue of parsed.error.issues.slice(0, 20)) {
      console.error(`  ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exit(1);
  }

  const catalog = legacyToCatalog(parsed.data);
  const expected = reportOf(catalog);
  console.log('');
  console.log(formatReport('Kaynak dosyadan okunan:', expected));

  if (dryRun) {
    console.log('\n--dry-run: veritabanına yazılmadı.');
    return;
  }

  const adapter = new PrismaPg({ connectionString: url });
  const db = new PrismaClient({ adapter });

  try {
    const before = await db.product.count();
    console.log(`\nVeritabanındaki mevcut ürün sayısı: ${before}`);

    await importCatalog(db, catalog, { wipe });

    // Doğrulama: yazdıktan sonra veritabanından geri okuyup toplamları karşılaştır.
    const [products, variants, categories, collections, images] = await Promise.all([
      db.product.count(),
      db.variant.count(),
      db.category.count(),
      db.collection.count(),
      db.productImage.count(),
    ]);
    const sums = await db.variant.aggregate({ _sum: { priceMinor: true, stock: true } });

    const actual: ImportReport = {
      products,
      variants,
      categories,
      collections,
      images,
      options: await db.productOption.count(),
      optionValues: await db.optionValue.count(),
      totalPriceMinor: sums._sum.priceMinor ?? 0,
      totalStock: sums._sum.stock ?? 0,
    };

    console.log('');
    console.log(formatReport('Veritabanından geri okunan:', actual));

    const mismatches: string[] = [];
    for (const key of Object.keys(expected) as (keyof ImportReport)[]) {
      if (expected[key] !== actual[key]) {
        mismatches.push(`  ${key}: beklenen ${expected[key]}, bulunan ${actual[key]}`);
      }
    }

    if (mismatches.length) {
      console.error('\nDOĞRULAMA BAŞARISIZ — toplamlar uyuşmuyor:');
      console.error(mismatches.join('\n'));
      process.exit(1);
    }

    console.log('\nDoğrulama tamam: tüm toplamlar birebir eşleşti.');
  } finally {
    await db.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
