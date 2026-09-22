import { handle } from '@/lib/admin/http';
import { AdminError, duplicateProduct, duplicateSlugCandidates } from '@/lib/admin/mutations';
import { readCatalogSlice, saveProduct } from '@/server/catalog/persist';
import { auditChange } from '@/server/audit';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/**
 * WordPress'teki "Çoğalt": ürünün taslak bir kopyasını oluşturur.
 *
 * Katalogun tamamı okunmaz — önce kaynak ürün, sonra yalnızca olası kopya
 * slug'ları çekilir (bkz. `readCatalogSlice`).
 */
export function POST(_request: Request, { params }: Ctx): Promise<Response> {
  return handle('katalog:yaz', async (user) => {
    const { id } = await params;

    const base = await readCatalogSlice({ productIds: [id] });
    const source = base.products.find((p) => p.id === id);
    if (!source) throw new AdminError('Ürün bulunamadı', 404);

    const slice = await readCatalogSlice({
      productIds: [id],
      slugs: duplicateSlugCandidates(source.slug),
    });
    const { product } = duplicateProduct(slice, id);
    await saveProduct(product);
    await auditChange({
      user,
      action: 'olustur',
      entityType: 'Product',
      entityId: product.id,
      after: { slug: product.slug, name: product.name, status: product.status, kopyaKaynagi: id },
    });
    return Response.json({ product }, { status: 201 });
  });
}
