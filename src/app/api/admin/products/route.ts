import type { AdminProduct, ProductStatus } from '@/types/admin';
import { readJson, withRead, withWrite } from '@/lib/admin/http';
import { createProduct, listProducts, type ProductQuery } from '@/lib/admin/mutations';
import { readCatalog, writeCatalog } from '@/lib/admin/store';

export const dynamic = 'force-dynamic';

export function GET(request: Request): Promise<Response> {
  return withRead(async () => {
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
  return withWrite(async () => {
    const input = await readJson<AdminProduct>(request);
    const catalog = await readCatalog();
    const { catalog: next, product } = createProduct(catalog, input);
    await writeCatalog(next);
    return Response.json({ product }, { status: 201 });
  });
}
