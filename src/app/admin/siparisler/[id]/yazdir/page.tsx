// Yazdırılabilir fatura / irsaliye (A4). Tarayıcıdan "PDF olarak kaydet".
//
// Bu bir e-Fatura/e-Arşiv belgesi DEĞİLDİR; resmi fatura F7'de e-fatura
// sağlayıcısıyla üretilir. Burası sipariş bilgi fişi ve paketleme irsaliyesi.
// Panel yerleşimi dışında, kendi print CSS'iyle render edilir.

import { notFound } from 'next/navigation';
import { requirePermission } from '@/server/auth/current-user';
import { withAdminStore } from '@/server/store-context';
import { getAdminOrder } from '@/server/orders/admin-view';
import { getStoreInfo } from '@/server/settings';
import { PrintDocument } from '@/components/admin/orders/PrintDocument';

export const dynamic = 'force-dynamic';

async function PrintOrderPageContent({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tip?: string }>;
}) {
  await requirePermission('siparis:oku');
  const { id } = await params;
  const { tip } = await searchParams;
  const order = await getAdminOrder(id);
  if (!order) notFound();
  const info = await getStoreInfo();
  return <PrintDocument orders={[order]} kind={tip === 'irsaliye' ? 'irsaliye' : 'fatura'} store={info} />;
}

/** Veriler panelde seçili mağazanın bağlamında okunur. */
export default async function PrintOrderPage(props: Parameters<typeof PrintOrderPageContent>[0]) {
  return withAdminStore(() => PrintOrderPageContent(props));
}
