// İrsaliye / sipariş bilgi fişi — A4, yazdırma odaklı, bağımsız stil.
// Tarayıcıdan "PDF olarak kaydet" ile PDF alınır; toplu yazdırmada her
// sipariş ayrı sayfaya düşer.
//
// Bilgi fişi bir e-Fatura/e-Arşiv belgesi DEĞİLDİR; resmi fatura e-fatura
// sağlayıcısıyla üretilir.

import type { AdminOrderView } from '@/server/orders/admin-view';
import type { StoreInfo } from '@/server/settings';
import { formatMinor, bpsToPercent } from '@/lib/money';
import { formatPhoneTR } from '@/lib/validators/phone';
import { site } from '@/lib/site';
import { PrintButton } from './PrintButton';

const dateFmt = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'long', timeZone: 'Europe/Istanbul' });

type Kind = 'fatura' | 'irsaliye';

export function PrintDocument({ orders, kind, store }: { orders: AdminOrderView[]; kind: Kind; store: StoreInfo }) {
  const title = kind === 'irsaliye' ? 'İRSALİYE' : 'SİPARİŞ BİLGİ FİŞİ';
  return (
    <div className="print-root">
      <style>{CSS}</style>

      <div className="toolbar">
        <div className="toolbar-inner">
          <div>
            <strong>{kind === 'irsaliye' ? 'İrsaliye' : 'Sipariş bilgi fişi'}</strong>
            <span className="toolbar-muted"> · {orders.length} sipariş · her sipariş ayrı sayfa</span>
          </div>
          <div className="toolbar-actions">
            <a className="toolbar-link" href={`?tip=${kind === 'irsaliye' ? 'fatura' : 'irsaliye'}&ids=${orders.map((o) => o.id).join(',')}`}>
              {kind === 'irsaliye' ? 'Bilgi fişine geç' : 'İrsaliyeye geç'}
            </a>
            <PrintButton />
          </div>
        </div>
      </div>

      {orders.length === 0 && <section className="sheet"><p>Sipariş bulunamadı.</p></section>}

      {orders.map((o) => {
        const addr = kind === 'irsaliye' ? o.shippingAddress : o.billingAddress;
        return (
          <section key={o.id} className="sheet">
            <div className="brand-row">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/logo.png" alt={store.tradeName || site.name} className="logo" />
              <div className="store">
                <strong>{store.tradeName || site.name}</strong>
                {store.address && <div>{store.address}{store.city ? ` / ${store.city}` : ''}</div>}
                {(store.phone || store.email) && <div>{[store.phone, store.email].filter(Boolean).join(' · ')}</div>}
                {store.taxOffice && <div>{store.taxOffice} VD · {store.taxNumber}</div>}
              </div>
            </div>

            <h1 className="doc-title">{title}</h1>

            <div className="info-row">
              <div className="address">
                <Addr a={addr} />
                {kind === 'irsaliye' && o.customer.email && <div className="muted">{o.customer.email}</div>}
              </div>
              <table className="meta">
                <tbody>
                  <tr><td>Sipariş Numarası:</td><td>{o.orderNumber}</td></tr>
                  <tr><td>Sipariş Tarihi:</td><td>{dateFmt.format(new Date(o.placedAt))}</td></tr>
                  <tr><td>Ödeme Yöntemi:</td><td>{o.paymentMethodLabel}</td></tr>
                  {o.shippingMethod?.name && <tr><td>Gönderim:</td><td>{o.shippingMethod.name}</td></tr>}
                </tbody>
              </table>
            </div>

            <table className="items">
              <thead>
                <tr>
                  <th>Ürün</th>
                  <th className="qty">Miktar</th>
                  {kind === 'fatura' && <th className="num">KDV</th>}
                  <th className="price">Fiyat</th>
                </tr>
              </thead>
              <tbody>
                {o.items.map((i) => {
                  const qty = i.quantity - i.refundedQuantity;
                  return (
                    <tr key={i.id} className={qty === 0 ? 'refunded' : undefined}>
                      <td>
                        <div className="item-name">{i.name}{variantText(i.variantLabel) ? ` - ${variantText(i.variantLabel)}` : ''}</div>
                        <dl className="item-meta">
                          {i.sku && <div><dt>Stok kodu:</dt> <dd>{i.sku}</dd></div>}
                          {variantPairs(i.variantLabel).map(([k, v]) => (
                            <div key={k + v}><dt>{k.toLocaleUpperCase('tr-TR')}:</dt> <dd>{v}</dd></div>
                          ))}
                          {kind === 'fatura' && qty > 1 && <div><dt>Birim:</dt> <dd>{formatMinor(i.unitPriceMinor)}</dd></div>}
                          {i.refundedQuantity > 0 && <div><dt>İade:</dt> <dd>{i.refundedQuantity} adet</dd></div>}
                        </dl>
                      </td>
                      <td className="qty">{qty}</td>
                      {kind === 'fatura' && <td className="num">%{bpsToPercent(i.taxRateBps)}</td>}
                      <td className="price">{formatMinor(i.lineTotalMinor)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="bottom">
              <div className="notes">
                {o.customerNote && (
                  <div className="note-box">
                    <span>Müşteri notu</span>
                    <p>{o.customerNote}</p>
                  </div>
                )}
              </div>
              <table className="totals">
                <tbody>
                  <tr><th>Ara toplam</th><td>{formatMinor(o.totals.itemsSubtotalMinor)}</td></tr>
                  <tr>
                    <th>Gönderim</th>
                    <td>{o.totals.shippingTotalMinor === 0 ? 'Ücretsiz gönderim' : formatMinor(o.totals.shippingTotalMinor)}</td>
                  </tr>
                  {o.totals.surchargeMinor > 0 && <tr><th>Kapıda ödeme bedeli</th><td>{formatMinor(o.totals.surchargeMinor)}</td></tr>}
                  {o.totals.discountTotalMinor > 0 && (
                    <tr><th>İndirim{o.couponCode ? ` (${o.couponCode})` : ''}</th><td>-{formatMinor(o.totals.discountTotalMinor)}</td></tr>
                  )}
                  {kind === 'fatura' && o.totals.taxBreakdown.map((t) => (
                    <tr key={t.rateBps} className="sub"><th>KDV %{bpsToPercent(t.rateBps)} (matrah {formatMinor(t.netMinor)})</th><td>{formatMinor(t.taxMinor)}</td></tr>
                  ))}
                  <tr className="grand">
                    <th>Toplam</th>
                    <td>
                      {formatMinor(o.totals.grandTotalMinor)}
                      {o.totals.taxTotalMinor > 0 && <small> ({formatMinor(o.totals.taxTotalMinor)} KDV dahil)</small>}
                    </td>
                  </tr>
                  {o.totals.refundedTotalMinor > 0 && <tr className="sub"><th>İade edilen</th><td>-{formatMinor(o.totals.refundedTotalMinor)}</td></tr>}
                </tbody>
              </table>
            </div>

            <footer className="foot">
              {kind === 'irsaliye' ? (
                <div className="sign">
                  <span>Paketleyen</span><span>Kontrol eden</span><span>Teslim alan</span>
                </div>
              ) : (
                <p>
                  Bu belge e-Fatura / e-Arşiv yerine geçmez. Cayma hakkı teslimden itibaren 14 gündür.
                  {store.email ? ` İade ve destek: ${store.email}` : ''}
                </p>
              )}
            </footer>
          </section>
        );
      })}
    </div>
  );
}

/** "Hacim: 250 ML / Sertlik: 3" → [["Hacim","250 ML"], ["Sertlik","3"]]. Etiketsiz değerler atlanır. */
function variantPairs(label: string): [string, string][] {
  if (!label) return [];
  return label
    .split(/\s*[/|·]\s*/)
    .map((part) => part.split(/\s*:\s*/))
    .filter((p): p is [string, string] => p.length === 2 && Boolean(p[0]) && Boolean(p[1]));
}

/** Ürün adının yanına yalnız değerler: "250 ML, 3 Sertlik". */
function variantText(label: string): string {
  const pairs = variantPairs(label);
  return pairs.length ? pairs.map(([, v]) => v).join(', ') : label;
}

function Addr({ a }: { a: AdminOrderView['shippingAddress'] }) {
  return (
    <>
      {a.isCorporate && a.companyName && <div><strong>{a.companyName}</strong></div>}
      <div>{a.firstName} {a.lastName}</div>
      <div>{a.addressLine}</div>
      <div>{a.neighborhood ? `${a.neighborhood} Mah., ` : ''}{a.postalCode ? `${a.postalCode} ` : ''}{a.district} {a.city}</div>
      {a.phone && <div>{formatPhoneTR(a.phone)}</div>}
      {a.isCorporate ? <div className="muted">{a.taxOffice} VD · VKN {a.taxNumber}</div> : null}
    </>
  );
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&display=swap');
  html, body { margin: 0; background: #525659; }
  .print-root { font: 12.5px/1.55 'Open Sans', 'Segoe UI', Arial, sans-serif; color: #1a1a1a; padding: 72px 0 32px; }
  .print-root * { box-sizing: border-box; }
  .muted { color: #6b6b6b; }

  .toolbar { position: fixed; inset: 0 0 auto 0; z-index: 10; background: #2b2d30; color: #e8e8e8; box-shadow: 0 2px 10px rgba(0,0,0,.25); }
  .toolbar-inner { max-width: 210mm; margin: 0 auto; padding: 10px 4px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; font-size: 13px; }
  .toolbar-muted { color: #a9abad; }
  .toolbar-actions { display: flex; gap: 8px; align-items: center; }
  .toolbar-link { color: #e8e8e8; text-decoration: none; padding: 7px 12px; border: 1px solid #4a4d51; border-radius: 8px; }
  .toolbar-link:hover { background: #3a3d41; }
  .toolbar button { background: #672779; color: #fff; border: 0; border-radius: 8px; padding: 8px 16px; font: 600 13px/1 inherit; font-family: inherit; cursor: pointer; }
  .toolbar button:hover { background: #7d3193; }

  .sheet { width: 210mm; min-height: 297mm; margin: 0 auto 24px; padding: 18mm 20mm 16mm; background: #fff; box-shadow: 0 4px 18px rgba(0,0,0,.35); display: flex; flex-direction: column; page-break-after: always; break-after: page; }
  .sheet:last-child { page-break-after: auto; break-after: auto; }

  .brand-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; }
  .logo { height: 52px; width: auto; }
  .store { text-align: right; font-size: 11px; color: #555; line-height: 1.5; }
  .store strong { display: block; font-size: 13px; color: #111; }

  .doc-title { font-size: 24px; font-weight: 700; letter-spacing: .01em; margin: 34px 0 20px; }

  .info-row { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 30px; }
  .address { line-height: 1.6; }
  .meta { border-collapse: collapse; align-self: start; }
  .meta td { padding: 1px 0; vertical-align: top; }
  .meta td:first-child { padding-right: 20px; white-space: nowrap; }

  .items { width: 100%; border-collapse: collapse; }
  .items thead th { background: #000; color: #fff; text-align: left; font-weight: 700; padding: 6px 8px; font-size: 12.5px; }
  .items td { padding: 10px 8px 12px; border-bottom: 1px solid #d9d9d9; vertical-align: top; }
  .items .qty { width: 20%; }
  .items .price { width: 20%; white-space: nowrap; }
  .items .num { width: 10%; }
  .items tr.refunded td { color: #999; text-decoration: line-through; }
  .item-name { margin-bottom: 8px; }
  .item-meta { margin: 0; font-size: 10px; line-height: 1.5; }
  .item-meta div { margin: 0 0 3px; }
  .item-meta dt { display: inline; font-weight: 700; }
  .item-meta dd { display: inline; margin: 0; }

  .bottom { display: grid; grid-template-columns: 1fr 40%; gap: 24px; }
  .note-box { margin-top: 16px; border-left: 3px solid #672779; background: #faf7fb; padding: 8px 12px; }
  .note-box span { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: #672779; }
  .note-box p { margin: 2px 0 0; }
  .totals { width: 100%; border-collapse: collapse; }
  .totals th, .totals td { text-align: left; padding: 7px 4px; border-bottom: 1px solid #d9d9d9; vertical-align: top; }
  .totals th { font-weight: 700; width: 50%; }
  .totals tr.sub th, .totals tr.sub td { font-weight: 400; font-size: 11px; color: #555; }
  .totals tr.grand th, .totals tr.grand td { border-top: 2px solid #000; border-bottom: 2px solid #000; font-weight: 700; padding: 9px 4px; }
  .totals small { font-size: 10.5px; font-weight: 700; }

  .foot { margin-top: auto; padding-top: 28px; font-size: 10.5px; color: #666; }
  .sign { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
  .sign span { border-top: 1px solid #bbb; padding-top: 6px; text-align: center; }

  @media print {
    html, body { background: #fff; }
    .print-root { padding: 0; }
    .toolbar { display: none; }
    .sheet { margin: 0; box-shadow: none; min-height: 297mm; }
    @page { size: A4; margin: 0; }
  }
  @media screen and (max-width: 820px) {
    .sheet { width: 100%; min-height: auto; padding: 24px 16px; }
    .info-row, .bottom { grid-template-columns: 1fr; }
  }
`;
