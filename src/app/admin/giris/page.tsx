'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { KeyRound } from 'lucide-react';
import { adminApi, ApiError } from '@/lib/admin/client';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/admin';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

  return (
    <div className="grid min-h-dvh place-items-center p-4">
      <div className="admin-card w-full max-w-sm" style={{ padding: 24 }}>
        <div className="mb-4 flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-500 text-white">
            <KeyRound size={18} aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-base font-semibold text-[var(--brand-purple-deep)]">
              Yönetim Paneli
            </h1>
            <p className="admin-hint">Nefis Aroma mağaza yönetimi</p>
          </div>
        </div>

        <form onSubmit={onSubmit} noValidate>
          <div className="admin-field">
            <label className="admin-label" htmlFor="admin-email">
              E-posta
            </label>
            <input
              id="admin-email"
              name="email"
              type="email"
              autoComplete="username"
              className="admin-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={error ? 'true' : undefined}
              aria-describedby={error ? 'admin-login-error' : undefined}
              autoFocus
              required
            />
          </div>

          <div className="admin-field mt-3">
            <label className="admin-label" htmlFor="admin-password">
              Parola
            </label>
            <input
              id="admin-password"
              name="password"
              type="password"
              autoComplete="current-password"
              className="admin-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={error ? 'true' : undefined}
              aria-describedby={error ? 'admin-login-error' : undefined}
              required
            />
          </div>

          <label className="mt-3 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            Beni hatırla (30 gün)
          </label>

          {/* Hata alanın altında metinle bildirilir; aria-live ile okuyucuya duyurulur. */}
          <p className="admin-error mt-2" id="admin-login-error" role="alert" aria-live="polite">
            {error ?? ''}
          </p>

          <button
            type="submit"
            className="admin-btn admin-btn-primary mt-1"
            disabled={busy || email.length === 0 || password.length === 0}
          >
            {busy ? 'Kontrol ediliyor…' : 'Giriş yap'}
          </button>
        </form>

        <p className="admin-hint mt-4">
          Kullanıcınız yoksa sunucuda{' '}
          <code>npm run admin:create-user</code> komutuyla oluşturun.
        </p>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="grid min-h-dvh place-items-center p-4">Yükleniyor…</div>}>
      <LoginForm />
    </Suspense>
  );
}
