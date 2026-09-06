'use client';

// Müşteri giriş ve kayıt formları.

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogIn, UserPlus } from 'lucide-react';
import { accountApi, CheckoutApiError } from '@/lib/checkout-client';
import { cn } from '@/lib/utils';

const inputCls = (bad?: boolean) =>
  cn(
    'w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-purple-300',
    bad ? 'border-rose-400' : 'border-purple-200 focus:border-purple-400',
  );
const labelCls = 'mb-1.5 block text-xs font-semibold text-purple-800';

/** `next` yalnız site içi yol olabilir; açık yönlendirme engellenir. */
function safeNext(next: string | null | undefined, fallback: string): string {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : fallback;
}

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await accountApi.login(email, password);
      router.replace(safeNext(next, '/hesabim'));
      router.refresh();
    } catch (err) {
      setError(err instanceof CheckoutApiError ? err.message : 'Giriş başarısız');
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="rounded-2xl border border-purple-100 bg-white p-6 sm:p-8">
      <div className="space-y-4">
        <div>
          <label htmlFor="login-email" className={labelCls}>E-posta</label>
          <input id="login-email" type="email" autoComplete="username" className={inputCls(Boolean(error))} value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </div>
        <div>
          <label htmlFor="login-password" className={labelCls}>Parola</label>
          <input id="login-password" type="password" autoComplete="current-password" className={inputCls(Boolean(error))} value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
      </div>
      <p className="mt-3 min-h-5 text-sm text-rose-600" role="alert" aria-live="polite">{error ?? ''}</p>
      <button type="submit" className="btn-primary mt-2 w-full justify-center" disabled={busy || !email || !password}>
        <LogIn size={16} /> {busy ? 'Giriş yapılıyor…' : 'Giriş yap'}
      </button>
      <p className="mt-4 text-center text-sm text-ink-soft">
        Hesabınız yok mu?{' '}
        <Link href={`/kayit${next ? `?next=${encodeURIComponent(next)}` : ''}`} className="link-underline font-semibold text-purple-700">Kayıt olun</Link>
      </p>
    </form>
  );
}

export function RegisterForm({ next, initialEmail }: { next?: string; initialEmail?: string }) {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: initialEmail ?? '',
    password: '',
    marketingOptIn: false,
    kvkkAccepted: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: '' }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.kvkkAccepted) {
      setErrors((x) => ({ ...x, kvkkAccepted: 'KVKK aydınlatma metnini onaylamalısınız' }));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await accountApi.register({ ...form, kvkkAccepted: true });
      router.replace(safeNext(next, '/hesabim'));
      router.refresh();
    } catch (err) {
      if (err instanceof CheckoutApiError) {
        setErrors(err.issues);
        setError(err.message);
      } else setError('Kayıt başarısız');
      setBusy(false);
    }
  };

  const err = (k: string) => (errors[k] ? <p className="mt-1 text-xs text-rose-500">{errors[k]}</p> : null);

  return (
    <form onSubmit={submit} noValidate className="rounded-2xl border border-purple-100 bg-white p-6 sm:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="reg-first" className={labelCls}>Ad</label>
          <input id="reg-first" autoComplete="given-name" className={inputCls(Boolean(errors.firstName))} value={form.firstName} onChange={(e) => set('firstName', e.target.value)} required />
          {err('firstName')}
        </div>
        <div>
          <label htmlFor="reg-last" className={labelCls}>Soyad</label>
          <input id="reg-last" autoComplete="family-name" className={inputCls(Boolean(errors.lastName))} value={form.lastName} onChange={(e) => set('lastName', e.target.value)} required />
          {err('lastName')}
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="reg-email" className={labelCls}>E-posta</label>
          <input id="reg-email" type="email" autoComplete="username" className={inputCls(Boolean(errors.email))} value={form.email} onChange={(e) => set('email', e.target.value)} required />
          {err('email')}
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="reg-password" className={labelCls}>Parola</label>
          <input id="reg-password" type="password" autoComplete="new-password" className={inputCls(Boolean(errors.password))} value={form.password} onChange={(e) => set('password', e.target.value)} required aria-describedby="reg-password-hint" />
          {err('password') ?? <p id="reg-password-hint" className="mt-1 text-xs text-ink-soft">En az 10 karakter, bir harf ve bir rakam.</p>}
        </div>
      </div>

      <div className="mt-4 space-y-2 text-sm">
        <label className="flex gap-2">
          <input type="checkbox" className="mt-0.5" checked={form.kvkkAccepted} onChange={(e) => set('kvkkAccepted', e.target.checked)} />
          <span>
            <Link href="/gizlilik-politikasi#kvkk" className="link-underline font-semibold text-purple-700" target="_blank">KVKK Aydınlatma Metni</Link>&apos;ni okudum. <span className="text-rose-500">*</span>
          </span>
        </label>
        {err('kvkkAccepted')}
        <label className="flex gap-2 text-ink-soft">
          <input type="checkbox" className="mt-0.5" checked={form.marketingOptIn} onChange={(e) => set('marketingOptIn', e.target.checked)} />
          <span>Kampanya ve yeniliklerden e-posta ile haberdar olmak istiyorum. <span className="text-[11px]">(isteğe bağlı)</span></span>
        </label>
      </div>

      <p className="mt-3 min-h-5 text-sm text-rose-600" role="alert" aria-live="polite">{error ?? ''}</p>
      <button type="submit" className="btn-primary mt-2 w-full justify-center" disabled={busy}>
        <UserPlus size={16} /> {busy ? 'Hesap oluşturuluyor…' : 'Hesap oluştur'}
      </button>
      <p className="mt-4 text-center text-sm text-ink-soft">
        Zaten hesabınız var mı?{' '}
        <Link href={`/giris${next ? `?next=${encodeURIComponent(next)}` : ''}`} className="link-underline font-semibold text-purple-700">Giriş yapın</Link>
      </p>
    </form>
  );
}
