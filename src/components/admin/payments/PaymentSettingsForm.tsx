'use client';

// Panel > Ayarlar > Ödeme: sağlayıcı seçimi, yöntemler, limitler, anahtarlar (maskeli), havale bilgisi.
// Gizli alanlar sunucuda AES-256-GCM ile şifrelenir; boş/maskeli bırakılan alan değiştirilmez.

import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { useAdminData } from '@/components/admin/AdminDataProvider';
import { TableSkeleton, Field } from '@/components/admin/primitives';
import { paymentsApi, type PaymentSettingsView } from '@/lib/admin/payments-client';
import { PROVIDER_LABELS } from '@/lib/payment-labels';
import { ApiError } from '@/lib/admin/client';
import { minorToInput, parseMajorInput } from '@/lib/money';
import { toast } from '@/store/toast';

const METHOD_LABEL = { kart: 'Kredi / banka kartı', havale: 'Havale / EFT', kapida: 'Kapıda ödeme' } as const;

function MoneyInput({ id, value, onChange, placeholder }: { id: string; value: number | null; onChange: (v: number | null) => void; placeholder?: string }) {
  const [text, setText] = useState(value == null ? '' : minorToInput(value));
  useEffect(() => {
    setText(value == null ? '' : minorToInput(value));
  }, [value]);
  return (
    <input id={id} className="admin-input" inputMode="decimal" placeholder={placeholder ?? 'Sınırsız'} value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        if (!text.trim()) return onChange(null);
        const parsed = parseMajorInput(text);
        if (parsed == null) { setText(value == null ? '' : minorToInput(value)); return; }
        onChange(parsed);
      }} />
  );
}

