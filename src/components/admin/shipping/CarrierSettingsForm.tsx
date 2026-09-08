'use client';

// Panel > Ayarlar > Kargo: taşıyıcı bağlantıları (şifreli, maskeli) + kapıda
// ödeme kısıtları. Taşıyıcı API'leri bu sürümde uygulanmadı (bkz.
// `server/shipping/adapters/*`) — anahtarlar ileride gerçek entegrasyon
// eklendiğinde kullanılmak üzere burada saklanır; bugün paneldeki tek etkisi
// "Bağlı" rozetidir.

import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { useAdminData } from '@/components/admin/AdminDataProvider';
import { TableSkeleton, Field } from '@/components/admin/primitives';
import { kargoSettingsApi, type CarrierSettingsView, type KargoSettingsResponse } from '@/lib/admin/shipping-client';
import { ApiError } from '@/lib/admin/client';
import { minorToInput, parseMajorInput } from '@/lib/money';
import { carrierLabels } from '@/server/shipping/carriers';
import { toast } from '@/store/toast';

const NAMED: { id: keyof KargoSettingsResponse['providers']; needsCustomerCode?: boolean }[] = [
  { id: 'yurtici' },
  { id: 'aras' },
  { id: 'mng', needsCustomerCode: true },
  { id: 'surat' },
  { id: 'ptt' },
];

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

export function CarrierSettingsForm() {
  const { status, can } = useAdminData();
  const [data, setData] = useState<KargoSettingsResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const allowed = can('ayar:yaz');

  useEffect(() => {
    if (status !== 'ready') return;
    kargoSettingsApi.get()
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Ayarlar yüklenemedi'));
  }, [status]);

  if (status === 'loading') return <TableSkeleton rows={4} />;
  if (error && !data) return <p className="admin-error">{error}</p>;
  if (!data) return <TableSkeleton rows={4} />;

  const patchCarrier = (id: keyof KargoSettingsResponse['providers'], p: Partial<CarrierSettingsView>) =>
    setData({ ...data, providers: { ...data.providers, [id]: { ...data.providers[id], ...p } } });

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const next = await kargoSettingsApi.save(data);
      setData(next);
      toast.success('Kargo ayarları kaydedildi');
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
          <h2 className="text-sm font-semibold text-[var(--brand-purple-deep)]">Taşıyıcı bağlantıları ve kapıda ödeme</h2>
          <p className="admin-hint mt-0.5">Anahtar girilmese de takip numarası panelden elle yönetilebilir.</p>
        </div>
        {allowed && <button type="submit" className="admin-btn admin-btn-primary" disabled={busy}><Save size={14} /> {busy ? 'Kaydediliyor…' : 'Kaydet'}</button>}
      </header>

      {!data.encryptionConfigured && (
        <p className="admin-error" role="alert">ENCRYPTION_KEY tanımlı değil. Taşıyıcı anahtarları şifrelenemediği için kaydedilemez; kapıda ödeme kısıtları yine de kaydedilebilir.</p>
      )}
      {error && <p className="admin-error" role="alert">{error}</p>}
      {!allowed && <p className="admin-hint">Bu sayfayı düzenlemek için ayar yazma yetkisi gerekiyor; salt görüntüleme modundasınız.</p>}

      <section className="admin-card" style={{ padding: 16 }}>
        <h3 className="text-sm font-semibold text-[var(--brand-purple-deep)]">Kapıda ödeme</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Hizmet bedeli" htmlFor="cod-surcharge" hint="Kapıda ödeme seçildiğinde sepete eklenen ek ücret.">
            <MoneyInput id="cod-surcharge" value={data.cod.codSurchargeMinor} onChange={(v) => setData({ ...data, cod: { ...data.cod, codSurchargeMinor: v ?? 0 } })} placeholder="0" />
          </Field>
          <Field label="Üst tutar sınırı" htmlFor="cod-max" hint="Bu tutarın üzerindeki siparişlerde kapıda ödeme kapanır. Ayrıca Ayarlar → Ödeme → Kapıda ödeme limitleri de uygulanır.">
            <MoneyInput id="cod-max" value={data.cod.codMaxTotalMinor} onChange={(v) => setData({ ...data, cod: { ...data.cod, codMaxTotalMinor: v } })} />
          </Field>
        </div>
      </section>

      {NAMED.map(({ id, needsCustomerCode }) => {
        const c = data.providers[id];
        return (
          <section key={id} className="admin-card" style={{ padding: 16 }}>
            <h3 className="text-sm font-semibold text-[var(--brand-purple-deep)]">{carrierLabels[id]}</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={c.enabled} onChange={(e) => patchCarrier(id, { enabled: e.target.checked })} /> Etkin</label>
              {needsCustomerCode && (
                <Field label="Müşteri / bayi kodu" htmlFor={`${id}-code`}>
                  <input id={`${id}-code`} className="admin-input" value={c.customerCode} onChange={(e) => patchCarrier(id, { customerCode: e.target.value })} />
                </Field>
              )}
              <SecretInput id={`${id}-key`} label="API anahtarı" value={c.apiKey} isSet={c.apiKeySet} onChange={(v) => patchCarrier(id, { apiKey: v })} />
              <SecretInput id={`${id}-secret`} label="API parolası / sırrı" value={c.apiSecret} isSet={c.apiSecretSet} onChange={(v) => patchCarrier(id, { apiSecret: v })} />
            </div>
            <p className="admin-hint mt-2">Bu sürümde gerçek taşıyıcı API çağrısı uygulanmadı; anahtarlar ileride otomatik etiket/takip için hazır tutulur.</p>
          </section>
        );
      })}
    </form>
  );
}
