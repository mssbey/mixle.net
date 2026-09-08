// Kargo etiketi — yazdırma odaklı, A6 boyutunda (10x15cm). Gerçek bir taşıyıcı
// barkodu DEĞİLDİR (bkz. `server/shipping/adapters/*`); adres, takip no ve
// içerik özetini taşıyan paket etiketidir. Tarayıcıdan "PDF olarak kaydet".

import { carrierLabels, type Carrier } from '@/server/shipping/carriers';
import { formatPhoneTR } from '@/lib/validators/phone';
import { PrintButton } from '@/components/admin/orders/PrintButton';

export interface LabelViewModel {
  shipmentId: string;
  orderNumber: string;
  carrier: string;
  trackingNumber: string | null;
  itemSummary: string;
  itemCount: number;
  weightGrams: number | null;
  desi: number | null;
  codAmountMinor: number | null;
  to: {
    name: string;
    phone: string;
    addressLine: string;
    neighborhood: string;
    district: string;
    city: string;
    postalCode: string;
  };
}

export function ShipmentLabelDocument({ labels, from }: { labels: LabelViewModel[]; from: { name: string; phone: string; addressLine: string; city: string } }) {
  return (
    <div className="label-root">
      <style>{`
        .label-root { font: 12px/1.4 Arial, Helvetica, sans-serif; color: #111; background: #fff; }
        .label { width: 100mm; height: 150mm; margin: 0 auto; padding: 6mm; box-sizing: border-box; page-break-after: always; border: 1px dashed #ccc; display: flex; flex-direction: column; }
        .label:last-child { page-break-after: auto; }
        .from { font-size: 10px; color: #666; border-bottom: 1px solid #ddd; padding-bottom: 4mm; margin-bottom: 4mm; }
        .carrier { font-size: 15px; font-weight: 700; color: #672779; text-transform: uppercase; }
        .to-name { font-size: 17px; font-weight: 700; margin: 3mm 0 1mm; }
        .to-addr { font-size: 13px; line-height: 1.5; }
        .track { margin-top: auto; border-top: 2px solid #672779; padding-top: 3mm; }
        .track .no { font-size: 15px; font-weight: 700; letter-spacing: 0.05em; font-family: 'Courier New', monospace; }
        .meta { font-size: 10px; color: #555; margin-top: 2mm; display: flex; justify-content: space-between; }
        .cod { margin-top: 2mm; font-size: 12px; font-weight: 700; background: #fff4de; border: 1px solid #f2d597; padding: 2mm; text-align: center; }
        .toolbar { position: fixed; top: 8px; right: 8px; }
        .toolbar button { background: #672779; color: #fff; border: 0; border-radius: 6px; padding: 8px 14px; font-weight: 600; cursor: pointer; }
        @media print { .toolbar { display: none; } .label { border: 0; margin: 0; } @page { size: 100mm 150mm; margin: 0; } }
      `}</style>
      <div className="toolbar"><PrintButton /></div>

      {labels.length === 0 && <div className="label">Sevkiyat bulunamadı.</div>}

      {labels.map((l) => (
        <section key={l.shipmentId} className="label">
          <div className="from">Gönderen: {from.name} · {from.addressLine}, {from.city} · {formatPhoneTR(from.phone)}</div>
          <div className="carrier">{carrierLabels[l.carrier as Carrier] ?? l.carrier}</div>
          <div className="to-name">{l.to.name}</div>
          <div className="to-addr">
            {l.to.addressLine}<br />
            {l.to.neighborhood ? `${l.to.neighborhood} Mah., ` : ''}{l.to.district} / {l.to.city}{l.to.postalCode ? ` ${l.to.postalCode}` : ''}<br />
            {l.to.phone && formatPhoneTR(l.to.phone)}
          </div>
          {l.codAmountMinor != null && l.codAmountMinor > 0 && (
            <div className="cod">KAPIDA TAHSİLAT: {(l.codAmountMinor / 100).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</div>
          )}
          <div className="track">
            <div>Sipariş: <strong>{l.orderNumber}</strong></div>
            <div className="no">{l.trackingNumber || 'TAKİP NO YOK'}</div>
            <div className="meta">
              <span>{l.itemCount} kalem · {l.itemSummary}</span>
              <span>{l.desi ? `${l.desi} desi` : l.weightGrams ? `${(l.weightGrams / 1000).toFixed(1)} kg` : ''}</span>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