function SecretInput({ id, label, value, isSet, onChange }: { id: string; label: string; value: string; isSet?: boolean; onChange: (v: string) => void }) {
  return (
    <Field label={label} htmlFor={id} hint={isSet ? 'Kayıtlı (şifreli). Değiştirmek için yeni değeri yazın.' : 'Henüz kaydedilmedi.'}>
      <input id={id} className="admin-input" type="password" autoComplete="off" placeholder={isSet ? value : ''} value={value.startsWith('••••') ? '' : value}
        onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}

export function PaymentSettingsForm() {
  const { status, can } = useAdminData();
  const [settings, setSettings] = useState<PaymentSettingsView | null>(null);
  const [meta, setMeta] = useState<{ demoMode: boolean; encryptionConfigured: boolean }>({ demoMode: true, encryptionConfigured: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const allowed = can('ayar:odeme');

  useEffect(() => {
    if (status !== 'ready' || !allowed) return;
    paymentsApi.getSettings()
      .then((r) => { setSettings(r.settings); setMeta({ demoMode: r.demoMode, encryptionConfigured: r.encryptionConfigured }); })
      .catch((err) => setError(err instanceof Error ? err.message : 'Ayarlar yüklenemedi'));
  }, [status, allowed]);

  if (status === 'loading') return <TableSkeleton rows={4} />;
  if (!allowed) return <p className="admin-error">Ödeme ayarları yalnızca mağaza sahibi tarafından düzenlenebilir.</p>;
  if (error && !settings) return <p className="admin-error">{error}</p>;
  if (!settings) return <TableSkeleton rows={4} />;

  const s = settings;
  const patch = (p: Partial<PaymentSettingsView>) => setSettings({ ...s, ...p });
  const patchSection = <K extends 'iyzico' | 'paytr' | 'stripe' | 'havale'>(k: K, p: Partial<PaymentSettingsView[K]>) => setSettings({ ...s, [k]: { ...s[k], ...p } });

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await paymentsApi.saveSettings(s);
      setSettings(r.settings);
      setMeta({ demoMode: r.demoMode, encryptionConfigured: r.encryptionConfigured });
      toast.success('Ödeme ayarları kaydedildi');
    } catch (err) {
      const msg = err instanceof ApiError ? (Object.values(err.issues)[0] ?? err.message) : err instanceof Error ? err.message : 'Kaydedilemedi';
      setError(msg);
      toast.error('Kaydedilemedi', msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); void save(); }}>
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold text-[var(--brand-purple-deep)]">Ödeme ayarları</h1>
          <p className="admin-hint mt-0.5">Sağlayıcılar, yöntemler, limitler ve havale bilgileri</p>
        </div>
        <button type="submit" className="admin-btn admin-btn-primary" disabled={busy}><Save size={14} /> {busy ? 'Kaydediliyor…' : 'Kaydet'}</button>
      </header>

      {meta.demoMode && (
        <p className="admin-card text-sm" style={{ padding: 12, borderColor: '#f2d597', background: '#fff8e6' }} role="status">
          <strong>Test modu açık (DEMO_MODE=true).</strong> Kart ödemeleri gerçek sağlayıcıya gitmez; mock akışı çalışır. Anahtarlar kaydedilebilir ama canlı ödeme için ortam değişkeninde DEMO_MODE=false gerekir.
        </p>
      )}
      {!meta.encryptionConfigured && (
        <p className="admin-error" role="alert">ENCRYPTION_KEY tanımlı değil. Sağlayıcı anahtarları şifrelenemediği için kaydedilemez; diğer alanlar kaydedilebilir.</p>
      )}
      {error && <p className="admin-error" role="alert">{error}</p>}

      <section className="admin-card" style={{ padding: 16 }}>
        <h2 className="text-sm font-semibold text-[var(--brand-purple-deep)]">Yöntemler</h2>
        <p className="admin-hint mt-0.5">Checkout'ta gösterilecek yöntemler ve tutar sınırları (₺). Boş = sınırsız.</p>
        <div className="mt-3 grid gap-3">
          {s.methods.map((m, i) => (
            <div key={m.id} className="grid items-end gap-2 sm:grid-cols-[1fr_140px_140px]">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={m.enabled} onChange={(e) => { const methods = s.methods.map((x, j) => (j === i ? { ...x, enabled: e.target.checked } : x)); patch({ methods }); }} />
                <strong>{METHOD_LABEL[m.id]}</strong>
              </label>
              <Field label="En az" htmlFor={`lim-${m.id}-min`}>
                <MoneyInput id={`lim-${m.id}-min`} value={s.limits[m.id].minMinor} onChange={(v) => patch({ limits: { ...s.limits, [m.id]: { ...s.limits[m.id], minMinor: v } } })} />
              </Field>
              <Field label="En çok" htmlFor={`lim-${m.id}-max`}>
                <MoneyInput id={`lim-${m.id}-max`} value={s.limits[m.id].maxMinor} onChange={(v) => patch({ limits: { ...s.limits, [m.id]: { ...s.limits[m.id], maxMinor: v } } })} />
              </Field>
            </div>
          ))}
        </div>
      </section>

      <section className="admin-card" style={{ padding: 16 }}>
        <h2 className="text-sm font-semibold text-[var(--brand-purple-deep)]">Kart sağlayıcısı</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Aktif sağlayıcı" htmlFor="cardProvider" hint="DEMO_MODE açıkken her zaman mock kullanılır.">
            <select id="cardProvider" className="admin-select" value={s.cardProvider} onChange={(e) => patch({ cardProvider: e.target.value as PaymentSettingsView['cardProvider'] })}>
              {(['mock', 'iyzico', 'paytr', 'stripe'] as const).map((p) => <option key={p} value={p}>{PROVIDER_LABELS[p]}</option>)}
            </select>
          </Field>
          <label className="flex items-center gap-2 self-end pb-2 text-sm">
            <input type="checkbox" checked={s.require3DS} onChange={(e) => patch({ require3DS: e.target.checked })} /> 3D Secure zorunlu
          </label>
        </div>
      </section>

      <section className="admin-card" style={{ padding: 16 }}>
        <h2 className="text-sm font-semibold text-[var(--brand-purple-deep)]">iyzico</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.iyzico.enabled} onChange={(e) => patchSection('iyzico', { enabled: e.target.checked })} /> Etkin</label>
          <Field label="Ortam" htmlFor="iyzico-mode">
            <select id="iyzico-mode" className="admin-select" value={s.iyzico.mode} onChange={(e) => patchSection('iyzico', { mode: e.target.value as 'test' | 'live' })}>
              <option value="test">Sandbox</option><option value="live">Canlı</option>
            </select>
          </Field>
          <SecretInput id="iyzico-apiKey" label="API Key" value={s.iyzico.apiKey} isSet={s.iyzico.apiKeySet} onChange={(v) => patchSection('iyzico', { apiKey: v })} />
          <SecretInput id="iyzico-secretKey" label="Secret Key" value={s.iyzico.secretKey} isSet={s.iyzico.secretKeySet} onChange={(v) => patchSection('iyzico', { secretKey: v })} />
        </div>
        <p className="admin-hint mt-2">Bildirim adresi: <code>/api/webhooks/payments/iyzico</code> · Dönüş: <code>/api/payments/iyzico/donus</code></p>
      </section>

      <section className="admin-card" style={{ padding: 16 }}>
        <h2 className="text-sm font-semibold text-[var(--brand-purple-deep)]">PayTR</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.paytr.enabled} onChange={(e) => patchSection('paytr', { enabled: e.target.checked })} /> Etkin</label>
          <Field label="Ortam" htmlFor="paytr-mode">
            <select id="paytr-mode" className="admin-select" value={s.paytr.mode} onChange={(e) => patchSection('paytr', { mode: e.target.value as 'test' | 'live' })}>
              <option value="test">Test</option><option value="live">Canlı</option>
            </select>
          </Field>
          <Field label="Mağaza No (merchant_id)" htmlFor="paytr-merchantId">
            <input id="paytr-merchantId" className="admin-input" value={s.paytr.merchantId} onChange={(e) => patchSection('paytr', { merchantId: e.target.value })} />
          </Field>
          <div />
          <SecretInput id="paytr-merchantKey" label="Merchant Key" value={s.paytr.merchantKey} isSet={s.paytr.merchantKeySet} onChange={(v) => patchSection('paytr', { merchantKey: v })} />
          <SecretInput id="paytr-merchantSalt" label="Merchant Salt" value={s.paytr.merchantSalt} isSet={s.paytr.merchantSaltSet} onChange={(v) => patchSection('paytr', { merchantSalt: v })} />
        </div>
        <p className="admin-hint mt-2">Bildirim adresi: <code>/api/webhooks/payments/paytr</code></p>
      </section>

      <section className="admin-card" style={{ padding: 16 }}>
        <h2 className="text-sm font-semibold text-[var(--brand-purple-deep)]">Stripe</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.stripe.enabled} onChange={(e) => patchSection('stripe', { enabled: e.target.checked })} /> Etkin</label>
          <Field label="Ortam" htmlFor="stripe-mode">
            <select id="stripe-mode" className="admin-select" value={s.stripe.mode} onChange={(e) => patchSection('stripe', { mode: e.target.value as 'test' | 'live' })}>
              <option value="test">Test</option><option value="live">Canlı</option>
            </select>
          </Field>
          <Field label="Publishable Key" htmlFor="stripe-pk">
            <input id="stripe-pk" className="admin-input" value={s.stripe.publishableKey} onChange={(e) => patchSection('stripe', { publishableKey: e.target.value })} />
          </Field>
          <div />
          <SecretInput id="stripe-sk" label="Secret Key" value={s.stripe.secretKey} isSet={s.stripe.secretKeySet} onChange={(v) => patchSection('stripe', { secretKey: v })} />
          <SecretInput id="stripe-whsec" label="Webhook Signing Secret" value={s.stripe.webhookSecret} isSet={s.stripe.webhookSecretSet} onChange={(v) => patchSection('stripe', { webhookSecret: v })} />
        </div>
        <p className="admin-hint mt-2">Webhook adresi: <code>/api/webhooks/payments/stripe</code> (checkout.session.completed, charge.refunded)</p>
      </section>

      <section className="admin-card" style={{ padding: 16 }}>
        <h2 className="text-sm font-semibold text-[var(--brand-purple-deep)]">Havale / EFT</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Banka" htmlFor="havale-bank"><input id="havale-bank" className="admin-input" value={s.havale.bankName} onChange={(e) => patchSection('havale', { bankName: e.target.value })} /></Field>
          <Field label="Hesap sahibi" htmlFor="havale-holder"><input id="havale-holder" className="admin-input" value={s.havale.accountHolder} onChange={(e) => patchSection('havale', { accountHolder: e.target.value })} /></Field>
          <Field label="IBAN" htmlFor="havale-iban" className="sm:col-span-2"><input id="havale-iban" className="admin-input" placeholder="TR00 0000 0000 0000 0000 0000 00" value={s.havale.iban} onChange={(e) => patchSection('havale', { iban: e.target.value })} /></Field>
          <Field label="Müşteriye not" htmlFor="havale-note" className="sm:col-span-2"><textarea id="havale-note" className="admin-input" rows={2} value={s.havale.instructions} onChange={(e) => patchSection('havale', { instructions: e.target.value })} /></Field>
        </div>
      </section>
    </form>
  );
}
