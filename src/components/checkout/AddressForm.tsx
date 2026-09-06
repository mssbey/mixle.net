'use client';

// Adres formu — checkout ve hesap adres defteri ortak kullanır.
//
// İl → ilçe → mahalle kademeli seçici: il/ilçe gömülü (14 KB), mahalle ilçe
// seçilince /api/adres/mahalleler'den çekilir. Doğrulama sunucuyla aynı Zod
// şemasıdır (address-schema.ts); hatalar alan altında metinle gösterilir.

import { useEffect, useId, useMemo, useState } from 'react';
import { addressInputSchema, type AddressInput } from '@/server/customers/address-schema';
import { iller, ilceler, ilByName } from '@/data/tr-address';
import { maskPhoneInput } from '@/lib/validators/phone';
import { checkoutApi } from '@/lib/checkout-client';
import { cn } from '@/lib/utils';

export type AddressFormValues = {
  title: string;
  firstName: string;
  lastName: string;
  phone: string;
  city: string;
  district: string;
  neighborhood: string;
  addressLine: string;
  postalCode: string;
  isCorporate: boolean;
  companyName: string;
  taxOffice: string;
  taxNumber: string;
  identityNumber: string;
};

export const emptyAddress: AddressFormValues = {
  title: '',
  firstName: '',
  lastName: '',
  phone: '',
  city: '',
  district: '',
  neighborhood: '',
  addressLine: '',
  postalCode: '',
  isCorporate: false,
  companyName: '',
  taxOffice: '',
  taxNumber: '',
  identityNumber: '',
};

type Errors = Partial<Record<keyof AddressFormValues, string>>;

/** Formu şemayla doğrular; başarılıysa sunucuya gidecek nesneyi döner. */
export function validateAddress(values: AddressFormValues): { data: AddressInput } | { errors: Errors } {
  const parsed = addressInputSchema.safeParse({ ...values, country: 'TR' });
  if (parsed.success) return { data: parsed.data };
  const errors: Errors = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path[0] as keyof AddressFormValues;
    if (key && !errors[key]) errors[key] = issue.message;
  }
  return { errors };
}

interface Props {
  values: AddressFormValues;
  onChange: (next: AddressFormValues) => void;
  errors?: Errors;
  /** Fatura adresinde kurumsal seçenek ve TCKN alanı gösterilir. */
  showInvoiceFields?: boolean;
  /** Adres defterine kaydederken başlık alanı. */
  showTitle?: boolean;
  /** Mevcut kayıtta TCKN var; boş bırakılırsa korunur. */
  hasStoredIdentity?: boolean;
  idPrefix?: string;
  disabled?: boolean;
}

