'use client';

import { useState } from 'react';
import type { AdminOrderView } from '@/server/orders/admin-view';
import { AddressForm, validateAddress, type AddressFormValues } from '@/components/checkout/AddressForm';
import { ordersApi } from '@/lib/admin/orders-client';
import { ApiError } from '@/lib/admin/client';
import { toast } from '@/store/toast';
import { Dialog } from './Dialog';

interface Props {
  order: AdminOrderView;
  kind: 'shipping' | 'billing';
  open: boolean;
  onClose: () => void;
  onUpdated: (o: AdminOrderView) => void;
}

export function AddressDialog({ order, kind, open, onClose, onUpdated }: Props) {
  const src = kind === 'shipping' ? order.shippingAddress : order.billingAddress;
  const [values, setValues] = useState<AddressFormValues>({
    title: src.title ?? '',
    firstName: src.firstName ?? '',
    lastName: src.lastName ?? '',
    phone: (src.phone ?? '').replace(/^\+90/, ''),
    city: src.city ?? '',
    district: src.district ?? '',
    neighborhood: src.neighborhood ?? '',
    addressLine: src.addressLine ?? '',
    postalCode: src.postalCode ?? '',
    isCorporate: src.isCorporate ?? false,
    companyName: src.companyName ?? '',
    taxOffice: src.taxOffice ?? '',
    taxNumber: src.taxNumber ?? '',
    identityNumber: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof AddressFormValues, string>>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const r = validateAddress(values);
    if ('errors' in r) {
      setErrors(r.errors);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await ordersApi.updateMeta(order.id, kind === 'shipping' ? { shippingAddress: r.data } : { billingAddress: r.data });
      onUpdated(res.order);
      toast.success('Adres güncellendi');
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Güncellenemedi');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title={kind === 'shipping' ? 'Teslimat adresini düzenle' : 'Fatura adresini düzenle'} wide
      footer={<>
        <button type="button" className="admin-btn admin-btn-ghost" onClick={onClose} disabled={busy}>Vazgeç</button>
        <button type="button" className="admin-btn admin-btn-primary" onClick={submit} disabled={busy}>{busy ? 'Kaydediliyor…' : 'Kaydet'}</button>
      </>}>
      <AddressForm values={values} onChange={(v) => { setValues(v); setErrors({}); }} errors={errors} showInvoiceFields={kind === 'billing'} idPrefix={`adm-${kind}`} />
      {error && <p className="admin-error mt-2" role="alert">{error}</p>}
    </Dialog>
  );
}
