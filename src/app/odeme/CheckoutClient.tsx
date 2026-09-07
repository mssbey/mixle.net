'use client';

// Çok adımlı checkout: (1) iletişim (2) adres (3) kargo (4) ödeme (5) özet + onaylar.
//
// İlkeler:
//  - Tutar HİÇBİR ZAMAN istemcide hesaplanmaz; her değişiklikte sunucudan teklif alınır.
//  - Adım geçişlerinde odak başlığa taşınır, hatalar alan altında ve aria-live ile.
//  - Idempotency-Key checkout oturumu başına bir kez üretilir; ağ hatasında
//    yeniden gönderim aynı siparişi döndürür.

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, ShoppingBag, Truck, CreditCard, FileText, User, MapPin } from 'lucide-react';
import { useCart } from '@/store/cart';
import { useMounted, useDebounced } from '@/lib/hooks';
import { formatMinor } from '@/lib/money';
import { fillLegal, legalProductList } from '@/lib/legal-fill';
import { checkoutApi, CheckoutApiError, type QuoteResponse, type CreateOrderRequest } from '@/lib/checkout-client';
import type { PublicCustomer } from '@/server/customers/public';
import type { AddressView } from '@/server/customers/addresses';
import { AddressForm, emptyAddress, validateAddress, type AddressFormValues } from '@/components/checkout/AddressForm';
import { OrderSummary } from '@/components/checkout/OrderSummary';
import { EmptyState } from '@/components/ui/EmptyState';
import { ButtonLink } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface LegalText {
  version: number;
  title: string;
  body: string;
}

interface Props {
  customer: PublicCustomer | null;
  addresses: AddressView[];
  legal: { distanceSales: LegalText; preInfo: LegalText; kvkk: LegalText };
  store: { legalName: string; address: string; phone: string; email: string; tax: string; withdrawalDays: number };
}

const STEPS = [
  { id: 1, label: 'İletişim', icon: User },
  { id: 2, label: 'Adres', icon: MapPin },
  { id: 3, label: 'Kargo', icon: Truck },
  { id: 4, label: 'Ödeme', icon: CreditCard },
  { id: 5, label: 'Onay', icon: FileText },
] as const;

type Consents = { distanceSales: boolean; preInfo: boolean; kvkk: boolean; marketing: boolean };

const viewToForm = (a: AddressView): AddressFormValues => ({
  title: a.title,
  firstName: a.firstName,
  lastName: a.lastName,
  phone: a.phone.replace(/^\+90/, ''),
  city: a.city,
  district: a.district,
  neighborhood: a.neighborhood,
  addressLine: a.addressLine,
  postalCode: a.postalCode,
  isCorporate: a.isCorporate,
  companyName: a.companyName,
  taxOffice: a.taxOffice,
  taxNumber: a.taxNumber,
  identityNumber: '',
});