export function AddressForm({
  values,
  onChange,
  errors = {},
  showInvoiceFields = false,
  showTitle = false,
  hasStoredIdentity = false,
  idPrefix,
  disabled,
}: Props) {
  const autoId = useId();
  const p = idPrefix ?? autoId;
  const [mahalleler, setMahalleler] = useState<string[]>([]);
  const [mahalleLoading, setMahalleLoading] = useState(false);

  const il = useMemo(() => ilByName(values.city), [values.city]);
  const ilceList = useMemo(() => (il ? ilceler(il.code) : []), [il]);

  useEffect(() => {
    if (!il || !values.district) {
      setMahalleler([]);
      return;
    }
    let alive = true;
    setMahalleLoading(true);
    checkoutApi
      .neighbourhoods(il.code, values.district)
      .then((r) => alive && setMahalleler(r.mahalleler))
      .catch(() => alive && setMahalleler([]))
      .finally(() => alive && setMahalleLoading(false));
    return () => {
      alive = false;
    };
  }, [il, values.district]);

  const set = <K extends keyof AddressFormValues>(key: K, value: AddressFormValues[K]) =>
    onChange({ ...values, [key]: value });

  const input = (key: keyof AddressFormValues) =>
    cn(
      'w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none transition-colors',
      'focus-visible:ring-2 focus-visible:ring-purple-300 disabled:bg-purple-50/50',
      errors[key] ? 'border-rose-400' : 'border-purple-200 focus:border-purple-400',
    );
  const label = 'mb-1.5 block text-xs font-semibold text-purple-800';
  const err = (key: keyof AddressFormValues) =>
    errors[key] ? (
      <p id={`${p}-${key}-err`} className="mt-1 text-xs text-rose-500">
        {errors[key]}
      </p>
    ) : null;
  const aria = (key: keyof AddressFormValues) => ({
    'aria-invalid': errors[key] ? true : undefined,
    'aria-describedby': errors[key] ? `${p}-${key}-err` : undefined,
  });

  return (
    <div className="grid gap-4">
      {showTitle && (
        <div>
          <label htmlFor={`${p}-title`} className={label}>
            Adres başlığı <span className="font-normal text-ink-soft">(ör. Ev, İş)</span>
          </label>
          <input id={`${p}-title`} className={input('title')} value={values.title} disabled={disabled}
            onChange={(e) => set('title', e.target.value)} {...aria('title')} />
          {err('title')}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${p}-firstName`} className={label}>Ad</label>
          <input id={`${p}-firstName`} className={input('firstName')} value={values.firstName} autoComplete="given-name"
            disabled={disabled} onChange={(e) => set('firstName', e.target.value)} {...aria('firstName')} />
          {err('firstName')}
        </div>
        <div>
          <label htmlFor={`${p}-lastName`} className={label}>Soyad</label>
          <input id={`${p}-lastName`} className={input('lastName')} value={values.lastName} autoComplete="family-name"
            disabled={disabled} onChange={(e) => set('lastName', e.target.value)} {...aria('lastName')} />
          {err('lastName')}
        </div>
      </div>

      <div>
        <label htmlFor={`${p}-phone`} className={label}>Cep telefonu</label>
        <div className="flex">
          <span className="inline-flex items-center rounded-l-lg border border-r-0 border-purple-200 bg-purple-50 px-3 text-sm text-ink-soft">
            +90
          </span>
          <input id={`${p}-phone`} className={cn(input('phone'), 'rounded-l-none')} inputMode="tel" autoComplete="tel-national"
            placeholder="(5XX) XXX XX XX" value={values.phone} disabled={disabled}
            onChange={(e) => set('phone', maskPhoneInput(e.target.value))} {...aria('phone')} />
        </div>
        {err('phone')}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${p}-city`} className={label}>İl</label>
          <select id={`${p}-city`} className={input('city')} value={values.city} disabled={disabled}
            onChange={(e) => onChange({ ...values, city: e.target.value, district: '', neighborhood: '' })} {...aria('city')}>
            <option value="">Seçin</option>
            {iller.map((i) => (
              <option key={i.code} value={i.name}>{i.name}</option>
            ))}
          </select>
          {err('city')}
        </div>
        <div>
          <label htmlFor={`${p}-district`} className={label}>İlçe</label>
          <select id={`${p}-district`} className={input('district')} value={values.district} disabled={disabled || !il}
            onChange={(e) => onChange({ ...values, district: e.target.value, neighborhood: '' })} {...aria('district')}>
            <option value="">{il ? 'Seçin' : 'Önce il seçin'}</option>
            {ilceList.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          {err('district')}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
        <div>
          <label htmlFor={`${p}-neighborhood`} className={label}>
            Mahalle <span className="font-normal text-ink-soft">(isteğe bağlı)</span>
          </label>
          {mahalleler.length > 0 ? (
            <select id={`${p}-neighborhood`} className={input('neighborhood')} value={values.neighborhood} disabled={disabled}
              onChange={(e) => set('neighborhood', e.target.value)}>
              <option value="">Seçin</option>
              {mahalleler.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          ) : (
            <input id={`${p}-neighborhood`} className={input('neighborhood')} value={values.neighborhood} disabled={disabled}
              placeholder={mahalleLoading ? 'Yükleniyor…' : values.district ? 'Mahalle' : 'Önce ilçe seçin'}
              onChange={(e) => set('neighborhood', e.target.value)} />
          )}
        </div>
        <div>
          <label htmlFor={`${p}-postalCode`} className={label}>
            Posta kodu <span className="font-normal text-ink-soft">(isteğe bağlı)</span>
          </label>
          <input id={`${p}-postalCode`} className={input('postalCode')} inputMode="numeric" maxLength={5} value={values.postalCode}
            disabled={disabled} onChange={(e) => set('postalCode', e.target.value.replace(/\D/g, ''))} {...aria('postalCode')} />
          {err('postalCode')}
        </div>
      </div>

      <div>
        <label htmlFor={`${p}-addressLine`} className={label}>Açık adres</label>
        <textarea id={`${p}-addressLine`} className={cn(input('addressLine'), 'min-h-[76px]')} rows={2} autoComplete="street-address"
          placeholder="Sokak, bina no, daire" value={values.addressLine} disabled={disabled}
          onChange={(e) => set('addressLine', e.target.value)} {...aria('addressLine')} />
        {err('addressLine')}
      </div>

      {showInvoiceFields && (
        <fieldset className="rounded-xl border border-purple-100 bg-purple-50/40 p-4">
          <legend className="px-1 text-xs font-semibold text-purple-800">Fatura tipi</legend>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="inline-flex items-center gap-2">
              <input type="radio" name={`${p}-invoice-type`} checked={!values.isCorporate} disabled={disabled}
                onChange={() => set('isCorporate', false)} />
              Bireysel
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="radio" name={`${p}-invoice-type`} checked={values.isCorporate} disabled={disabled}
                onChange={() => set('isCorporate', true)} />
              Kurumsal
            </label>
          </div>

          {values.isCorporate ? (
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor={`${p}-companyName`} className={label}>Firma unvanı</label>
                <input id={`${p}-companyName`} className={input('companyName')} value={values.companyName} disabled={disabled}
                  onChange={(e) => set('companyName', e.target.value)} {...aria('companyName')} />
                {err('companyName')}
              </div>
              <div>
                <label htmlFor={`${p}-taxOffice`} className={label}>Vergi dairesi</label>
                <input id={`${p}-taxOffice`} className={input('taxOffice')} value={values.taxOffice} disabled={disabled}
                  onChange={(e) => set('taxOffice', e.target.value)} {...aria('taxOffice')} />
                {err('taxOffice')}
              </div>
              <div>
                <label htmlFor={`${p}-taxNumber`} className={label}>Vergi numarası (VKN)</label>
                <input id={`${p}-taxNumber`} className={input('taxNumber')} inputMode="numeric" maxLength={10} value={values.taxNumber}
                  disabled={disabled} onChange={(e) => set('taxNumber', e.target.value.replace(/\D/g, ''))} {...aria('taxNumber')} />
                {err('taxNumber')}
              </div>
            </div>
          ) : (
            <div className="mt-3">
              <label htmlFor={`${p}-identityNumber`} className={label}>
                TC Kimlik No <span className="font-normal text-ink-soft">(fatura için, isteğe bağlı)</span>
              </label>
              <input id={`${p}-identityNumber`} className={input('identityNumber')} inputMode="numeric" maxLength={11}
                value={values.identityNumber} disabled={disabled}
                placeholder={hasStoredIdentity ? 'Kayıtlı — değiştirmek için yazın' : ''}
                onChange={(e) => set('identityNumber', e.target.value.replace(/\D/g, ''))} {...aria('identityNumber')} />
              {err('identityNumber')}
              <p className="mt-1 text-xs text-ink-soft">Şifreli saklanır; yalnız fatura düzenlenirken kullanılır.</p>
            </div>
          )}
        </fieldset>
      )}
    </div>
  );
}
