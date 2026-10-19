'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck } from 'lucide-react';
import { adminApi, ApiError } from '@/lib/admin/client';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/admin';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await adminApi.login(email, password, remember);
      router.replace(next.startsWith('/admin') ? next : '/admin');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Giriş başarısız');
      setBusy(false);
    }
  };

  const inputBase =
    'h-12 w-full rounded-xl border bg-white pl-11 text-[15px] text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:outline-none focus:ring-4';
  const inputState = error
    ? 'border-red-400 focus:border-red-500 focus:ring-red-500/15'
    : 'border-slate-200 hover:border-slate-300 focus:border-[var(--brand-red)] focus:ring-[rgba(227,27,35,0.14)]';

  return (
    <div className="relative grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* Sol: marka paneli (yalnızca geniş ekranlarda) */}
      <aside className="relative hidden overflow-hidden bg-[var(--brand-night)] text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-[var(--brand-red)] opacity-30 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-40 right-[-6rem] h-[30rem] w-[30rem] rounded-full bg-[var(--brand-gold)] opacity-20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
          }}
        />

        <div className="relative flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--brand-red)] text-lg font-bold shadow-lg shadow-red-900/40">
            M
          </span>
          <span className="text-lg font-semibold tracking-tight">Mixle</span>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-4xl font-semibold leading-tight tracking-tight !text-white">
            Mağazanız,
            <br />
            <span className="text-[var(--brand-gold)]">tek panelden</span> yönetimde.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-white/65">
            Siparişler, ürünler, stok ve müşteriler — hepsi tek bir yerde, güvenle.
          </p>
        </div>

        <p className="relative flex items-center gap-2 text-sm text-white/50">
          <ShieldCheck size={16} aria-hidden="true" />
          Bağlantınız şifreli ve oturumunuz korunuyor.
        </p>
      </aside>

      {/* Sağ: giriş formu */}
      <main className="relative flex items-center justify-center bg-gradient-to-b from-slate-50 to-white px-5 py-12 sm:px-8">
        <div className="w-full max-w-[400px]">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--brand-red)] text-lg font-bold text-white shadow-lg shadow-red-500/30">
              M
            </span>
            <span className="text-lg font-semibold tracking-tight text-[var(--brand-purple-deep)]">
              Mixle
            </span>
          </div>

          <h1 className="text-[28px] font-semibold tracking-tight text-[var(--brand-purple-deep)]">
            Tekrar hoş geldiniz
          </h1>
          <p className="mt-1.5 text-[15px] text-slate-500">
            Mixle Lezzet Sepeti yönetim paneline giriş yapın.
          </p>

          <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="admin-email">
                E-posta
              </label>
              <div className="relative">
                <Mail
                  size={18}
                  aria-hidden="true"
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="admin-email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  placeholder="ornek@mixle.net"
                  className={`${inputBase} ${inputState} pr-4`}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={error ? 'true' : undefined}
                  aria-describedby={error ? 'admin-login-error' : undefined}
                  autoFocus
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="admin-password">
                Parola
              </label>
              <div className="relative">
                <Lock
                  size={18}
                  aria-hidden="true"
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="admin-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={`${inputBase} ${inputState} pr-12`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={error ? 'true' : undefined}
                  aria-describedby={error ? 'admin-login-error' : undefined}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  aria-label={showPassword ? 'Parolayı gizle' : 'Parolayı göster'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <label className="flex cursor-pointer select-none items-center gap-2.5 text-sm text-slate-600">
              <input
                type="checkbox"
                className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-[var(--brand-red)]"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              Beni hatırla (30 gün)
            </label>

            {/* Hata metinle bildirilir; aria-live ile okuyucuya duyurulur. */}
            <p
              id="admin-login-error"
              role="alert"
              aria-live="polite"
              className={
                error
                  ? 'rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700'
                  : 'sr-only'
              }
            >
              {error ?? ''}
            </p>

            <button
              type="submit"
              className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand-red)] text-[15px] font-semibold text-white shadow-lg shadow-red-500/25 transition hover:bg-[#c9151c] hover:shadow-red-500/35 focus:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(227,27,35,0.25)] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
              disabled={busy || email.length === 0 || password.length === 0}
            >
              {busy ? (
                <>
                  <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                  Kontrol ediliyor…
                </>
              ) : (
                <>
                  Giriş yap
                  <ArrowRight
                    size={18}
                    aria-hidden="true"
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                </>
              )}
            </button>
          </form>

          <p className="mt-10 text-center text-xs text-slate-400">
            © {new Date().getFullYear()} Mixle · Tüm hakları saklıdır
          </p>
        </div>
      </main>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-dvh place-items-center p-4 text-slate-500">
          <Loader2 className="animate-spin" aria-label="Yükleniyor" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
