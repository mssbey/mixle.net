'use client';

// Panel > Ayarlar > E-posta: SMTP / Resend gönderim ayarları + test e-postası.

import { useEffect, useState } from 'react';
import { Save, Send } from 'lucide-react';
import { useAdminData } from '@/components/admin/AdminDataProvider';
import { TableSkeleton, Field } from '@/components/admin/primitives';
import { emailSettingsApi, type EmailSettingsView } from '@/lib/admin/settings-client';
import { ApiError } from '@/lib/admin/client';
import { toast } from '@/store/toast';

export function EmailSettingsForm() {
  const { status, can, user } = useAdminData();
  const canWrite = can('ayar:yaz');
  const [s, setS] = useState<EmailSettingsView | null>(null);
  const [meta, setMeta] = useState<{ demoMode: boolean; encryptionConfigured: boolean }>({ demoMode: true, encryptionConfigured: false });
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testTo, setTestTo] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== 'ready') return;
    emailSettingsApi.get()
      .then((r) => { setS(r.settings); setMeta({ demoMode: r.demoMode, encryptionConfigured: r.encryptionConfigured }); setTestTo(user?.email ?? ''); })
      .catch((err) => setError(err instanceof Error ? err.message : 'Ayarlar yüklenemedi'));
  }, [status, user]);

  if (status === 'loading') return <TableSkeleton rows={4} />;
  if (error && !s) return <p className="admin-error">{error}</p>;
  if (!s) return <TableSkeleton rows={4} />;

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await emailSettingsApi.save(s);
      setS(r.settings);
      setMeta({ demoMode: r.demoMode, encryptionConfigured: r.encryptionConfigured });
      toast.success('E-posta ayarları kaydedildi');
    } catch (err) {
      const msg = err instanceof ApiError ? (Object.values(err.issues)[0] ?? err.message) : err instanceof Error ? err.message : 'Kaydedilemedi';
      setError(msg);
      toast.error('Kaydedilemedi', msg);
    } finally {
      setBusy(false);
    }
  };

  const sendTest = async () => {
    setTesting(true);
    try {
      await emailSettingsApi.test(testTo);
      toast.success('Test e-postası gönderildi', testTo);
    } catch (err) {
      toast.error('Test e-postası gönderilemedi', err instanceof ApiError ? err.message : undefined);
    } finally {
      setTesting(false);
    }
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); void save(); }}>
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold text-[var(--brand-purple-deep)]">E-posta</h1>
          <p className="admin-hint mt-0.5">Sipariş/iade bildirimleri için gönderim ayarları</p>
        </div>
        {canWrite && <button type="submit" className="admin-btn admin-btn-primary" disabled={busy}><Save size={14} /> {busy ? 'Kaydediliyor…' : 'Kaydet'}</button>}
      </header>

      {meta.demoMode && (
        <p className="admin-card text-sm" style={{ padding: 12, borderColor: '#f2d597', background: '#fff8e6' }} role="status">
          <strong>Test modu açık (DEMO_MODE=true).</strong> E-postalar gerçekten gönderilmez, panelde kayıt altına alınır.
          Test e-postası düğmesi bu kısıtlamadan bağımsız çalışır — gerçek gönderim dener.
        </p>
      )}
      {!meta.encryptionConfigured && <p className="admin-error" role="alert">ENCRYPTION_KEY tanımlı değil; anahtar kaydedilemez.</p>}
      {error && <p className="admin-error" role="alert">{error}</p>}

      <section className="admin-card" style={{ padding: 16 }}>
        <h2 className="text-sm font-semibold text-[var(--brand-purple-deep)]">Sağlayıcı</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Yöntem" htmlFor="es-provider">
            <select id="es-provider" className="admin-select" disabled={!canWrite} value={s.provider} onChange={(e) => setS({ ...s, provider: e.target.value as EmailSettingsView['provider'] })}>
              <option value="yok">Kapalı</option>
              <option value="resend">Resend</option>
              <option value="smtp">SMTP</option>
            </select>
          </Field>
          <div />
          <Field label="Gönderen adı" htmlFor="es-fname"><input id="es-fname" className="admin-input" disabled={!canWrite} value={s.fromName} onChange={(e) => setS({ ...s, fromName: e.target.value })} /></Field>
          <Field label="Gönderen e-posta" htmlFor="es-femail"><input id="es-femail" type="email" className="admin-input" disabled={!canWrite} value={s.fromEmail} onChange={(e) => setS({ ...s, fromEmail: e.target.value })} /></Field>
          <Field label="Yanıt adresi (opsiyonel)" htmlFor="es-reply"><input id="es-reply" type="email" className="admin-input" disabled={!canWrite} value={s.replyTo} onChange={(e) => setS({ ...s, replyTo: e.target.value })} /></Field>
        </div>
      </section>

      {s.provider === 'resend' && (
        <section className="admin-card" style={{ padding: 16 }}>
          <h2 className="text-sm font-semibold text-[var(--brand-purple-deep)]">Resend</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="API anahtarı" htmlFor="es-resend-key" hint={s.resend.apiKeySet ? 'Kayıtlı (şifreli). Değiştirmek için yeni değeri yazın.' : 'Henüz kaydedilmedi.'}>
              <input id="es-resend-key" type="password" autoComplete="off" className="admin-input" disabled={!canWrite}
                placeholder={s.resend.apiKeySet ? s.resend.apiKey : ''} value={s.resend.apiKey.startsWith('••••') ? '' : s.resend.apiKey}
                onChange={(e) => setS({ ...s, resend: { ...s.resend, apiKey: e.target.value } })} />
            </Field>
          </div>
        </section>
      )}

      {s.provider === 'smtp' && (
        <section className="admin-card" style={{ padding: 16 }}>
          <h2 className="text-sm font-semibold text-[var(--brand-purple-deep)]">SMTP</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Sunucu (host)" htmlFor="es-host"><input id="es-host" className="admin-input" disabled={!canWrite} value={s.smtp.host} onChange={(e) => setS({ ...s, smtp: { ...s.smtp, host: e.target.value } })} /></Field>
            <Field label="Port" htmlFor="es-port"><input id="es-port" type="number" className="admin-input" disabled={!canWrite} value={s.smtp.port} onChange={(e) => setS({ ...s, smtp: { ...s.smtp, port: Number(e.target.value) || 587 } })} /></Field>
            <Field label="Kullanıcı adı" htmlFor="es-user"><input id="es-user" className="admin-input" disabled={!canWrite} value={s.smtp.user} onChange={(e) => setS({ ...s, smtp: { ...s.smtp, user: e.target.value } })} /></Field>
            <Field label="Parola" htmlFor="es-pass" hint={s.smtp.passwordSet ? 'Kayıtlı (şifreli). Değiştirmek için yeni değeri yazın.' : 'Henüz kaydedilmedi.'}>
              <input id="es-pass" type="password" autoComplete="off" className="admin-input" disabled={!canWrite}
                placeholder={s.smtp.passwordSet ? s.smtp.password : ''} value={s.smtp.password.startsWith('••••') ? '' : s.smtp.password}
                onChange={(e) => setS({ ...s, smtp: { ...s.smtp, password: e.target.value } })} />
            </Field>
            <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" disabled={!canWrite} checked={s.smtp.secure} onChange={(e) => setS({ ...s, smtp: { ...s.smtp, secure: e.target.checked } })} /> TLS (genelde 465 portu için)</label>
          </div>
        </section>
      )}

      {canWrite && s.provider !== 'yok' && (
        <section className="admin-card" style={{ padding: 16 }}>
          <h2 className="text-sm font-semibold text-[var(--brand-purple-deep)]">Test e-postası</h2>
          <p className="admin-hint mt-0.5">Kaydetmeden önce göndermeyi deneyebilirsiniz — kaydedilmiş ayarları kullanır.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <input type="email" className="admin-input" style={{ maxWidth: 280 }} value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="ornek@eposta.com" />
            <button type="button" className="admin-btn admin-btn-ghost" disabled={testing || !testTo} onClick={() => void sendTest()}><Send size={14} /> {testing ? 'Gönderiliyor…' : 'Test gönder'}</button>
          </div>
        </section>
      )}
    </form>
  );
}
