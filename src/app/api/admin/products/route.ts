import type { AdminProduct, ProductStatus } from '@/types/admin';
import { handle, readJson } from '@/lib/admin/http';
import { createProduct, listProducts, type ProductQuery } from '@/lib/admin/mutations';
import { readCatalog, readCatalogSlice, saveProduct } from '@/server/catalog/persist';
import { auditChange } from '@/server/audit';

export const dynamic = 'force-dynamic';

export function GET(request: Request): Promise<Response> {
  return handle('katalog:oku', async () => {
    const { searchParams } = new URL(request.url);
    const query: ProductQuery = {
      search: searchParams.get('search') ?? undefined,
      categoryId: searchParams.get('categoryId') ?? undefined,
      collectionId: searchParams.get('collectionId') ?? undefined,
      status: (searchParams.get('status') as ProductStatus | 'all' | null) ?? 'all',
      sort: (searchParams.get('sort') as ProductQuery['sort']) ?? 'updated',
      dir: (searchParams.get('dir') as ProductQuery['dir']) ?? 'desc',
      page: Number(searchParams.get('page') ?? '1') || 1,
      pageSize: Number(searchParams.get('pageSize') ?? '20') || 20,
    };
    const catalog = await readCatalog();
    return Response.json(listProducts(catalog, query));
  });
}

export function POST(request: Request): Promise<Response> {
  return handle('katalog:yaz', async (user) => {
    const input = await readJson<AdminProduct>(request);
    // Slug/kimlik çakışması ve kategori kontrolü için tüm katalog gerekmez.
    const catalog = await readCatalogSlice({
      productIds: [input?.id],
      slugs: [input?.slug],
    });
    // Doğrulama/normalizasyon saf mutasyonda; yazma yalnızca etkilenen üründe.
    const { product } = createProduct(catalog, input);
    await saveProduct(product);
    await auditChange({
      user,
      action: 'olustur',
      entityType: 'Product',
      entityId: product.id,
      after: { slug: product.slug, name: product.name, status: product.status },
    });
    return Response.json({ product }, { status: 201 });
  });
}