export function CheckoutClient({ customer, addresses, legal, store }: Props) {
  const router = useRouter();
  const mounted = useMounted();
  const cartLines = useCart((s) => s.lines);
  const cartPromo = useCart((s) => s.promo);
  const clearCart = useCart((s) => s.clear);

  // Manuel useMemo yok: React Compiler türetilmiş değerleri kendisi memoize eder.
  const lines = cartLines.map((l) => ({ variantId: l.variantId, quantity: l.qty }));

  const shippingBook = addresses.filter((a) => a.type === 'teslimat');
  const billingBook = addresses.filter((a) => a.type === 'fatura');

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState(customer?.email ?? '');
  const [emailError, setEmailError] = useState<string | null>(null);

  const [shippingSel, setShippingSel] = useState<string>(shippingBook.find((a) => a.isDefault)?.id ?? shippingBook[0]?.id ?? 'yeni');
  const [shipping, setShipping] = useState<AddressFormValues>(() =>
    customer ? { ...emptyAddress, firstName: customer.firstName, lastName: customer.lastName, phone: (customer.phone ?? '').replace(/^\+90/, '') } : emptyAddress,
  );
  const [shippingErrors, setShippingErrors] = useState<Partial<Record<keyof AddressFormValues, string>>>({});
  const [billingSame, setBillingSame] = useState(true);
  const [billingSel, setBillingSel] = useState<string>(billingBook.find((a) => a.isDefault)?.id ?? 'yeni');
  const [billing, setBilling] = useState<AddressFormValues>(emptyAddress);
  const [billingErrors, setBillingErrors] = useState<Partial<Record<keyof AddressFormValues, string>>>({});

  const [shippingMethodId, setShippingMethodId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'kart' | 'havale' | 'kapida' | ''>('');
  const [couponCode, setCouponCode] = useState<string>(cartPromo ?? '');
  const [installment, setInstallment] = useState(1);
  const [customerNote, setCustomerNote] = useState('');
  const [consents, setConsents] = useState<Consents>({ distanceSales: false, preInfo: false, kvkk: false, marketing: false });
  const [consentError, setConsentError] = useState<string | null>(null);

  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const installmentChoices = quote?.paymentOptions.find((p) => p.id === 'kart')?.installments ?? [];
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Checkout oturumu başına bir kez üretilir; render sırasında ref okumak yasak,
  // o yüzden tembel useState.
  const [idempotencyKey] = useState(() => (typeof crypto !== 'undefined' ? crypto.randomUUID() : ''));

  const headingRef = useRef<HTMLHeadingElement>(null);

  // Etkin teslimat adresi: defterden seçilen veya formdaki.
  const selectedBookAddress = shippingSel !== 'yeni' ? shippingBook.find((x) => x.id === shippingSel) : undefined;
  const activeShipping: AddressFormValues = selectedBookAddress ? viewToForm(selectedBookAddress) : shipping;

  // ---- Teklif: girdiler değişince sunucudan yeniden hesapla (debounce) ----
  const quoteKey = useDebounced(
    JSON.stringify({ lines, city: activeShipping.city, shippingMethodId, paymentMethod, couponCode, email }),
    300,
  );
  useEffect(() => {
    if (!mounted || lines.length === 0) return;
    let alive = true;
    setQuoteLoading(true);
    checkoutApi
      .quote({
        lines,
        city: activeShipping.city || undefined,
        shippingMethodId: shippingMethodId || undefined,
        paymentMethod: paymentMethod || undefined,
        couponCode: couponCode || undefined,
        email: /\S+@\S+\.\S+/.test(email) ? email : undefined,
      })
      .then((q) => {
        if (!alive) return;
        setQuote(q);
        // Sunucu seçili kargoyu geçersiz saydıysa (adres değişti) sıfırla.
        if (shippingMethodId && !q.selectedShippingId) setShippingMethodId('');
        if (paymentMethod && !q.selectedPayment) setPaymentMethod('');
      })
      .catch((err: unknown) => alive && setSubmitError(err instanceof Error ? err.message : 'Teklif alınamadı'))
      .finally(() => alive && setQuoteLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteKey, mounted]);

  // React Compiler otomatik memoize eder; manuel useCallback bağımlılık uyuşmazlığı
  // nedeniyle derleyiciyi devre dışı bırakıyordu.
  const goTo = (next: number) => {
    setStep(next);
    setSubmitError(null);
    requestAnimationFrame(() => headingRef.current?.focus());
  };

  // ---- Adım doğrulamaları ----
  const next = () => {
    if (step === 1) {
      if (!/\S+@\S+\.\S+/.test(email)) {
        setEmailError('Geçerli bir e-posta adresi girin');
        return;
      }
      setEmailError(null);
      goTo(2);
      return;
    }
    if (step === 2) {
      if (shippingSel === 'yeni') {
        const r = validateAddress(shipping);
        if ('errors' in r) {
          setShippingErrors(r.errors);
          return;
        }
        setShippingErrors({});
      }
      if (!billingSame && billingSel === 'yeni') {
        const r = validateAddress(billing);
        if ('errors' in r) {
          setBillingErrors(r.errors);
          return;
        }
        setBillingErrors({});
      }
      goTo(3);
      return;
    }
    if (step === 3) {
      if (!shippingMethodId) {
        setSubmitError('Bir kargo yöntemi seçin.');
        return;
      }
      goTo(4);
      return;
    }
    if (step === 4) {
      if (!paymentMethod || !quote?.selectedPayment) {
        setSubmitError('Bir ödeme yöntemi seçin.');
        return;
      }
      goTo(5);
    }
  };

  const submit = async () => {
    if (!consents.distanceSales || !consents.preInfo || !consents.kvkk) {
      setConsentError('Devam etmek için zorunlu onayları işaretleyin.');
      return;
    }
    setConsentError(null);
    setSubmitting(true);
    setSubmitError(null);

    const body: CreateOrderRequest = {
      lines,
      email,
      billingSameAsShipping: billingSame,
      shippingMethodId,
      paymentMethod: paymentMethod as 'kart' | 'havale' | 'kapida',
      couponCode: couponCode || undefined,
      customerNote: customerNote || undefined,
      installment: paymentMethod === 'kart' ? installment : undefined,
      consents,
    };
    if (shippingSel !== 'yeni') body.shippingAddressId = shippingSel;
    else {
      const r = validateAddress(shipping);
      if ('data' in r) body.shippingAddress = r.data;
    }
    if (!billingSame) {
      if (billingSel !== 'yeni') body.billingAddressId = billingSel;
      else {
        const r = validateAddress(billing);
        if ('data' in r) body.billingAddress = r.data;
      }
    }

    try {
      const result = await checkoutApi.createOrder(body, idempotencyKey);
      if (result.nextUrl) {
        // Kart: mock 3DS sayfası sepeti ödeme onayından sonra temizler.
        router.push(`${result.nextUrl}&d=${encodeURIComponent(result.thankYouUrl)}`);
      } else {
        clearCart();
        router.push(result.thankYouUrl);
      }
    } catch (err) {
      if (err instanceof CheckoutApiError) {
        setSubmitError(err.message);
        if (err.issues.shippingAddress || err.issues.city) goTo(2);
        else if (err.issues.shippingMethodId) goTo(3);
        else if (err.issues.paymentMethod) goTo(4);
        else if (err.code === 'stock' || err.issues.lines) {
          // Stok değişti: teklif tazelensin, kullanıcı görsün.
          setQuote(null);
        }
      } else {
        setSubmitError('Sipariş oluşturulamadı. Lütfen tekrar deneyin.');
      }
      setSubmitting(false);
    }
  };

  const legalVars = (() => {
    const a = activeShipping;
    const t = quote?.totals;
    return {
      saticiUnvan: store.legalName,
      saticiAdres: store.address,
      saticiTelefon: store.phone,
      saticiEposta: store.email,
      saticiVergi: store.tax,
      aliciAd: `${a.firstName} ${a.lastName}`.trim(),
      aliciAdres: [a.addressLine, a.neighborhood, a.district, a.city].filter(Boolean).join(', '),
      aliciEposta: email,
      aliciTelefon: a.phone ? `+90 ${a.phone}` : '',
      siparisNo: '(sipariş onaylanınca atanır)',
      siparisTarihi: new Intl.DateTimeFormat('tr-TR', { dateStyle: 'long', timeZone: 'Europe/Istanbul' }).format(new Date()),
      urunListesi: quote ? legalProductList(quote.lines, formatMinor) : '',
      araToplam: t ? formatMinor(t.itemsSubtotalMinor) : '',
      indirim: t ? formatMinor(t.discountTotalMinor) : '',
      kargoUcreti: t ? (t.shippingTotalMinor === 0 ? 'Ücretsiz' : formatMinor(t.shippingTotalMinor)) : '',
      kdvToplam: t ? formatMinor(t.taxTotalMinor) : '',
      genelToplam: t ? formatMinor(t.grandTotalMinor) : '',
      odemeYontemi: quote?.paymentOptions.find((p) => p.id === paymentMethod)?.label ?? '',
      kargoYontemi: quote?.shippingOptions.find((s) => s.methodId === shippingMethodId)?.name ?? '',
      teslimSuresi: quote?.shippingOptions.find((s) => s.methodId === shippingMethodId)?.estimatedDays ?? '',
      caymaGun: store.withdrawalDays,
    };
  })();

  // ---- Boş sepet ----
  if (mounted && lines.length === 0) {
    return (
      <EmptyState
        icon={ShoppingBag}
        title="Sepetiniz boş"
        description="Ödeme adımına geçmek için sepetinize ürün ekleyin."
        action={<ButtonLink href="/urunler">Aromaları keşfet</ButtonLink>}
        className="mt-8"
      />
    );
  }

  const inputCls = (bad?: boolean) =>
    cn(
      'w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-purple-300',
      bad ? 'border-rose-400' : 'border-purple-200 focus:border-purple-400',
    );

  return (
    <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_380px]">
      <div>
        {/* Adım göstergesi */}
        <ol className="flex flex-wrap gap-2" aria-label="Ödeme adımları">
          {STEPS.map((s) => {
            const Icon = s.icon;
            const done = step > s.id;
            const current = step === s.id;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => done && goTo(s.id)}
                  disabled={!done}
                  aria-current={current ? 'step' : undefined}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                    current && 'border-purple-600 bg-purple-600 text-cream',
                    done && 'border-purple-200 bg-white text-purple-700 hover:bg-purple-50',
                    !current && !done && 'border-purple-100 bg-purple-50/50 text-ink-soft',
                  )}
                >
                  {done ? <Check size={14} /> : <Icon size={14} />}
                  {s.label}
                </button>
              </li>
            );
          })}
        </ol>

        <div className="mt-6 rounded-2xl border border-purple-100 bg-white p-5 sm:p-7">
          <h1 ref={headingRef} tabIndex={-1} className="text-display-sm outline-none">
            {STEPS[step - 1].label}
          </h1>

          {/* ADIM 1 — İletişim */}
          {step === 1 && (
            <div className="mt-5 space-y-4">
              {customer ? (
                <p className="rounded-xl bg-purple-50 p-3 text-sm">
                  <strong>{customer.firstName} {customer.lastName}</strong> olarak giriş yaptınız ({customer.email}).
                </p>
              ) : (
                <p className="text-sm text-ink-soft">
                  Üye olmadan devam edebilirsiniz. Hesabınız varsa{' '}
                  <Link href="/giris?next=/odeme" className="link-underline font-semibold text-purple-700">giriş yapın</Link>;
                  adresleriniz ve sipariş geçmişiniz hazır gelsin.
                </p>
              )}
              <div>
                <label htmlFor="co-email" className="mb-1.5 block text-xs font-semibold text-purple-800">E-posta</label>
                <input id="co-email" type="email" autoComplete="email" className={inputCls(Boolean(emailError))} value={email}
                  disabled={Boolean(customer)} onChange={(e) => { setEmail(e.target.value); setEmailError(null); }}
                  aria-invalid={emailError ? true : undefined} aria-describedby={emailError ? 'co-email-err' : 'co-email-hint'} />
                {emailError ? (
                  <p id="co-email-err" className="mt-1 text-xs text-rose-500">{emailError}</p>
                ) : (
                  <p id="co-email-hint" className="mt-1 text-xs text-ink-soft">Sipariş onayı ve kargo bildirimleri bu adrese gelir.</p>
                )}
              </div>
            </div>
          )}

          {/* ADIM 2 — Adres */}
          {step === 2 && (
            <div className="mt-5 space-y-6">
              <section aria-labelledby="co-ship-h">
                <h2 id="co-ship-h" className="text-sm font-semibold text-purple-900">Teslimat adresi</h2>
                {shippingBook.length > 0 && (
                  <div className="mt-3 grid gap-2">
                    {shippingBook.map((a) => (
                      <label key={a.id} className={cn('flex cursor-pointer gap-3 rounded-xl border p-3 text-sm', shippingSel === a.id ? 'border-purple-500 bg-purple-50/50' : 'border-purple-100')}>
                        <input type="radio" name="co-ship" className="mt-1" checked={shippingSel === a.id} onChange={() => setShippingSel(a.id)} />
                        <span>
                          <strong>{a.title}</strong> — {a.firstName} {a.lastName}<br />
                          <span className="text-ink-soft">{a.addressLine}, {a.district} / {a.city}</span>
                        </span>
                      </label>
                    ))}
                    <label className={cn('flex cursor-pointer gap-3 rounded-xl border p-3 text-sm', shippingSel === 'yeni' ? 'border-purple-500 bg-purple-50/50' : 'border-purple-100')}>
                      <input type="radio" name="co-ship" checked={shippingSel === 'yeni'} onChange={() => setShippingSel('yeni')} />
                      Yeni adres gir
                    </label>
                  </div>
                )}
                {shippingSel === 'yeni' && (
                  <div className="mt-4">
                    <AddressForm values={shipping} onChange={(v) => { setShipping(v); setShippingErrors({}); }} errors={shippingErrors}
                      showInvoiceFields={billingSame} idPrefix="ship" />
                  </div>
                )}
              </section>

              <section aria-labelledby="co-bill-h">
                <h2 id="co-bill-h" className="text-sm font-semibold text-purple-900">Fatura adresi</h2>
                <label className="mt-2 inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={billingSame} onChange={(e) => setBillingSame(e.target.checked)} />
                  Teslimat adresiyle aynı
                </label>
                {!billingSame && (
                  <div className="mt-3 space-y-3">
                    {billingBook.length > 0 && (
                      <div className="grid gap-2">
                        {billingBook.map((a) => (
                          <label key={a.id} className={cn('flex cursor-pointer gap-3 rounded-xl border p-3 text-sm', billingSel === a.id ? 'border-purple-500 bg-purple-50/50' : 'border-purple-100')}>
                            <input type="radio" name="co-bill" className="mt-1" checked={billingSel === a.id} onChange={() => setBillingSel(a.id)} />
                            <span><strong>{a.title}</strong> — {a.isCorporate ? a.companyName : `${a.firstName} ${a.lastName}`}<br /><span className="text-ink-soft">{a.addressLine}, {a.district} / {a.city}</span></span>
                          </label>
                        ))}
                        <label className={cn('flex cursor-pointer gap-3 rounded-xl border p-3 text-sm', billingSel === 'yeni' ? 'border-purple-500 bg-purple-50/50' : 'border-purple-100')}>
                          <input type="radio" name="co-bill" checked={billingSel === 'yeni'} onChange={() => setBillingSel('yeni')} />
                          Yeni fatura adresi gir
                        </label>
                      </div>
                    )}
                    {billingSel === 'yeni' && (
                      <AddressForm values={billing} onChange={(v) => { setBilling(v); setBillingErrors({}); }} errors={billingErrors} showInvoiceFields idPrefix="bill" />
                    )}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* ADIM 3 — Kargo */}
          {step === 3 && (
            <div className="mt-5">
              {!quote?.shippingOptions.length ? (
                <p className="text-sm text-ink-soft">{quoteLoading ? 'Kargo seçenekleri hesaplanıyor…' : 'Bu adres için kargo seçeneği bulunamadı.'}</p>
              ) : (
                <div className="grid gap-2" role="radiogroup" aria-label="Kargo yöntemi">
                  {quote.shippingOptions.map((s) => (
                    <label key={s.methodId} className={cn('flex cursor-pointer items-center gap-3 rounded-xl border p-4 text-sm', shippingMethodId === s.methodId ? 'border-purple-500 bg-purple-50/50' : 'border-purple-100')}>
                      <input type="radio" name="co-shipping" checked={shippingMethodId === s.methodId} onChange={() => { setShippingMethodId(s.methodId); setSubmitError(null); if (s.type !== 'kapıda' && paymentMethod === 'kapida') setPaymentMethod(''); }} />
                      <span className="flex-1">
                        <strong>{s.name}</strong>
                        {s.estimatedDays && <span className="block text-xs text-ink-soft">Tahmini {s.estimatedDays}</span>}
                      </span>
                      <span className="font-semibold">
                        {s.priceMinor === 0 ? <span className="text-emerald-600">Ücretsiz</span> : formatMinor(s.priceMinor)}
                        {s.freeReason === 'eşik' && <span className="block text-[11px] font-normal text-ink-soft">tutar eşiği</span>}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ADIM 4 — Ödeme */}
          {step === 4 && (
            <div className="mt-5 grid gap-2" role="radiogroup" aria-label="Ödeme yöntemi">
              {quote?.paymentOptions.map((p) => (
                <label key={p.id} className={cn('flex gap-3 rounded-xl border p-4 text-sm', p.available ? 'cursor-pointer' : 'cursor-not-allowed opacity-60', paymentMethod === p.id ? 'border-purple-500 bg-purple-50/50' : 'border-purple-100')}>
                  <input type="radio" name="co-payment" className="mt-1" disabled={!p.available} checked={paymentMethod === p.id} onChange={() => { setPaymentMethod(p.id); setSubmitError(null); }} />
                  <span className="flex-1">
                    <strong>{p.label}</strong>
                    {p.testMode && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">Test modu</span>}
                    <span className="block text-xs text-ink-soft">{p.description}</span>
                    {!p.available && p.reason && <span className="block text-xs text-rose-500">{p.reason}</span>}
                  </span>
                  {p.surchargeMinor > 0 && <span className="text-xs font-semibold">+{formatMinor(p.surchargeMinor)}</span>}
                </label>
              ))}
              {paymentMethod === 'kart' && installmentChoices.length > 1 && (
                <fieldset className="mt-1 rounded-xl border border-purple-100 p-3">
                  <legend className="px-1 text-xs font-semibold text-purple-800">Taksit</legend>
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {installmentChoices.map((o) => (
                      <label key={o.count} className={cn('flex cursor-pointer items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm', installment === o.count ? 'border-purple-500 bg-purple-50/50' : 'border-purple-100')}>
                        <span className="flex items-center gap-2">
                          <input type="radio" name="co-installment" checked={installment === o.count} onChange={() => setInstallment(o.count)} />
                          {o.count === 1 ? 'Tek çekim' : `${o.count} taksit`}
                        </span>
                        <span className="text-xs text-ink-soft">
                          {o.count === 1 ? formatMinor(o.totalMinor) : `${o.count} × ${formatMinor(o.perMonthMinor)}${o.interestMinor > 0 ? ` (+${formatMinor(o.interestMinor)} vade farkı)` : ''}`}
                        </span>
                      </label>
                    ))}
                  </div>
                  <p className="mt-2 text-[11px] text-ink-soft">Taksit ve vade farkı bankanıza göre ödeme sayfasında kesinleşir.</p>
                </fieldset>
              )}
            </div>
          )}

          {/* ADIM 5 — Onay */}
          {step === 5 && (
            <div className="mt-5 space-y-5">
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-xl bg-purple-50/60 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gold-500">Teslimat</p>
                  <p className="mt-1"><strong>{activeShipping.firstName} {activeShipping.lastName}</strong><br />{activeShipping.addressLine}<br />{activeShipping.district} / {activeShipping.city}</p>
                  <button type="button" className="mt-1 text-xs font-semibold text-purple-700 link-underline" onClick={() => goTo(2)}>Değiştir</button>
                </div>
                <div className="rounded-xl bg-purple-50/60 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gold-500">Kargo ve ödeme</p>
                  <p className="mt-1">{legalVars.kargoYontemi}<br />{legalVars.odemeYontemi}</p>
                  <button type="button" className="mt-1 text-xs font-semibold text-purple-700 link-underline" onClick={() => goTo(3)}>Değiştir</button>
                </div>
              </div>

              <div>
                <label htmlFor="co-note" className="mb-1.5 block text-xs font-semibold text-purple-800">Sipariş notu <span className="font-normal text-ink-soft">(isteğe bağlı)</span></label>
                <textarea id="co-note" rows={2} maxLength={500} className={inputCls()} value={customerNote} onChange={(e) => setCustomerNote(e.target.value)} />
              </div>

              <LegalAccordion title={`${legal.preInfo.title} (sürüm ${legal.preInfo.version})`} body={fillLegal(legal.preInfo.body, legalVars)} />
              <LegalAccordion title={`${legal.distanceSales.title} (sürüm ${legal.distanceSales.version})`} body={fillLegal(legal.distanceSales.body, legalVars)} />
              <LegalAccordion title={`${legal.kvkk.title} (sürüm ${legal.kvkk.version})`} body={fillLegal(legal.kvkk.body, legalVars)} />

              <fieldset className="space-y-2 text-sm" aria-describedby={consentError ? 'co-consent-err' : undefined}>
                <legend className="sr-only">Onaylar</legend>
                <label className="flex gap-2"><input type="checkbox" className="mt-0.5" checked={consents.preInfo} onChange={(e) => setConsents({ ...consents, preInfo: e.target.checked })} /><span>Ön Bilgilendirme Formu&apos;nu okudum, onaylıyorum. <span className="text-rose-500">*</span></span></label>
                <label className="flex gap-2"><input type="checkbox" className="mt-0.5" checked={consents.distanceSales} onChange={(e) => setConsents({ ...consents, distanceSales: e.target.checked })} /><span>Mesafeli Satış Sözleşmesi&apos;ni okudum, onaylıyorum. <span className="text-rose-500">*</span></span></label>
                <label className="flex gap-2"><input type="checkbox" className="mt-0.5" checked={consents.kvkk} onChange={(e) => setConsents({ ...consents, kvkk: e.target.checked })} /><span>KVKK Aydınlatma Metni&apos;ni okudum. <span className="text-rose-500">*</span></span></label>
                <label className="flex gap-2 text-ink-soft"><input type="checkbox" className="mt-0.5" checked={consents.marketing} onChange={(e) => setConsents({ ...consents, marketing: e.target.checked })} /><span>Kampanya ve yeniliklerden e-posta ile haberdar olmak istiyorum. <span className="text-[11px]">(isteğe bağlı — satın alma şartı değildir)</span></span></label>
                {consentError && <p id="co-consent-err" className="text-xs text-rose-500" role="alert">{consentError}</p>}
              </fieldset>
            </div>
          )}

          {/* Hata + gezinme */}
          <p className="mt-4 min-h-5 text-sm text-rose-600" role="alert" aria-live="polite">{submitError ?? ''}</p>
          {quote?.problems.length ? (
            <ul className="mt-1 space-y-1 text-xs text-amber-700" aria-live="polite">
              {quote.problems.map((p, i) => <li key={i}>• {p}</li>)}
            </ul>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            {step > 1 ? (
              <button type="button" className="btn-ghost" onClick={() => goTo(step - 1)}><ArrowLeft size={16} /> Geri</button>
            ) : (
              <Link href="/sepet" className="btn-ghost"><ArrowLeft size={16} /> Sepete dön</Link>
            )}
            {step < 5 ? (
              <button type="button" className="btn-primary" onClick={next} disabled={quoteLoading && step >= 3}>
                Devam <ArrowRight size={16} />
              </button>
            ) : (
              <button type="button" className="btn-primary" onClick={submit} disabled={submitting || quoteLoading || !quote}>
                {submitting ? 'Sipariş oluşturuluyor…' : `Siparişi tamamla${quote ? ` · ${formatMinor(quote.totals.grandTotalMinor)}` : ''}`}
              </button>
            )}
          </div>
        </div>
      </div>

      <OrderSummary
        quote={quote}
        loading={quoteLoading}
        couponCode={couponCode}
        onCouponChange={setCouponCode}
        couponEnabled={Boolean(activeShipping.city) || step >= 3}
        className="lg:sticky lg:top-24 lg:self-start"
      />
    </div>
  );
}

function LegalAccordion({ title, body }: { title: string; body: string }) {
  return (
    <details className="rounded-xl border border-purple-100">
      <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-purple-900">{title}</summary>
      <pre className="max-h-72 overflow-auto whitespace-pre-wrap border-t border-purple-50 px-4 py-3 font-sans text-xs leading-5 text-ink-soft">{body}</pre>
    </details>
  );
}
