'use client';

// Panel > Ayarlar > Mağaza: fatura bilgileri + genel işletme ayarları.

import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { useAdminData } from '@/components/admin/AdminDataProvider';
import { TableSkeleton, Field } from '@/components/admin/primitives';
import { storeSettingsApi, type StorePayload } from '@/lib/admin/settings-client';
import { ApiError } from '@/lib/admin/client';
import { minorToInput, parseMajorInput, bpsToPercent } from '@/lib/money';
import { toast } from '@/store/toast';

export function StoreSettingsForm() {
  const { status, can } = useAdminData();
  const canWrite = can('ayar:yaz');
  const [data, setData] = useState<StorePayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [taxPercent, setTaxPercent] = useState('20');
  const [shipTaxPercent, setShipTaxPercent] = useState('20');
  const [codSurcharge, setCodSurcharge] = useState('');
  const [codMax, setCodMax] = useState('');

  useEffect(() => {
    if (status !== 'ready') return;
    storeSettingsApi.get()
      .then((r) => {
        setData(r);
        setTaxPercent(String(bpsToPercent(r.settings.defaultTaxRateBps)));
        setShipTaxPercent(String(bpsToPercent(r.settings.shippingTaxRateBps)));
        setCodSurcharge(minorToInput(r.settings.codSurchargeMinor));
        setCodMax(r.settings.codMaxTotalMinor == null ? '' : minorToInput(r.settings.codMaxTotalMinor));
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Ayarlar yüklenemedi'));
  }, [status]);

  if (status === 'loading') return <TableSkeleton rows={4} />;
  if (error && !data) return <p className="admin-error">{error}</p>;
  if (!data) return <TableSkeleton rows={4} />;

  const patchInfo = (p: Partial<StorePayload['info']>) => setData({ ...data, info: { ...data.info, ...p } });
  const patchSettings = (p: Partial<StorePayload['settings']>) => setData({ ...data, settings: { ...data.settings, ...p } });

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const body: StorePayload = {
        info: data.info,
        settings: {
          ...data.settings,
          defaultTaxRateBps: Math.round((Number(taxPercent.replace(',', '.')) || 0) * 100),
          shippingTaxRateBps: Math.round((Number(shipTaxPercent.replace(',', '.')) || 0) * 100),
          codSurchargeMinor: parseMajorInput(codSurcharge) ?? 0,
          codMaxTotalMinor: codMax.trim() ? (parseMajorInput(codMax) ?? null) : null,
        },
      };
      const saved = await storeSettingsApi.save(body);
      setData(saved);
      toast.success('Mağaza ayarları kaydedildi');
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
          <h1 className="text-lg font-semibold text-[var(--brand-purple-deep)]">Mağaza</h1>
          <p className="admin-hint mt-0.5">Fatura bilgileri ve genel işletme ayarları</p>
        </div>
        {canWrite && <button type="submit" className="admin-btn admin-btn-primary" disabled={busy}><Save size={14} /> {busy ? 'Kaydediliyor…' : 'Kaydet'}</button>}
      </header>
      {!canWrite && <p className="admin-hint">Salt görüntüleme modundasınız; düzenlemek için ayar yazma yetkisi gerekir.</p>}
      {error && <p className="admin-error" role="alert">{error}</p>}

      <section className="admin-card" style={{ padding: 16 }}>
        <h2 className="text-sm font-semibold text-[var(--brand-purple-deep)]">Fatura / işletme bilgileri</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Ticari unvan" htmlFor="si-trade"><input id="si-trade" className="admin-input" disabled={!canWrite} value={data.info.tradeName} onChange={(e) => patchInfo({ tradeName: e.target.value })} /></Field>
          <Field label="Yasal unvan" htmlFor="si-legal"><input id="si-legal" className="admin-input" disabled={!canWrite} value={data.info.legalName} onChange={(e) => patchInfo({ legalName: e.target.value })} /></Field>
          <Field label="Adres" htmlFor="si-addr" className="sm:col-span-2"><input id="si-addr" className="admin-input" disabled={!canWrite} value={data.info.address} onChange={(e) => patchInfo({ address: e.target.value })} /></Field>
          <Field label="İl" htmlFor="si-city"><input id="si-city" className="admin-input" disabled={!canWrite} value={data.info.city} onChange={(e) => patchInfo({ city: e.target.value })} /></Field>
          <Field label="Telefon" htmlFor="si-phone"><input id="si-phone" className="admin-input" disabled={!canWrite} value={data.info.phone} onChange={(e) => patchInfo({ phone: e.target.value })} /></Field>
          <Field label="E-posta" htmlFor="si-email"><input id="si-email" type="email" className="admin-input" disabled={!canWrite} value={data.info.email} onChange={(e) => patchInfo({ email: e.target.value })} /></Field>
          <Field label="Sipariş bildirimi gidecek e-posta" htmlFor="si-notify" hint="Boşsa bildirim gitmez."><input id="si-notify" type="email" className="admin-input" disabled={!canWrite} value={data.info.notifyEmail} onChange={(e) => patchInfo({ notifyEmail: e.target.value })} /></Field>
          <Field label="Vergi dairesi" htmlFor="si-vd"><input id="si-vd" className="admin-input" disabled={!canWrite} value={data.info.taxOffice} onChange={(e) => patchInfo({ taxOffice: e.target.value })} /></Field>
          <Field label="Vergi numarası" htmlFor="si-vn"><input id="si-vn" className="admin-input" disabled={!canWrite} value={data.info.taxNumber} onChange={(e) => patchInfo({ taxNumber: e.target.value })} /></Field>
          <Field label="MERSİS no" htmlFor="si-mersis"><input id="si-mersis" className="admin-input" disabled={!canWrite} value={data.info.mersisNo} onChange={(e) => patchInfo({ mersisNo: e.target.value })} /></Field>
        </div>
      </section>

      <section className="admin-card" style={{ padding: 16 }}>
        <h2 className="text-sm font-semibold text-[var(--brand-purple-deep)]">KDV ve genel ayarlar</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" disabled={!canWrite} checked={data.settings.pricesIncludeTax} onChange={(e) => patchSettings({ pricesIncludeTax: e.target.checked })} /> Fiyatlar KDV dahil gösterilir</label>
          <Field label="Varsayılan KDV oranı (%)" htmlFor="si-tax" hint="Üründe override yoksa uygulanır."><input id="si-tax" className="admin-input" disabled={!canWrite} value={taxPercent} onChange={(e) => setTaxPercent(e.target.value)} /></Field>
          <Field label="Kargo KDV oranı (%)" htmlFor="si-stax"><input id="si-stax" className="admin-input" disabled={!canWrite} value={shipTaxPercent} onChange={(e) => setShipTaxPercent(e.target.value)} /></Field>
          <Field label="Cayma hakkı süresi (gün)" htmlFor="si-wd"><input id="si-wd" type="number" min={0} className="admin-input" disabled={!canWrite} value={data.settings.withdrawalDays} onChange={(e) => patchSettings({ withdrawalDays: Number(e.target.value) || 0 })} /></Field>
          <Field label="Stok rezervasyon süresi (dk)" htmlFor="si-res" hint="Ödeme tamamlanmazsa stok bu süre sonunda serbest kalır."><input id="si-res" type="number" min={5} max={120} className="admin-input" disabled={!canWrite} value={data.settings.reservationMinutes} onChange={(e) => patchSettings({ reservationMinutes: Number(e.target.value) || 30 })} /></Field>
          <Field label="Düşük stok eşiği" htmlFor="si-low" hint="Panel &gt; Stok raporunda kullanılır."><input id="si-low" type="number" min={0} className="admin-input" disabled={!canWrite} value={data.settings.lowStockThreshold} onChange={(e) => patchSettings({ lowStockThreshold: Number(e.target.value) || 0 })} /></Field>
        </div>
      </section>

      <section className="admin-card" style={{ padding: 16 }}>
        <h2 className="text-sm font-semibold text-[var(--brand-purple-deep)]">Kapıda ödeme</h2>
        <p className="admin-hint mt-0.5">Ayrıca Ayarlar → Ödeme → Kapıda ödeme limitleri de uygulanır.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Hizmet bedeli" htmlFor="si-cod-fee"><input id="si-cod-fee" className="admin-input" disabled={!canWrite} value={codSurcharge} onChange={(e) => setCodSurcharge(e.target.value)} placeholder="0,00" /></Field>
          <Field label="Üst tutar sınırı" htmlFor="si-cod-max"><input id="si-cod-max" className="admin-input" disabled={!canWrite} value={codMax} onChange={(e) => setCodMax(e.target.value)} placeholder="Sınırsız" /></Field>
        </div>
      </section>
    </form>
  );
}
