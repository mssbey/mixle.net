// Hafif katalog ucu — client bileşenlerinin kimliğe göre ürün çözmesi için.
//
// Sepet, favoriler, son görüntülenenler ve arama kutusu localStorage'daki
// kimlikleri ürüne çevirmek zorunda; hangi ürünlerin gerekeceği sunucuda
// bilinemediği için tam liste (hafif projeksiyonla) sunulur.
//
// Herkese açıktır: yalnızca zaten vitrinde yayında olan ürünleri döndürür.

import { getProducts } from '@/data/products';
import { toSlimProduct } from '@/lib/catalog-slim';

export async function GET() {
  const products = (await getProducts()).map(toSlimProduct);

  return Response.json(
    { products },
    {
      headers: {
        // Katalog nadiren değişir; tarayıcı kısa süre, CDN daha uzun tutabilir.
        // Panelden yazma sonrası `revalidateCatalog()` sunucu önbelleğini düşürür.
        'cache-control': 'public, max-age=60, stale-while-revalidate=300',
      },
    },
  );
}
