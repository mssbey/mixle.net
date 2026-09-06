// Toplu yazdırma: ?ids=a,b,c&tip=fatura|irsaliye — her sipariş ayrı sayfada.

import { requirePermission } from '@/server/auth/current-user';
import { getAdminOrder, type AdminOrderView } from '@/server/orders/admin-view';
import { getStoreInfo } from '@/server/settings';
import { PrintDocument } from '@/components/admin/orders/PrintDocument';

export const dynamic = 'force-dynamic';

export default async function PrintManyPage({ searchParams }: { searchParams: Promise<{ ids?: string; tip?: string }> }) {
  await requirePermission('siparis:oku');
  const { ids, tip } = await searchParams;
  const list = (ids ?? '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 100);
  const orders = (await Promise.all(list.map((id) => getAdminOrder(id)))).filter((o): o is AdminOrderView => o != null);
  const info = await getStoreInfo();
  return <PrintDocument orders={orders} kind={tip === 'irsaliye' ? 'irsaliye' : 'fatura'} store={info} />;
}
