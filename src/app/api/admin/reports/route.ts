import { handle } from '@/lib/admin/http';
import { getReportsOverview, salesSeriesToCsv } from '@/server/reports/sales';

export const dynamic = 'force-dynamic';

const DAY_MS = 24 * 60 * 60 * 1000;

export function GET(request: Request): Promise<Response> {
  return handle('rapor:oku', async () => {
    const sp = new URL(request.url).searchParams;
    const now = new Date();
    const to = sp.get('to') ? new Date(`${sp.get('to')}T23:59:59.999`) : now;
    const from = sp.get('from') ? new Date(`${sp.get('from')}T00:00:00.000`) : new Date(to.getTime() - 29 * DAY_MS);

    const overview = await getReportsOverview({ from, to });

    if (sp.get('format') === 'csv') {
      const csv = salesSeriesToCsv(overview.series);
      const stamp = new Date().toISOString().slice(0, 10);
      return new Response(csv, {
        headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="satis-raporu-${stamp}.csv"` },
      });
    }

    return Response.json(overview);
  });
}
