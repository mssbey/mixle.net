// Canlı (veya seçilen) veritabanındaki TÜM ürünleri siler; kategori ve
// koleksiyon tabloları korunur. Varyant, seçenek, seçenek değeri, görsel ve
// kategori/koleksiyon bağları ürüne ait olduğu için ürünle birlikte gider
// (şemada onDelete: Cascade). Sipariş kalemleri anlık görüntü (snapshot)
// tuttuğundan etkilenmez. Ürünü kalmayan sepet kalemleri de temizlenir.
//
//   Sayım (güvenli):   node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/delete-all-products.ts
//   Gerçek silme:      node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/delete-all-products.ts --confirm
//   Veritabanı:        DB_URL_VAR=DATABASE_URL (varsayılan DATABASE_URL_PROD)
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const urlVar = process.env.DB_URL_VAR ?? 'DATABASE_URL_PROD';
const connectionString = process.env[urlVar];
if (!connectionString) throw new Error(`${urlVar} tanımlı değil`);
const confirm = process.argv.includes('--confirm');

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function counts() {
  const [urun, varyant, secenek, gorsel, kategori, koleksiyon, sepetKalemi] = await Promise.all([
    db.product.count(), db.variant.count(), db.productOption.count(), db.productImage.count(),
    db.category.count(), db.collection.count(), db.cartItem.count(),
  ]);
  return { urun, varyant, secenek, gorsel, kategori, koleksiyon, sepetKalemi };
}

async function main() {
  console.log(`Veritabanı: ${urlVar} → ${new URL(connectionString!).host}`);
  console.log('Önce:', await counts());
  if (!confirm) {
    console.log('Sadece sayım yapıldı. Silmek için --confirm ekleyin.');
    return;
  }
  const result = await db.$transaction(
    async (tx) => {
      // Cascade zinciri: product → variant/option/image/bağlar; option → optionValue;
      // variant → stockMovement/stockReservation.
      const products = await tx.product.deleteMany({});
      // CartItem'ın ürünle FK ilişkisi yok; artık var olmayan ürünlere işaret eden kalemleri sil.
      const cartItems = await tx.cartItem.deleteMany({});
      return { silinenUrun: products.count, silinenSepetKalemi: cartItems.count };
    },
    { timeout: 120_000 },
  );
  console.log('Silindi:', result);
  console.log('Sonra:', await counts());
}

main()
  .catch((e) => {
    console.error('HATA:', e instanceof Error ? e.message.split('\n')[0] : e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
