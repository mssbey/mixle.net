'use client';

// Müşteri giriş, kayıt, sosyal kayıt tamamlama ve parola sıfırlama formları.

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, Eye, EyeOff, KeyRound, LogIn, Mail, MailCheck, UserPlus } from 'lucide-react';
import { accountApi, CheckoutApiError } from '@/lib/checkout-client';
import { Modal } from '@/components/ui/Modal';
import { LegalText } from '@/components/legal/LegalText';
import { cn } from '@/lib/utils';

const inputCls = (bad?: boolean) =>
  cn(
    'w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-200',
    bad ? 'border-brand-400' : 'border-line focus:border-brand-400',
  );
const labelCls = 'mb-1.5 block text-xs font-semibold text-ink';
const cardCls = 'rounded-lg border border-line bg-white p-6 sm:p-8';

/** `next` yalnız site içi yol olabilir; açık yönlendirme engellenir. */
function safeNext(next: string | null | undefined, fallback: string): string {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : fallback;
}

const withNext = (path: string, next?: string) => (next ? `${path}?next=${encodeURIComponent(next)}` : path);

function FieldError({ text, id }: { text?: string; id?: string }) {
  return text ? (
    <p id={id} className="mt-1 text-xs text-brand-600">
      {text}
    </p>
  ) : null;
}

// ------------------------------------------------------------ sosyal giriş

export type OAuthProviderId = 'google' | 'apple';

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 384 512" width="16" height="16" fill="currentColor" aria-hidden>
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
  );
}

/** Tam sayfa yönlendirme (fetch değil): sağlayıcı ekranı açılır. */
export function SocialButtons({ providers, next }: { providers: OAuthProviderId[]; next?: string }) {
  const [busy, setBusy] = useState<OAuthProviderId | null>(null);
  if (!providers.length) return null;
  const href = (p: OAuthProviderId) => withNext(`/api/hesap/oauth/${p}`, next);
  return (
    <div>
      <div className="grid gap-2.5">
        {providers.includes('google') && (
          <a
            href={href('google')}
            onClick={() => setBusy('google')}
            aria-busy={busy === 'google'}
            className={cn('btn-ghost w-full justify-center !py-2.5', busy && 'pointer-events-none opacity-60')}
          >
            <GoogleIcon /> {busy === 'google' ? 'Google’a yönlendiriliyor…' : 'Google ile devam et'}
          </a>
        )}
        {providers.includes('apple') && (
          <a
            href={href('apple')}
            onClick={() => setBusy('apple')}
            aria-busy={busy === 'apple'}
            className={cn('btn w-full justify-center bg-black !py-2.5 text-white hover:bg-neutral-800', busy && 'pointer-events-none opacity-60')}
          >
            <AppleIcon /> {busy === 'apple' ? 'Apple’a yönlendiriliyor…' : 'Apple ile devam et'}
          </a>
        )}
      </div>
      <div className="my-6 flex items-center gap-3 text-xs text-ink-soft">
        <span className="h-px flex-1 bg-line" />
        veya e-posta ile
        <span className="h-px flex-1 bg-line" />
      </div>
    </div>
  );
}

// ------------------------------------------------------------ parola alanı

function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
  bad,
  describedBy,
  autoFocus,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: 'current-password' | 'new-password';
  bad?: boolean;
  describedBy?: string;
  autoFocus?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? 'text' : 'password'}
        autoComplete={autoComplete}
        className={cn(inputCls(bad), 'pr-11')}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={describedBy}
        autoFocus={autoFocus}
        required
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute inset-y-0 right-0 grid w-11 place-items-center text-ink-soft transition-colors hover:text-ink"
        aria-label={show ? 'Parolayı gizle' : 'Parolayı göster'}
        aria-pressed={show}
      >
        {show ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </div>
  );
}

/** Sunucudaki `passwordProblem` kurallarının canlı göstergesi. */
const PASSWORD_RULES: { label: string; test: (p: string) => boolean }[] = [
  { label: 'En az 10 karakter', test: (p) => p.length >= 10 },
  { label: 'En az bir harf', test: (p) => /[a-zçğıöşü]/i.test(p) },
  { label: 'En az bir rakam', test: (p) => /\d/.test(p) },
];
const passwordOk = (p: string) => PASSWORD_RULES.every((r) => r.test(p));

