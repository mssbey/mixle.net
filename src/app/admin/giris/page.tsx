'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { KeyRound } from 'lucide-react';
import { adminApi, ApiError } from '@/lib/admin/client';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/admin';

  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await adminApi.login(password);
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
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--brand-purple)] text-cream">
            <KeyRound size={18} aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-base font-semibold text-[var(--brand-purple-deep)]">
              Yönetim Paneli
            </h1>
            <p className="admin-hint">Nefis Aroma katalog yönetimi</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="admin-field" noValidate>
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
            aria-describedby={error ? 'admin-password-error' : 'admin-password-hint'}
            autoFocus
            required
          />
          {error ? (
            <p className="admin-error" id="admin-password-error" role="alert">
              {error}
            </p>
          ) : (
            <p className="admin-hint" id="admin-password-hint">
              Bu koruma tek paylaşılan parola kullanır; gerçek kimlik doğrulama değildir.
            </p>
          )}

          <button
            type="submit"
            className="admin-btn admin-btn-primary mt-3"
            disabled={busy || password.length === 0}
          >
            {busy ? 'Kontrol ediliyor…' : 'Giriş yap'}
          </button>
        </form>
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
