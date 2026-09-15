// Kargo etiketi yazdırma: ?ids=a,b,c — her sevkiyat ayrı A6 sayfada.

import { requirePermission } from '@/server/auth/current-user';
import { db } from '@/server/db';
import { getStoreInfo } from '@/server/settings';
import { ShipmentLabelDocument, type LabelViewModel } from '@/components/admin/shipping/ShipmentLabelDocument';
import { site } from '@/lib/site';

export const dynamic = 'force-dynamic';

export default async function ShipmentLabelsPage({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  await requirePermission('siparis:oku');
  const { ids } = await searchParams;
  const list = (ids ?? '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 100);

  const [shipments, store] = await Promise.all([
    db.shipment.findMany({
      where: { id: { in: list } },
      include: {
        order: {
          select: {
            orderNumber: true,
            shippingAddress: true,
            paymentMethod: true,
            paymentStatus: true,
            grandTotalMinor: true,
            items: { select: { id: true, name: true, variantLabel: true } },
          },
        },
      },
    }),
    getStoreInfo(),
  ]);

  const byId = new Map(shipments.map((s) => [s.id, s]));
  const labels: LabelViewModel[] = list
    .map((id) => byId.get(id))
    .filter((s): s is NonNullable<typeof s> => s != null)
    .map((s) => {
      const addr = s.order.shippingAddress as {
        firstName?: string; lastName?: string; companyName?: string; isCorporate?: boolean;
        phone?: string; addressLine?: string; neighborhood?: string; district?: string; city?: string; postalCode?: string;
      };
      const items = (s.items as { orderItemId: string; quantity: number }[]) ?? [];
      const names = items
        .map((it) => s.order.items.find((oi) => oi.id === it.orderItemId))
        .filter((oi): oi is NonNullable<typeof oi> => oi != null)
        .map((oi) => oi.variantLabel ? `${oi.name} (${oi.variantLabel})` : oi.name);
      const isCod = s.order.paymentMethod === 'kapida' && s.order.paymentStatus !== 'ödendi';
      return {
        shipmentId: s.id,
        orderNumber: s.order.orderNumber,
        carrier: s.carrier,
        trackingNumber: s.trackingNumber,
        itemSummary: names.slice(0, 2).join(', ') + (names.length > 2 ? ` +${names.length - 2}` : ''),
        itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
        weightGrams: s.weightGrams,
        desi: s.desi,
        codAmountMinor: isCod ? s.order.grandTotalMinor : null,
        to: {
          name: addr.isCorporate && addr.companyName ? addr.companyName : `${addr.firstName ?? ''} ${addr.lastName ?? ''}`.trim(),
          phone: addr.phone ?? '',
          addressLine: addr.addressLine ?? '',
          neighborhood: addr.neighborhood ?? '',
          district: addr.district ?? '',
          city: addr.city ?? '',
          postalCode: addr.postalCode ?? '',
        },
      };
    });

  return (
    <ShipmentLabelDocument
      labels={labels}
      from={{ name: store.tradeName || site.name, phone: store.phone, addressLine: store.address, city: store.city }}
    />
  );
}
