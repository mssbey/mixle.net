'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, Star } from 'lucide-react';
import type { AddressView } from '@/server/customers/addresses';
import { accountApi, CheckoutApiError } from '@/lib/checkout-client';
import { AddressForm, emptyAddress, validateAddress, type AddressFormValues } from '@/components/checkout/AddressForm';
import { formatPhoneTR } from '@/lib/validators/phone';
import { toast } from '@/store/toast';
import { cn } from '@/lib/utils';

type Editing = { id: string | null; type: 'teslimat' | 'fatura'; values: AddressFormValues; hasIdentity: boolean };

const toForm = (a: AddressView): AddressFormValues => ({
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

export function AddressBook({ initial }: { initial: AddressView[] }) {
  const [list, setList] = useState(initial);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof AddressFormValues, string>>>({});
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const save = async () => {
    if (!editing) return;
    const r = validateAddress(editing.values);
    if ('errors' in r) {
      setErrors(r.errors);
      return;
    }
    setBusy(true);
    try {
      if (editing.id) {
        const { address } = await accountApi.updateAddress(editing.id, r.data);
        setList((l) => l.map((a) => (a.id === address.id ? address : a)));
        toast.success('Adres güncellendi');
      } else {
        const { address } = await accountApi.createAddress({ ...r.data, type: editing.type });
        setList((l) => [...l, address]);
        toast.success('Adres eklendi');
      }
      setEditing(null);
      setErrors({});
    } catch (err) {
      if (err instanceof CheckoutApiError) {
        setErrors(err.issues as typeof errors);
        toast.error('Kaydedilemedi', err.message);
      }
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    setBusy(true);
    try {
      await accountApi.deleteAddress(id);
      setList((l) => l.filter((a) => a.id !== id));
      toast.success('Adres silindi');
    } catch (err) {
      toast.error('Silinemedi', err instanceof CheckoutApiError ? err.message : undefined);
    } finally {
      setBusy(false);
      setConfirmDelete(null);
    }
  };

  const makeDefault = async (a: AddressView) => {
    try {
      await accountApi.setDefaultAddress(a.id);
      setList((l) => l.map((x) => ({ ...x, isDefault: x.type === a.type ? x.id === a.id : x.isDefault })));
    } catch (err) {
      toast.error('Güncellenemedi', err instanceof CheckoutApiError ? err.message : undefined);
    }
  };

  const groups: { type: 'teslimat' | 'fatura'; label: string }[] = [
    { type: 'teslimat', label: 'Teslimat adresleri' },
    { type: 'fatura', label: 'Fatura adresleri' },
  ];

  return (
    <div className="mt-6 space-y-8">
      {editing && (
        <section className="rounded-2xl border border-purple-200 bg-white p-5" aria-labelledby="addr-edit-h">
          <h2 id="addr-edit-h" className="text-sm font-semibold text-purple-900">
            {editing.id ? 'Adresi düzenle' : editing.type === 'fatura' ? 'Yeni fatura adresi' : 'Yeni teslimat adresi'}
          </h2>
          <div className="mt-4">
            <AddressForm
              values={editing.values}
              onChange={(v) => { setEditing({ ...editing, values: v }); setErrors({}); }}
              errors={errors}
              showTitle
              showInvoiceFields={editing.type === 'fatura' || !editing.values.isCorporate}
              hasStoredIdentity={editing.hasIdentity}
              idPrefix="book"
            />
          </div>
          <div className="mt-4 flex gap-2">
            <button type="button" className="btn-primary" disabled={busy} onClick={save}>{busy ? 'Kaydediliyor…' : 'Kaydet'}</button>
            <button type="button" className="btn-ghost" disabled={busy} onClick={() => { setEditing(null); setErrors({}); }}>Vazgeç</button>
          </div>
        </section>
      )}

      {groups.map((g) => {
        const items = list.filter((a) => a.type === g.type);
        return (
          <section key={g.type} aria-labelledby={`addr-${g.type}`}>
            <div className="flex items-center justify-between">
              <h2 id={`addr-${g.type}`} className="text-sm font-semibold uppercase tracking-[0.12em] text-gold-500">{g.label}</h2>
              <button type="button" className="btn-ghost px-3 py-1.5 text-xs" disabled={Boolean(editing)}
                onClick={() => setEditing({ id: null, type: g.type, values: emptyAddress, hasIdentity: false })}>
                <Plus size={14} /> Ekle
              </button>
            </div>
            {items.length === 0 ? (
              <p className="mt-3 text-sm text-ink-soft">Kayıtlı adres yok.</p>
            ) : (
              <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                {items.map((a) => (
                  <li key={a.id} className={cn('rounded-xl border bg-white p-4 text-sm', a.isDefault ? 'border-purple-400' : 'border-purple-100')}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-purple-900">{a.title}</p>
                      {a.isDefault && <span className="chip text-[10px]">Varsayılan</span>}
                    </div>
                    <address className="mt-1 not-italic leading-6 text-ink-soft">
                      {a.isCorporate ? a.companyName : `${a.firstName} ${a.lastName}`}<br />
                      {a.addressLine}<br />
                      {a.neighborhood && `${a.neighborhood} Mah., `}{a.district} / {a.city}<br />
                      {formatPhoneTR(a.phone)}
                      {a.identityNumberMasked && <><br />TCKN {a.identityNumberMasked}</>}
                      {a.isCorporate && a.taxNumber && <><br />{a.taxOffice} VD · VKN {a.taxNumber}</>}
                    </address>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <button type="button" className="inline-flex items-center gap-1 font-semibold text-purple-700 link-underline" disabled={Boolean(editing)}
                        onClick={() => setEditing({ id: a.id, type: a.type, values: toForm(a), hasIdentity: a.hasIdentityNumber })}>
                        <Pencil size={12} /> Düzenle
                      </button>
                      {!a.isDefault && (
                        <button type="button" className="inline-flex items-center gap-1 font-semibold text-purple-700 link-underline" onClick={() => makeDefault(a)}>
                          <Star size={12} /> Varsayılan yap
                        </button>
                      )}
                      {confirmDelete === a.id ? (
                        <span className="inline-flex items-center gap-2 text-rose-700" role="alert">
                          Silinsin mi?
                          <button type="button" className="font-semibold underline" disabled={busy} onClick={() => remove(a.id)}>Evet</button>
                          <button type="button" className="underline" onClick={() => setConfirmDelete(null)}>Hayır</button>
                        </span>
                      ) : (
                        <button type="button" className="inline-flex items-center gap-1 font-semibold text-rose-600 link-underline" onClick={() => setConfirmDelete(a.id)}>
                          <Trash2 size={12} /> Sil
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