function PasswordRules({ value, id }: { value: string; id: string }) {
  return (
    <ul id={id} className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
      {PASSWORD_RULES.map((r) => {
        const ok = r.test(value);
        return (
          <li key={r.label} className={cn('flex items-center gap-1 transition-colors', ok ? 'text-emerald-600' : 'text-ink-soft')}>
            <Check size={13} className={ok ? 'opacity-100' : 'opacity-30'} aria-hidden />
            {r.label}
            <span className="sr-only">{ok ? ' — sağlandı' : ' — sağlanmadı'}</span>
          </li>
        );
      })}
    </ul>
  );
}

// ------------------------------------------------------------ sözleşmeler

export interface SignupLegalProps {
  uyelik: { version: number; title: string; body: string };
  kvkk: { version: number; title: string; body: string };
}

interface ConsentState {
  termsAccepted: boolean;
  kvkkAccepted: boolean;
  marketingOptIn: boolean;
}

function Checkbox({ checked, onChange, invalid, children, describedBy }: { checked: boolean; onChange: (v: boolean) => void; invalid?: boolean; children: React.ReactNode; describedBy?: string }) {
  return (
    <label className="flex cursor-pointer gap-2.5 text-sm leading-snug">
      <input
        type="checkbox"
        className={cn('mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-brand-500', invalid && 'outline outline-2 outline-offset-1 outline-brand-400')}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
      />
      <span>{children}</span>
    </label>
  );
}

/**
 * Üyelik Sözleşmesi + KVKK (zorunlu) ve ticari ileti izni (isteğe bağlı).
 * Belge bağlantıları sayfadan çıkmadan pencerede açılır; "Okudum, kabul
 * ediyorum" ilgili kutuyu işaretler.
 */
function LegalConsents({
  legal,
  value,
  onChange,
  errors,
}: {
  legal: SignupLegalProps;
  value: ConsentState;
  onChange: (k: keyof ConsentState, v: boolean) => void;
  errors: Record<string, string>;
}) {
  const [open, setOpen] = useState<'uyelik' | 'kvkk' | null>(null);
  const doc = open ? legal[open] : null;
  const docLink = (k: 'uyelik' | 'kvkk', text: string) => (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        setOpen(k);
      }}
      className="font-semibold text-brand-500 underline decoration-brand-200 underline-offset-2 hover:decoration-brand-500"
    >
      {text}
    </button>
  );

  return (
    <fieldset className="mt-5 space-y-3 rounded-lg border border-line-soft bg-mist/60 p-4">
      <legend className="sr-only">Sözleşmeler ve izinler</legend>
      <div>
        <Checkbox checked={value.termsAccepted} onChange={(v) => onChange('termsAccepted', v)} invalid={Boolean(errors.termsAccepted)} describedBy="consent-terms-err">
          {docLink('uyelik', 'Üyelik Sözleşmesi')}&apos;ni okudum, kabul ediyorum ve 18 yaşından büyük olduğumu beyan ederim.{' '}
          <span className="text-brand-500" aria-hidden>*</span>
        </Checkbox>
        <FieldError id="consent-terms-err" text={errors.termsAccepted} />
      </div>
      <div>
        <Checkbox checked={value.kvkkAccepted} onChange={(v) => onChange('kvkkAccepted', v)} invalid={Boolean(errors.kvkkAccepted)} describedBy="consent-kvkk-err">
          Kişisel verilerimin işlenmesine ilişkin {docLink('kvkk', 'KVKK Aydınlatma Metni')}&apos;ni okudum.{' '}
          <span className="text-brand-500" aria-hidden>*</span>
        </Checkbox>
        <FieldError id="consent-kvkk-err" text={errors.kvkkAccepted} />
      </div>
      <Checkbox checked={value.marketingOptIn} onChange={(v) => onChange('marketingOptIn', v)}>
        <span className="text-ink-soft">
          Kampanya, indirim ve yeniliklerden e-posta ve SMS ile haberdar olmak için ticari elektronik ileti almayı kabul ediyorum.{' '}
          <span className="text-[11px]">(isteğe bağlı)</span>
        </span>
      </Checkbox>

      <Modal open={Boolean(doc)} onClose={() => setOpen(null)} label={doc?.title ?? 'Sözleşme'} className="max-w-2xl" align="top">
        {doc && (
          <div className="flex max-h-[80vh] flex-col">
            <div className="border-b border-line px-6 py-4 pr-14">
              <h2 className="font-display text-lg font-semibold text-purple-900">{doc.title}</h2>
              <p className="text-xs text-ink-soft">Sürüm {doc.version}</p>
            </div>
            <div className="overflow-y-auto px-6 py-5">
              <LegalText body={doc.body} skipTitle />
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-line px-6 py-4 sm:flex-row sm:justify-end">
              <button type="button" className="btn-ghost" onClick={() => setOpen(null)}>
                Kapat
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  onChange(open === 'uyelik' ? 'termsAccepted' : 'kvkkAccepted', true);
                  setOpen(null);
                }}
              >
                <Check size={16} /> {open === 'uyelik' ? 'Okudum, kabul ediyorum' : 'Okudum'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </fieldset>
  );
}

