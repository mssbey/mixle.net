import { withRead } from '@/lib/admin/http';
import { catalogToCsv } from '@/lib/admin/csv';
import { readCatalog } from '@/lib/admin/store';

export const dynamic = 'force-dynamic';

export function GET(request: Request): Promise<Response> {
  return withRead(async () => {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') === 'csv' ? 'csv' : 'json';
    const catalog = await readCatalog();
    const stamp = new Date().toISOString().slice(0, 10);

    if (format === 'csv') {
      return new Response(catalogToCsv(catalog), {
        headers: {
          'content-type': 'text/csv; charset=utf-8',
          'content-disposition': `attachment; filename="nefis-aroma-katalog-${stamp}.csv"`,
        },
      });
    }

    return new Response(JSON.stringify(catalog, null, 2) + '\n', {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'content-disposition': `attachment; filename="nefis-aroma-katalog-${stamp}.json"`,
      },
    });
  });
}
