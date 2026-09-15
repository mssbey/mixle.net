// Fatura bilgi fişi / paketleme irsaliyesi — yazdırma odaklı, bağımsız stil.

import type { AdminOrderView } from '@/server/orders/admin-view';
import type { StoreInfo } from '@/server/settings';
import { formatMinor, bpsToPercent } from '@/lib/money';
import { formatPhoneTR } from '@/lib/validators/phone';
import { site } from '@/lib/site';
import { PrintButton } from './PrintButton';

const dateFmt = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'long', timeZone: 'Europe/Istanbul' });

export function PrintDocument({ orders, kind, store }: { orders: AdminOrderView[]; kind: 'fatura' | 'irsaliye'; store: StoreInfo }) {
  return (
    <div className="print-root">
      <style>{`
        .print-root { font: 12px/1.5 Arial, Helvetica, sans-serif; color: #111; background: #fff; }
        .sheet { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 16mm; box-sizing: border-box; page-break-after: always; }
        .sheet:last-child { page-break-after: auto; }
        .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #672779; padding-bottom: 8px; margin-bottom: 14px; }
        .brand { font-size: 20px; font-weight: 700; color: #672779; }
        .muted { color: #666; }
        h1 { font-size: 16px; margin: 0 0 4px; }
        .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 12px 0; }
        .box { border: 1px solid #ddd; border-radius: 6px; padding: 8px 10px; }
        .box h3 { margin: 0 0 4px; font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: #666; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th, td { padding: 6px 8px; border-bottom: 1px solid #e5e5e5; text-align: left; vertical-align: top; }
        th { background: #f5f0f7; font-size: 11px; text-transform: uppercase; letter-spacing: .05em; }
        .r { text-align: right; }
        .totals { margin-left: auto; width: 70mm; margin-top: 10px; }
        .totals td { border: 0; padding: 3px 8px; }
        .totals .grand td { border-top: 2px solid #672779; font-weight: 700; font-size: 14px; }
        .note { margin-top: 14px; font-size: 11px; color: #555; }
        .toolbar { position: fixed; top: 8px; right: 8px; }
        .toolbar button { background: #672779; color: #fff; border: 0; border-radius: 6px; padding: 8px 14px; font-weight: 600; cursor: pointer; }
        .check { width: 14px; height: 14px; border: 1px solid #999; display: inline-block; vertical-align: middle; }
        @media print { .toolbar { display: none; } .sheet { margin: 0; } @page { size: A4; margin: 0; } }
      `}</style>
      <div className="toolbar"><PrintButton /></div>

      {orders.length === 0 && <div className="sheet">Sipariş bulunamadı.</div>}

      {orders.map((o) => (
        <section key={o.id} className="sheet">
          <div className="head">
            <div>
              <div className="brand">{store.tradeName || site.name}</div>
              <div className="muted">
                {store.legalName}{store.address ? ` · ${store.address}` : ''}{store.city ? ` / ${store.city}` : ''}<br />
                {store.phone && `Tel: ${store.phone} · `}{store.email}{store.taxOffice && ` · ${store.taxOffice} VD ${store.taxNumber}`}{store.mersisNo && ` · MERSİS ${store.mersisNo}`}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <h1>{kind === 'fatura' ? 'SİPARİŞ BİLGİ FİŞİ' : 'SEVK İRSALİYESİ'}</h1>
              <div><strong>{o.orderNumber}</strong></div>
              <div className="muted">{dateFmt.format(new Date(o.placedAt))}</div>
              {kind === 'fatura' && <div className="muted" style={{ fontSize: 10 }}>Bu belge e-Fatura / e-Arşiv yerine geçmez.</div>}
            </div>
          </div>

          <div className="cols">
            <div className="box">
              <h3>{kind === 'fatura' ? 'Fatura adresi' : 'Teslimat adresi'}</h3>
              <Addr a={kind === 'fatura' ? o.billingAddress : o.shippingAddress} />
            </div>
            <div className="box">
              <h3>{kind === 'fatura' ? 'Teslimat adresi' : 'Sipariş bilgileri'}</h3>
              {kind === 'fatura' ? <Addr a={o.shippingAddress} /> : (
                <div>
                  Müşteri: {o.customer.name || o.customer.email}<br />
                  Ödeme: {o.paymentMethodLabel} ({o.paymentStatus})<br />
                  Kargo: {o.shippingMethod?.name ?? '—'}<br />
                  {o.customerNote && <>Not: {o.customerNote}</>}
                </div>
              )}
            </div>
          </div>

          <table>
            <thead>
              <tr>
                {kind === 'irsaliye' && <th style={{ width: 24 }} />}
                <th>Ürün</th>
                <th>SKU</th>
                <th className="r">Adet</th>
                {kind === 'fatura' && <><th className="r">Birim</th><th className="r">İndirim</th><th className="r">KDV</th><th className="r">Tutar</th></>}
              </tr>
            </thead>
            <tbody>
              {o.items.map((i) => (
                <tr key={i.id}>
                  {kind === 'irsaliye' && <td><span className="check" /></td>}
                  <td>{i.name}{i.variantLabel && <span className="muted"> · {i.variantLabel}</span>}</td>
                  <td className="muted">{i.sku || '—'}</td>
                  <td className="r">{i.quantity - i.refundedQuantity}</td>
                  {kind === 'fatura' && <>
                    <td className="r">{formatMinor(i.unitPriceMinor)}</td>
                    <td className="r">{i.discountMinor ? `−${formatMinor(i.discountMinor)}` : '—'}</td>
                    <td className="r">%{bpsToPercent(i.taxRateBps)}</td>
                    <td className="r">{formatMinor(i.lineTotalMinor)}</td>
                  </>}
                </tr>
              ))}
            </tbody>
          </table>

          {kind === 'fatura' && (
            <table className="totals">
              <tbody>
                <tr><td>Ara toplam</td><td className="r">{formatMinor(o.totals.itemsSubtotalMinor)}</td></tr>
                {o.totals.discountTotalMinor > 0 && <tr><td>İndirim{o.couponCode ? ` (${o.couponCode})` : ''}</td><td className="r">−{formatMinor(o.totals.discountTotalMinor)}</td></tr>}
                <tr><td>Kargo</td><td className="r">{o.totals.shippingTotalMinor === 0 ? 'Ücretsiz' : formatMinor(o.totals.shippingTotalMinor)}</td></tr>
                {o.totals.surchargeMinor > 0 && <tr><td>Kapıda ödeme bedeli</td><td className="r">{formatMinor(o.totals.surchargeMinor)}</td></tr>}
                {o.totals.taxBreakdown.map((t) => <tr key={t.rateBps}><td className="muted">KDV %{bpsToPercent(t.rateBps)} · matrah {formatMinor(t.netMinor)}</td><td className="r muted">{formatMinor(t.taxMinor)}</td></tr>)}
                <tr className="grand"><td>GENEL TOPLAM (KDV dahil)</td><td className="r">{formatMinor(o.totals.grandTotalMinor)}</td></tr>
                {o.totals.refundedTotalMinor > 0 && <tr><td>İade edilen</td><td className="r">−{formatMinor(o.totals.refundedTotalMinor)}</td></tr>}
              </tbody>
            </table>
          )}

          <p className="note">
            {kind === 'fatura'
              ? `Cayma hakkı: teslimden itibaren 14 gün. İade ve destek: ${store.email || '—'}. Kabul edilen sözleşme sürümleri sipariş kaydında saklıdır.`
              : 'Paketleyen: ____________   Kontrol: ____________   Koli sayısı: ______'}
          </p>
        </section>
      ))}
    </div>
  );
}

function Addr({ a }: { a: AdminOrderView['shippingAddress'] }) {
  return (
    <div>
      <strong>{a.isCorporate && a.companyName ? a.companyName : `${a.firstName} ${a.lastName}`}</strong><br />
      {a.isCorporate && a.companyName && <>{a.firstName} {a.lastName}<br /></>}
      {a.addressLine}<br />
      {a.neighborhood ? `${a.neighborhood} Mah., ` : ''}{a.district} / {a.city}{a.postalCode ? ` ${a.postalCode}` : ''}<br />
      {a.phone && formatPhoneTR(a.phone)}
      {a.isCorporate ? <><br />{a.taxOffice} VD · VKN {a.taxNumber}</> : a.identityNumberMasked ? <><br />TCKN {a.identityNumberMasked}</> : null}
    </div>
  );
}