/** Zorunlu onayları istemcide kontrol eder; eksikleri hata olarak döndürür. */
function consentErrors(c: ConsentState): Record<string, string> {
  const e: Record<string, string> = {};
  if (!c.termsAccepted) e.termsAccepted = 'Devam etmek için Üyelik Sözleşmesi’ni kabul etmelisiniz';
  if (!c.kvkkAccepted) e.kvkkAccepted = 'Devam etmek için KVKK Aydınlatma Metni’ni onaylamalısınız';
  return e;
}

// ------------------------------------------------------------ giriş

export function LoginForm({ next, providers = [], initialError }: { next?: string; providers?: OAuthProviderId[]; initialError?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(initialError ?? null);
  // Sosyal giriş hatası (initialError) alanları kırmızıya boyamasın.
  const [fieldsBad, setFieldsBad] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFieldsBad(false);
    try {
      await accountApi.login(email, password);
      router.replace(safeNext(next, '/hesabim'));
      router.refresh();
    } catch (err) {
      setError(err instanceof CheckoutApiError ? err.message : 'Giriş başarısız');
      setFieldsBad(true);
      setBusy(false);
    }
  };

  return (
    <div className={cardCls}>
      <SocialButtons providers={providers} next={next} />
      <form onSubmit={submit} noValidate>
        <div className="space-y-4">
          <div>
            <label htmlFor="login-email" className={labelCls}>E-posta</label>
            <input id="login-email" type="email" inputMode="email" autoComplete="username" className={inputCls(fieldsBad)} value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus={!providers.length} />
          </div>
          <div>
            <div className="mb-1.5 flex items-baseline justify-between">
              <label htmlFor="login-password" className="text-xs font-semibold text-ink">Parola</label>
              <Link href={`/sifremi-unuttum${email ? `?eposta=${encodeURIComponent(email)}` : ''}`} className="text-xs font-medium text-brand-500 hover:underline">
                Parolamı unuttum
              </Link>
            </div>
            <PasswordInput id="login-password" value={password} onChange={setPassword} autoComplete="current-password" bad={fieldsBad} />
          </div>
        </div>
        <p className="mt-3 min-h-5 text-sm text-brand-600" role="alert" aria-live="polite">{error ?? ''}</p>
        <button type="submit" className="btn-primary mt-2 w-full justify-center" disabled={busy || !email || !password}>
          <LogIn size={16} /> {busy ? 'Giriş yapılıyor…' : 'Giriş yap'}
        </button>
      </form>
      <p className="mt-5 border-t border-line-soft pt-5 text-center text-sm text-ink-soft">
        Hesabınız yok mu?{' '}
        <Link href={withNext('/kayit', next)} className="link-underline font-semibold text-brand-500">Hemen üye olun</Link>
      </p>
    </div>
  );
}

// ------------------------------------------------------------ kayıt

