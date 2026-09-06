'use client';

import { useState } from 'react';
import type { PublicCustomer } from '@/server/customers/public';
import { accountApi, CheckoutApiError } from '@/lib/checkout-client';
import { maskPhoneInput } from '@/lib/validators/phone';
import { toast } from '@/store/toast';
import { cn } from '@/lib/utils';

const inputCls = (bad?: boolean) =>
  cn(
    'w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-purple-300',
    bad ? 'border-rose-400' : 'border-purple-200 focus:border-purple-400',
  );
const labelCls = 'mb-1.5 block text-xs font-semibold text-purple-800';

export function ProfileForm({ initial }: { initial: PublicCustomer }) {
  const [profile, setProfile] = useState({
    firstName: initial.firstName,
    lastName: initial.lastName,
    phone: (initial.phone ?? '').replace(/^\+90/, ''),
    marketingOptIn: initial.marketingOptIn,
  });
  const [pw, setPw] = useState({ currentPassword: '', password: '', confirm: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<'profile' | 'password' | null>(null);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy('profile');
    setErrors({});
    try {
      await accountApi.updateProfile(profile);
      toast.success('Bilgileriniz güncellendi');
    } catch (err) {
      if (err instanceof CheckoutApiError) {
        setErrors(err.issues);
        toast.error('Kaydedilemedi', err.message);
      }
    } finally {
      setBusy(null);
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.password !== pw.confirm) {
      setErrors({ confirm: 'Parolalar eşleşmiyor' });
      return;
    }
    setBusy('password');
    setErrors({});
    try {
      await accountApi.updateProfile({ currentPassword: pw.currentPassword, password: pw.password });
      toast.success('Parolanız değiştirildi', 'Diğer cihazlardaki oturumlar kapatıldı.');
      setPw({ currentPassword: '', password: '', confirm: '' });
    } catch (err) {
      if (err instanceof CheckoutApiError) {
        setErrors(err.issues);
        toast.error('Değiştirilemedi', err.message);
      }
    } finally {
      setBusy(null);
    }
  };

  const err = (k: string) => (errors[k] ? <p className="mt-1 text-xs text-rose-500">{errors[k]}</p> : null);

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <form onSubmit={saveProfile} noValidate className="rounded-2xl border border-purple-100 bg-white p-5">
        <h2 className="text-sm font-semibold text-purple-900">Kişisel bilgiler</h2>
        <div className="mt-4 grid gap-4">
          <div>
            <label htmlFor="pf-email" className={labelCls}>E-posta</label>
            <input id="pf-email" className={cn(inputCls(), 'bg-purple-50/50')} value={initial.email} disabled />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="pf-first" className={labelCls}>Ad</label>
              <input id="pf-first" className={inputCls(Boolean(errors.firstName))} value={profile.firstName} onChange={(e) => setProfile({ ...profile, firstName: e.target.value })} />
              {err('firstName')}
            </div>
            <div>
              <label htmlFor="pf-last" className={labelCls}>Soyad</label>
              <input id="pf-last" className={inputCls(Boolean(errors.lastName))} value={profile.lastName} onChange={(e) => setProfile({ ...profile, lastName: e.target.value })} />
              {err('lastName')}
            </div>
          </div>
          <div>
            <label htmlFor="pf-phone" className={labelCls}>Cep telefonu</label>
            <div className="flex">
              <span className="inline-flex items-center rounded-l-lg border border-r-0 border-purple-200 bg-purple-50 px-3 text-sm text-ink-soft">+90</span>
              <input id="pf-phone" className={cn(inputCls(Boolean(errors.phone)), 'rounded-l-none')} inputMode="tel" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: maskPhoneInput(e.target.value) })} />
            </div>
            {err('phone')}
          </div>
          <label className="flex gap-2 text-sm text-ink-soft">
            <input type="checkbox" className="mt-0.5" checked={profile.marketingOptIn} onChange={(e) => setProfile({ ...profile, marketingOptIn: e.target.checked })} />
            <span>Kampanya ve yeniliklerden e-posta ile haberdar olmak istiyorum. <span className="text-[11px]">İstediğiniz zaman geri çekebilirsiniz.</span></span>
          </label>
        </div>
        <button type="submit" className="btn-primary mt-5" disabled={busy !== null}>{busy === 'profile' ? 'Kaydediliyor…' : 'Kaydet'}</button>
      </form>

      <form onSubmit={savePassword} noValidate className="rounded-2xl border border-purple-100 bg-white p-5">
        <h2 className="text-sm font-semibold text-purple-900">Parola değiştir</h2>
        <div className="mt-4 grid gap-4">
          <div>
            <label htmlFor="pw-current" className={labelCls}>Mevcut parola</label>
            <input id="pw-current" type="password" autoComplete="current-password" className={inputCls(Boolean(errors.currentPassword))} value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} />
            {err('currentPassword')}
          </div>
          <div>
            <label htmlFor="pw-new" className={labelCls}>Yeni parola</label>
            <input id="pw-new" type="password" autoComplete="new-password" className={inputCls(Boolean(errors.password))} value={pw.password} onChange={(e) => setPw({ ...pw, password: e.target.value })} aria-describedby="pw-hint" />
            {err('password') ?? <p id="pw-hint" className="mt-1 text-xs text-ink-soft">En az 10 karakter, bir harf ve bir rakam.</p>}
          </div>
          <div>
            <label htmlFor="pw-confirm" className={labelCls}>Yeni parola (tekrar)</label>
            <input id="pw-confirm" type="password" autoComplete="new-password" className={inputCls(Boolean(errors.confirm))} value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
            {err('confirm')}
          </div>
        </div>
        <button type="submit" className="btn-primary mt-5" disabled={busy !== null || !pw.currentPassword || !pw.password}>{busy === 'password' ? 'Değiştiriliyor…' : 'Parolayı değiştir'}</button>
      </form>
    </div>
  );
}
