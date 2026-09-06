'use client';

// Manuel / telefon siparişi. Aynı `createOrder` servisini kullanır (source=panel):
// fiyatlar veritabanından, stok rezervasyonu ve numaralandırma vitrinle aynı.
// `?kopya=<siparişId>` ile mevcut siparişin kalemleri ve adresi ön-doldurulur.

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { useAdminData } from '@/components/admin/AdminDataProvider';
import { comboLabel } from '@/lib/admin/variants';
import { ordersApi } from '@/lib/admin/orders-client';
import { ApiError } from '@/lib/admin/client';
import { checkoutApi, type QuoteResponse } from '@/lib/checkout-client';
import { AddressForm, emptyAddress, validateAddress, type AddressFormValues } from '@/components/checkout/AddressForm';
import { Field, SectionCard } from '@/components/admin/primitives';
import { formatMinor } from '@/lib/money';
import { toast } from '@/store/toast';

interface Line {
  variantId: string;
  name: string;
  label: string;
  priceMinor: number;
  quantity: number;
}

export function NewOrderForm({ copyFrom }: { copyFrom?: string }) {
  const router = useRouter();
  const { products } = useAdminData();

  const [email, setEmail] = useState('');
  const [address, setAddress] = useState<AddressFormValues>(emptyAddress);
  const [addrErrors, setAddrErrors] = useState<Partial<Record<keyof AddressFormValues, string>>>({});
  const [lines, setLines] = useState<Line[]>([]);
  const [search, setSearch] = useState('');
  const [shippingMethodId, setShippingMethodId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'havale' | 'kapida' | 'kart'>('havale');
  const [markPaid, setMarkPaid] = useState(false);
  const [source, setSource] = useState<'panel' | 'telefon'>('telefon');
  const [note, setNote] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Kopya: mevcut siparişten kalem + adres.
  useEffect(() => {
    if (!copyFrom) return;
    ordersApi.get(copyFrom).then(({ order }) => {
      setEmail(order.customer.email);
      const a = order.shippingAddress;
      setAddress({
        title: '', firstName: a.firstName ?? '', lastName: a.lastName ?? '', phone: (a.phone ?? '').replace(/^\+90/, ''),
        city: a.city ?? '', district: a.district ?? '', neighborhood: a.neighborhood ?? '', addressLine: a.addressLine ?? '',
        postalCode: a.postalCode ?? '', isCorporate: a.isCorporate ?? false, companyName: a.companyName ?? '',
        taxOffice: a.taxOffice ?? '', taxNumber: a.taxNumber ?? '', identityNumber: '',
      });
      setLines(order.items.filter((i) => i.variantId).map((i) => ({ variantId: i.variantId!, name: i.name, label: i.variantLabel, priceMinor: i.unitPriceMinor, quantity: i.quantity })));
    }).catch(() => toast.error('Kopyalanacak sipariş yüklenemedi'));
  }, [copyFrom]);

  // Teklif: kargo seçenekleri ve toplamlar sunucudan.
  useEffect(() => {
    if (lines.length === 0 || !address.city) {
      setQuote(null);
      return;
    }
    let alive = true;
    checkoutApi
      .quote({ lines: lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })), city: address.city, shippingMethodId: shippingMethodId || undefined, paymentMethod, couponCode: couponCode || undefined, email: /\S+@\S+/.test(email) ? email : undefined })
      .then((q) => {
        if (!alive) return;
        setQuote(q);
        if (!shippingMethodId && q.shippingOptions[0]) setShippingMethodId(q.shippingOptions[0].methodId);
      })
      .catch(() => alive && setQuote(null));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(lines), address.city, shippingMethodId, paymentMethod, couponCode, email]);

  const candidates = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('tr');
    if (q.length < 2) return [];
    const out: { variantId: string; name: string; label: string; priceMinor: number; stock: number }[] = [];
    for (const p of products) {
      if (!p.name.toLocaleLowerCase('tr').includes(q) && !p.variants.some((v) => v.sku.toLocaleLowerCase('tr').includes(q))) continue;
      for (const v of p.variants.filter((v) => v.isActive)) out.push({ variantId: v.id, name: p.name, label: comboLabel(p, v), priceMinor: v.priceMinor, stock: v.stock });
      if (out.length > 30) break;
    }
    return out.slice(0, 30);
  }, [products, search]);

  const submit = async () => {
    setError(null);
    if (!/\S+@\S+\.\S+/.test(email)) { setError('Geçerli bir müşteri e-postası girin.'); return; }
    const r = validateAddress(address);
    if ('errors' in r) { setAddrErrors(r.errors); setError('Adres alanlarını kontrol edin.'); return; }
    if (lines.length === 0) { setError('En az bir ürün ekleyin.'); return; }
    if (!shippingMethodId) { setError('Kargo yöntemi seçin.'); return; }
    setBusy(true);
    try {
      const res = await ordersApi.createManual({
        source,
        markPaid,
        order: {
          lines: lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
          email,
          shippingAddress: r.data,
          billingSameAsShipping: true,
          shippingMethodId,
          paymentMethod,
          couponCode: couponCode || undefined,
          customerNote: note || undefined,
        },
      });
      toast.success(`Sipariş oluşturuldu: ${res.orderNumber}`);
      router.push(`/admin/siparisler/${res.orderId}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Sipariş oluşturulamadı');
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-4">
        <SectionCard title="Müşteri" description="E-posta ile mevcut müşteri eşleşir; yoksa misafir kaydı açılır.">
          <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
            <Field label="E-posta" htmlFor="no-email" required>
              <input id="no-email" type="email" className="admin-input" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label="Kaynak" htmlFor="no-source">
              <select id="no-source" className="admin-select" value={source} onChange={(e) => setSource(e.target.value as 'panel' | 'telefon')}>
                <option value="telefon">Telefon</option>
                <option value="panel">Panel</option>
              </select>
            </Field>
          </div>
        </SectionCard>

        <SectionCard title="Teslimat ve fatura adresi">
          <AddressForm values={address} onChange={(v) => { setAddress(v); setAddrErrors({}); }} errors={addrErrors} showInvoiceFields idPrefix="no" />
        </SectionCard>

        <SectionCard title="Kalemler">
          <Field label="Ürün ara" htmlFor="no-search" hint="Ad veya SKU">
            <input id="no-search" className="admin-input" value={search} onChange={(e) => setSearch(e.target.value)} />
            {candidates.length > 0 && (
              <ul className="mt-1 max-h-48 overflow-y-auto rounded-lg border border-[var(--admin-border)] bg-white text-sm">
                {candidates.map((c) => (
                  <li key={c.variantId}>
                    <button type="button" className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left hover:bg-[#f7f4ef]"
                      onClick={() => {
                        setLines((ls) => {
                          const i = ls.findIndex((l) => l.variantId === c.variantId);
                          if (i >= 0) return ls.map((l, k) => (k === i ? { ...l, quantity: l.quantity + 1 } : l));
                          return [...ls, { variantId: c.variantId, name: c.name, label: c.label, priceMinor: c.priceMinor, quantity: 1 }];
                        });
                        setSearch('');
                      }}>
                      <span>{c.name} <span className="text-xs text-[var(--admin-ink-soft)]">· {c.label}</span></span>
                      <span className="text-xs">{formatMinor(c.priceMinor)} · stok {c.stock} <Plus size={12} className="inline" /></span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Field>
          <div className="admin-table-wrap mt-3">
            <table className="admin-table">
              <thead><tr><th>Ürün</th><th className="r" style={{ width: 90 }}>Adet</th><th className="text-right">Birim</th><th className="text-right">Satır</th><th style={{ width: 40 }} /></tr></thead>
              <tbody>
                {lines.map((l, idx) => (
                  <tr key={l.variantId}>
                    <td>{l.name}<span className="text-xs text-[var(--admin-ink-soft)]"> · {l.label}</span></td>
                    <td><input type="number" min={1} className="admin-input admin-btn-sm" value={l.quantity} aria-label="Adet" onChange={(e) => setLines(lines.map((x, i) => (i === idx ? { ...x, quantity: Math.max(1, Number(e.target.value) || 1) } : x)))} /></td>
                    <td className="text-right">{formatMinor(l.priceMinor)}</td>
                    <td className="text-right">{formatMinor(l.priceMinor * l.quantity)}</td>
                    <td><button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" aria-label="Kaldır" onClick={() => setLines(lines.filter((_, i) => i !== idx))}><Trash2 size={14} /></button></td>
                  </tr>
                ))}
                {lines.length === 0 && <tr><td colSpan={5} className="text-center text-[var(--admin-ink-soft)]">Henüz ürün eklenmedi.</td></tr>}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>

      <div className="flex flex-col gap-4">
        <SectionCard title="Kargo ve ödeme">
          <Field label="Kargo yöntemi" htmlFor="no-ship" hint={!address.city ? 'Önce il seçin' : undefined}>
            <select id="no-ship" className="admin-select" value={shippingMethodId} disabled={!quote} onChange={(e) => setShippingMethodId(e.target.value)}>
              {!quote && <option value="">—</option>}
              {quote?.shippingOptions.map((s) => <option key={s.methodId} value={s.methodId}>{s.name} · {s.priceMinor === 0 ? 'Ücretsiz' : formatMinor(s.priceMinor)}</option>)}
            </select>
          </Field>
          <Field label="Ödeme yöntemi" htmlFor="no-pay" className="mt-3">
            <select id="no-pay" className="admin-select" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as 'havale' | 'kapida' | 'kart')}>
              <option value="havale">Havale / EFT</option>
              <option value="kapida">Kapıda ödeme</option>
              <option value="kart">Kart (test modu)</option>
            </select>
          </Field>
          <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={markPaid} onChange={(e) => setMarkPaid(e.target.checked)} /> Ödeme alındı olarak işaretle (hemen “ödendi”)</label>
          <Field label="Kupon" htmlFor="no-coupon" className="mt-3"><input id="no-coupon" className="admin-input uppercase" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} /></Field>
          <Field label="Sipariş notu" htmlFor="no-note" className="mt-3"><textarea id="no-note" className="admin-textarea" rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        </SectionCard>

        <SectionCard title="Özet">
          {quote ? (
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between"><dt className="text-[var(--admin-ink-soft)]">Ara toplam</dt><dd>{formatMinor(quote.totals.itemsSubtotalMinor)}</dd></div>
              {quote.totals.discountTotalMinor > 0 && <div className="flex justify-between text-[#0f6b3d]"><dt>İndirim</dt><dd>−{formatMinor(quote.totals.discountTotalMinor)}</dd></div>}
              <div className="flex justify-between"><dt className="text-[var(--admin-ink-soft)]">Kargo</dt><dd>{quote.totals.shippingTotalMinor === 0 ? 'Ücretsiz' : formatMinor(quote.totals.shippingTotalMinor)}</dd></div>
              {quote.totals.surchargeMinor > 0 && <div className="flex justify-between"><dt className="text-[var(--admin-ink-soft)]">Kapıda bedeli</dt><dd>{formatMinor(quote.totals.surchargeMinor)}</dd></div>}
              <div className="flex justify-between border-t border-[var(--admin-border)] pt-2 text-base font-bold text-[var(--brand-purple-deep)]"><dt>Toplam</dt><dd>{formatMinor(quote.totals.grandTotalMinor)}</dd></div>
              {quote.coupon && !quote.coupon.ok && <p className="admin-error">{quote.coupon.reason}</p>}
              {quote.problems.map((p, i) => <p key={i} className="admin-error">{p}</p>)}
            </dl>
          ) : (
            <p className="admin-hint">Ürün ve il seçildiğinde toplamlar hesaplanır.</p>
          )}
          {error && <p className="admin-error mt-3" role="alert">{error}</p>}
          <button type="button" className="admin-btn admin-btn-primary mt-4 w-full" disabled={busy || !quote} onClick={submit}>
            {busy ? 'Oluşturuluyor…' : 'Siparişi oluştur'}
          </button>
        </SectionCard>
      </div>
    </div>
  );
}