export function RegisterForm({
  next,
  initialEmail,
  providers = [],
  legal,
}: {
  next?: string;
  initialEmail?: string;
  providers?: OAuthProviderId[];
  legal: SignupLegalProps;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: initialEmail ?? '',
    password: '',
    marketingOptIn: false,
    kvkkAccepted: false,
    termsAccepted: false,
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
    const local: Record<string, string> = consentErrors(form);
    if (form.firstName.trim().length < 2) local.firstName = 'Adınızı girin';
    if (form.lastName.trim().length < 2) local.lastName = 'Soyadınızı girin';
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) local.email = 'Geçerli bir e-posta girin';
    if (!passwordOk(form.password)) local.password = 'Parola aşağıdaki kuralları sağlamalı';
    if (Object.keys(local).length) {
      setErrors(local);
      setError('Lütfen işaretli alanları kontrol edin.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await accountApi.register(form);
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

  return (
    <div className={cardCls}>
      <SocialButtons providers={providers} next={next} />
      <form onSubmit={submit} noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="reg-first" className={labelCls}>Ad</label>
            <input id="reg-first" autoComplete="given-name" className={inputCls(Boolean(errors.firstName))} value={form.firstName} onChange={(e) => set('firstName', e.target.value)} required aria-invalid={Boolean(errors.firstName) || undefined} />
            <FieldError text={errors.firstName} />
          </div>
          <div>
            <label htmlFor="reg-last" className={labelCls}>Soyad</label>
            <input id="reg-last" autoComplete="family-name" className={inputCls(Boolean(errors.lastName))} value={form.lastName} onChange={(e) => set('lastName', e.target.value)} required aria-invalid={Boolean(errors.lastName) || undefined} />
            <FieldError text={errors.lastName} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="reg-email" className={labelCls}>E-posta</label>
            <input id="reg-email" type="email" inputMode="email" autoComplete="email" className={inputCls(Boolean(errors.email))} value={form.email} onChange={(e) => set('email', e.target.value)} required aria-invalid={Boolean(errors.email) || undefined} />
            {errors.email ? (
              <p className="mt-1 text-xs text-brand-600">
                {errors.email}
                {errors.email === 'Bu e-posta kayıtlı' && (
                  <>
                    {' — '}
                    <Link href={withNext('/giris', next)} className="font-semibold underline">giriş yapın</Link>
                  </>
                )}
              </p>
            ) : (
              <p className="mt-1 text-xs text-ink-soft">Sipariş bilgilendirmeleri bu adrese gönderilir.</p>
            )}
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="reg-password" className={labelCls}>Parola</label>
            <PasswordInput id="reg-password" value={form.password} onChange={(v) => set('password', v)} autoComplete="new-password" bad={Boolean(errors.password)} describedBy="reg-password-rules" />
            <FieldError text={errors.password} />
            <PasswordRules value={form.password} id="reg-password-rules" />
          </div>
        </div>

        <LegalConsents legal={legal} value={form} onChange={(k, v) => set(k, v)} errors={errors} />

        <p className="mt-3 min-h-5 text-sm text-brand-600" role="alert" aria-live="polite">{error ?? ''}</p>
        <button type="submit" className="btn-primary mt-1 w-full justify-center" disabled={busy}>
          <UserPlus size={16} /> {busy ? 'Hesap oluşturuluyor…' : 'Üye ol'}
        </button>
      </form>
      <p className="mt-5 border-t border-line-soft pt-5 text-center text-sm text-ink-soft">
        Zaten üye misiniz?{' '}
        <Link href={withNext('/giris', next)} className="link-underline font-semibold text-brand-500">Giriş yapın</Link>
      </p>
    </div>
  );
}

// ------------------------------------------------------------ sosyal kayıt tamamlama

export function SocialSignupForm({
  provider,
  email,
  initialFirstName,
  initialLastName,
  legal,
}: {
  provider: OAuthProviderId;
  email: string;
  initialFirstName: string;
  initialLastName: string;
  legal: SignupLegalProps;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: initialFirstName,
    lastName: initialLastName,
    marketingOptIn: false,
    kvkkAccepted: false,
    termsAccepted: false,
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
    const local: Record<string, string> = consentErrors(form);
    if (form.firstName.trim().length < 2) local.firstName = 'Adınızı girin';
    if (form.lastName.trim().length < 2) local.lastName = 'Soyadınızı girin';
    if (Object.keys(local).length) {
      setErrors(local);
      setError('Lütfen işaretli alanları kontrol edin.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await accountApi.completeSocialSignup(form);
      router.replace(safeNext(res.next, '/hesabim'));
      router.refresh();
    } catch (err) {
      if (err instanceof CheckoutApiError) {
        setErrors(err.issues);
        setError(err.message);
      } else setError('Hesap oluşturulamadı');
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className={cardCls}>
      <div className="flex items-center gap-3 rounded-lg border border-line-soft bg-mist/60 px-4 py-3">
        <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-full', provider === 'apple' ? 'bg-black text-white' : 'border border-line bg-white')}>
          {provider === 'apple' ? <AppleIcon /> : <GoogleIcon />}
        </span>
        <div className="min-w-0 text-sm">
          <p className="text-ink-soft">{provider === 'apple' ? 'Apple' : 'Google'} hesabınızla devam ediyorsunuz</p>
          <p className="truncate font-semibold text-ink">{email}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="soc-first" className={labelCls}>Ad</label>
          <input id="soc-first" autoComplete="given-name" className={inputCls(Boolean(errors.firstName))} value={form.firstName} onChange={(e) => set('firstName', e.target.value)} required />
          <FieldError text={errors.firstName} />
        </div>
        <div>
          <label htmlFor="soc-last" className={labelCls}>Soyad</label>
          <input id="soc-last" autoComplete="family-name" className={inputCls(Boolean(errors.lastName))} value={form.lastName} onChange={(e) => set('lastName', e.target.value)} required />
          <FieldError text={errors.lastName} />
        </div>
      </div>

      <LegalConsents legal={legal} value={form} onChange={(k, v) => set(k, v)} errors={errors} />

      <p className="mt-3 min-h-5 text-sm text-brand-600" role="alert" aria-live="polite">{error ?? ''}</p>
      <button type="submit" className="btn-primary mt-1 w-full justify-center" disabled={busy}>
        <UserPlus size={16} /> {busy ? 'Hesap oluşturuluyor…' : 'Üyeliği tamamla'}
      </button>
      <p className="mt-4 text-center text-xs text-ink-soft">
        Vazgeçtiyseniz <Link href="/giris" className="font-semibold text-brand-500 hover:underline">giriş sayfasına dönün</Link>; hiçbir bilgi kaydedilmez.
      </p>
    </form>
  );
}

// ------------------------------------------------------------ parola sıfırlama

export function ForgotPasswordForm({ initialEmail }: { initialEmail?: string }) {
  const [email, setEmail] = useState(initialEmail ?? '');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await accountApi.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof CheckoutApiError ? err.message : 'İstek gönderilemedi');
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div className={cn(cardCls, 'text-center')}>
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-50 text-emerald-600">
          <MailCheck size={22} />
        </span>
        <h2 className="mt-4 font-display text-lg font-semibold text-purple-900">E-postanızı kontrol edin</h2>
        <p className="mt-2 text-sm text-ink-soft">
          <strong className="text-ink">{email}</strong> adresiyle kayıtlı bir hesap varsa parola sıfırlama bağlantısı gönderdik. Bağlantı 1 saat geçerlidir. Gelen kutunuzda göremezseniz istenmeyen (spam) klasörüne bakın.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button type="button" className="btn-ghost" onClick={() => setSent(false)}>Tekrar gönder</button>
          <Link href="/giris" className="btn-primary">Girişe dön</Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className={cardCls}>
      <label htmlFor="fp-email" className={labelCls}>E-posta</label>
      <input id="fp-email" type="email" inputMode="email" autoComplete="email" className={inputCls(Boolean(error))} value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
      <p className="mt-3 min-h-5 text-sm text-brand-600" role="alert" aria-live="polite">{error ?? ''}</p>
      <button type="submit" className="btn-primary mt-2 w-full justify-center" disabled={busy || !email}>
        <Mail size={16} /> {busy ? 'Gönderiliyor…' : 'Sıfırlama bağlantısı gönder'}
      </button>
      <p className="mt-5 border-t border-line-soft pt-5 text-center text-sm text-ink-soft">
        Parolanızı hatırladınız mı? <Link href="/giris" className="link-underline font-semibold text-brand-500">Giriş yapın</Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordOk(password)) return setErrors({ password: 'Parola aşağıdaki kuralları sağlamalı' });
    if (password !== confirm) return setErrors({ confirm: 'Parolalar eşleşmiyor' });
    setBusy(true);
    setErrors({});
    setError(null);
    try {
      await accountApi.resetPassword(token, password);
      router.replace('/hesabim');
      router.refresh();
    } catch (err) {
      if (err instanceof CheckoutApiError) {
        setErrors(err.issues);
        setError(err.message);
      } else setError('Parola değiştirilemedi');
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className={cardCls}>
      <div className="space-y-4">
        <div>
          <label htmlFor="rp-password" className={labelCls}>Yeni parola</label>
          <PasswordInput id="rp-password" value={password} onChange={setPassword} autoComplete="new-password" bad={Boolean(errors.password)} describedBy="rp-rules" autoFocus />
          <FieldError text={errors.password} />
          <PasswordRules value={password} id="rp-rules" />
        </div>
        <div>
          <label htmlFor="rp-confirm" className={labelCls}>Yeni parola (tekrar)</label>
          <PasswordInput id="rp-confirm" value={confirm} onChange={setConfirm} autoComplete="new-password" bad={Boolean(errors.confirm)} />
          <FieldError text={errors.confirm} />
        </div>
      </div>
      <p className="mt-3 min-h-5 text-sm text-brand-600" role="alert" aria-live="polite">{error ?? ''}</p>
      <button type="submit" className="btn-primary mt-2 w-full justify-center" disabled={busy || !password || !confirm}>
        <KeyRound size={16} /> {busy ? 'Kaydediliyor…' : 'Parolayı kaydet ve giriş yap'}
      </button>
      <p className="mt-3 text-center text-xs text-ink-soft">Güvenliğiniz için diğer cihazlardaki oturumlarınız kapatılır.</p>
    </form>
  );
}
