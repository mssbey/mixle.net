'use client';

// Panel > Ayarlar > Kargo: bölge (il eşleşmesi) ve tarife (yöntem) yönetimi.
// Checkout bu verileri `server/shipping/zones.ts` üzerinden okur.

import { useEffect, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { TableSkeleton, Field } from '@/components/admin/primitives';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { useAdminData } from '@/components/admin/AdminDataProvider';
import { zonesApi, type AdminShippingMethod, type AdminShippingZone, type RateTier } from '@/lib/admin/shipping-client';
import { ApiError } from '@/lib/admin/client';
import { minorToInput, parseMajorInput } from '@/lib/money';
import { CARRIERS, carrierLabels } from '@/server/shipping/carriers';
import { toast } from '@/store/toast';

const METHOD_TYPES: { id: AdminShippingMethod['type']; label: string }[] = [
  { id: 'sabit', label: 'Sabit ücret' },
  { id: 'desi', label: 'Desiye göre kademeli' },
  { id: 'tutara-göre', label: 'Sepet tutarına göre kademeli' },
  { id: 'ücretsiz', label: 'Her zaman ücretsiz' },
  { id: 'kapıda', label: 'Kapıda ödeme' },
];

function MoneyInput({ value, onChange, placeholder }: { value: number | null; onChange: (v: number | null) => void; placeholder?: string }) {
  const [text, setText] = useState(value == null ? '' : minorToInput(value));
  useEffect(() => {
    setText(value == null ? '' : minorToInput(value));
  }, [value]);
  return (
    <input className="admin-input admin-btn-sm" style={{ width: 100 }} inputMode="decimal" placeholder={placeholder ?? '0'} value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        if (!text.trim()) return onChange(null);
        const parsed = parseMajorInput(text);
        if (parsed == null) { setText(value == null ? '' : minorToInput(value)); return; }
        onChange(parsed);
      }} />
  );
}

function TiersEditor({ tiers, onChange }: { tiers: RateTier[]; onChange: (t: RateTier[]) => void }) {
  return (
    <div className="mt-2 flex flex-col gap-1.5 rounded-lg border border-[var(--admin-border)] p-2">
      <p className="admin-hint">Kademeler (üst sınır dahil, ilk eşleşen uygulanır; son satır "sınırsız" için üst sınırı boş bırakın)</p>
      {tiers.map((t, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <input className="admin-input admin-btn-sm" style={{ width: 90 }} type="number" min={0} placeholder="Sınırsız"
            value={t.upTo ?? ''} onChange={(e) => onChange(tiers.map((x, j) => (j === i ? { ...x, upTo: e.target.value === '' ? null : Number(e.target.value) } : x)))} />
          <span className="text-[var(--admin-ink-soft)]">→</span>
          <MoneyInput value={t.priceMinor} onChange={(v) => onChange(tiers.map((x, j) => (j === i ? { ...x, priceMinor: v ?? 0 } : x)))} />
          <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => onChange(tiers.filter((_, j) => j !== i))} aria-label="Kademeyi sil"><Trash2 size={12} /></button>
        </div>
      ))}
      <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm self-start" onClick={() => onChange([...tiers, { upTo: null, priceMinor: 0 }])}><Plus size={12} /> Kademe ekle</button>
    </div>
  );
}

function MethodRow({ method, canWrite, onSaved, onDeleted }: { method: AdminShippingMethod; canWrite: boolean; onSaved: (m: AdminShippingMethod) => void; onDeleted: () => void }) {
  const [m, setM] = useState(method);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const dirty = JSON.stringify(m) !== JSON.stringify(method);
  const showTiers = m.type === 'desi' || m.type === 'tutara-göre';

  const save = async () => {
    setBusy(true);
    try {
      const { method: saved } = await zonesApi.updateMethod(m.id, {
        name: m.name, type: m.type, priceMinor: m.priceMinor, freeOverMinor: m.freeOverMinor,
        tiers: showTiers ? m.tiers : null, estimatedDays: m.estimatedDays, carrier: m.carrier, isActive: m.isActive,
      });
      setM(saved);
      onSaved(saved);
      toast.success('Yöntem kaydedildi');
    } catch (err) {
      toast.error('Kaydedilemedi', err instanceof ApiError ? (Object.values(err.issues)[0] ?? err.message) : err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setConfirmDelete(false);
    setBusy(true);
    try {
      await zonesApi.deleteMethod(m.id);
      onDeleted();
      toast.success('Yöntem silindi');
    } catch (err) {
      toast.error('Silinemedi', err instanceof Error ? err.message : undefined);
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border border-[var(--admin-border)] p-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <input className="admin-input admin-btn-sm" style={{ width: 160 }} value={m.name} disabled={!canWrite} onChange={(e) => setM({ ...m, name: e.target.value })} aria-label="Yöntem adı" />
        <select className="admin-select admin-btn-sm" style={{ width: 'auto' }} disabled={!canWrite} value={m.type} onChange={(e) => setM({ ...m, type: e.target.value as AdminShippingMethod['type'] })}>
          {METHOD_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        {m.type !== 'ücretsiz' && !showTiers && <MoneyInput value={m.priceMinor} onChange={(v) => setM({ ...m, priceMinor: v ?? 0 })} />}
        <label className="flex items-center gap-1 text-xs text-[var(--admin-ink-soft)]">Ücretsiz eşik <MoneyInput value={m.freeOverMinor} onChange={(v) => setM({ ...m, freeOverMinor: v })} /></label>
        <input className="admin-input admin-btn-sm" style={{ width: 110 }} placeholder="1-3 iş günü" disabled={!canWrite} value={m.estimatedDays} onChange={(e) => setM({ ...m, estimatedDays: e.target.value })} aria-label="Tahmini süre" />
        <select className="admin-select admin-btn-sm" style={{ width: 'auto' }} disabled={!canWrite} value={m.carrier ?? ''} onChange={(e) => setM({ ...m, carrier: e.target.value || null })} aria-label="Kargo firması">
          <option value="">Firma seçilmedi</option>
          {CARRIERS.map((c) => <option key={c} value={c}>{carrierLabels[c]}</option>)}
        </select>
        <label className="flex items-center gap-1 text-xs"><input type="checkbox" disabled={!canWrite} checked={m.isActive} onChange={(e) => setM({ ...m, isActive: e.target.checked })} /> Aktif</label>
        {canWrite && (
          <div className="ml-auto flex items-center gap-1">
            {dirty && <button type="button" className="admin-btn admin-btn-primary admin-btn-sm" disabled={busy} onClick={() => void save()}><Save size={12} /> Kaydet</button>}
            <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" disabled={busy} onClick={() => setConfirmDelete(true)} aria-label="Yöntemi sil"><Trash2 size={12} /></button>
          </div>
        )}
      </div>
      {showTiers && <TiersEditor tiers={m.tiers ?? []} onChange={(tiers) => setM({ ...m, tiers })} />}
      <ConfirmDialog open={confirmDelete} title="Yöntemi sil?" description={`"${m.name}" kalıcı olarak silinecek.`} confirmLabel="Sil" destructive onConfirm={() => void remove()} onCancel={() => setConfirmDelete(false)} />
    </div>
  );
}

function ZoneCard({ zone, canWrite, onChanged }: { zone: AdminShippingZone; canWrite: boolean; onChanged: () => void }) {
  const [name, setName] = useState(zone.name);
  const [countries, setCountries] = useState(zone.countries.join(', '));
  const [cities, setCities] = useState(zone.cities.join(', '));
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [addingMethod, setAddingMethod] = useState(false);
  const dirty = name !== zone.name || countries !== zone.countries.join(', ') || cities !== zone.cities.join(', ');

  const saveZone = async () => {
    setBusy(true);
    try {
      await zonesApi.updateZone(zone.id, {
        name,
        countries: countries.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean),
        cities: cities.split(',').map((s) => s.trim()).filter(Boolean),
      });
      onChanged();
      toast.success('Bölge kaydedildi');
    } catch (err) {
      toast.error('Kaydedilemedi', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const removeZone = async () => {
    setConfirmDelete(false);
    setBusy(true);
    try {
      await zonesApi.deleteZone(zone.id);
      onChanged();
      toast.success('Bölge silindi');
    } catch (err) {
      toast.error('Silinemedi', err instanceof Error ? err.message : undefined);
      setBusy(false);
    }
  };

  const addMethod = async (data: { name: string }) => {
    setBusy(true);
    try {
      await zonesApi.createMethod(zone.id, {
        name: data.name, type: 'sabit', priceMinor: 0, freeOverMinor: null, tiers: null, estimatedDays: '1-3 iş günü', carrier: null, isActive: true,
      });
      setAddingMethod(false);
      onChanged();
    } catch (err) {
      toast.error('Yöntem eklenemedi', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="admin-card" style={{ padding: 16 }}>
      <div className="flex flex-wrap items-end gap-2">
        <Field label="Bölge adı" htmlFor={`z-name-${zone.id}`}><input id={`z-name-${zone.id}`} className="admin-input admin-btn-sm" disabled={!canWrite} value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Ülkeler (ISO, virgülle)" htmlFor={`z-c-${zone.id}`}><input id={`z-c-${zone.id}`} className="admin-input admin-btn-sm" style={{ width: 120 }} disabled={!canWrite} value={countries} onChange={(e) => setCountries(e.target.value)} /></Field>
        <Field label="İller (virgülle, boş = tümü)" htmlFor={`z-ci-${zone.id}`} className="flex-1"><input id={`z-ci-${zone.id}`} className="admin-input admin-btn-sm" disabled={!canWrite} value={cities} onChange={(e) => setCities(e.target.value)} /></Field>
        {canWrite && (
          <div className="flex items-center gap-1 pb-0.5">
            {dirty && <button type="button" className="admin-btn admin-btn-primary admin-btn-sm" disabled={busy} onClick={() => void saveZone()}><Save size={12} /> Kaydet</button>}
            <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" disabled={busy} onClick={() => setConfirmDelete(true)} aria-label="Bölgeyi sil"><Trash2 size={12} /></button>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {zone.methods.length === 0 && <p className="admin-hint">Bu bölgede henüz kargo yöntemi yok.</p>}
        {zone.methods.map((m) => (
          <MethodRow key={m.id} method={m} canWrite={canWrite} onSaved={onChanged} onDeleted={onChanged} />
        ))}
        {canWrite && (
          addingMethod ? (
            <AddMethodInline onAdd={addMethod} onCancel={() => setAddingMethod(false)} busy={busy} />
          ) : (
            <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm self-start" onClick={() => setAddingMethod(true)}><Plus size={12} /> Yöntem ekle</button>
          )
        )}
      </div>

      <ConfirmDialog open={confirmDelete} title="Bölgeyi sil?" description={`"${zone.name}" ve içindeki tüm yöntemler kalıcı olarak silinecek.`} confirmLabel="Sil" destructive onConfirm={() => void removeZone()} onCancel={() => setConfirmDelete(false)} />
    </section>
  );
}

function AddMethodInline({ onAdd, onCancel, busy }: { onAdd: (d: { name: string }) => void; onCancel: () => void; busy: boolean }) {
  const [name, setName] = useState('');
  return (
    <div className="flex items-center gap-2">
      <input className="admin-input admin-btn-sm" placeholder="Yöntem adı" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      <button type="button" className="admin-btn admin-btn-primary admin-btn-sm" disabled={busy || !name.trim()} onClick={() => onAdd({ name: name.trim() })}>Ekle</button>
      <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={onCancel}>Vazgeç</button>
    </div>
  );
}

export function ZoneManager() {
  const { status, can } = useAdminData();
  const canWrite = can('ayar:yaz');
  const [zones, setZones] = useState<AdminShippingZone[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addingZone, setAddingZone] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = () => {
    zonesApi.list().then((r) => setZones(r.zones)).catch((err) => setError(err instanceof Error ? err.message : 'Yüklenemedi'));
  };

  useEffect(() => {
    if (status === 'ready') load();
  }, [status]);

  if (status === 'loading' || (!zones && !error)) return <TableSkeleton rows={3} />;
  if (error) return <p className="admin-error">{error}</p>;

  const addZone = async (name: string) => {
    setBusy(true);
    try {
      await zonesApi.createZone({ name, countries: ['TR'], cities: [] });
      setAddingZone(false);
      load();
    } catch (err) {
      toast.error('Bölge eklenemedi', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-[var(--brand-purple-deep)]">Bölgeler ve tarifeler</h2>
          <p className="admin-hint mt-0.5">Checkout, teslimat iline göre ilk eşleşen bölgeyi kullanır.</p>
        </div>
        {canWrite && !addingZone && <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => setAddingZone(true)}><Plus size={14} /> Bölge ekle</button>}
      </header>
      {addingZone && <AddZoneInline onAdd={addZone} onCancel={() => setAddingZone(false)} busy={busy} />}
      {(zones ?? []).map((z) => <ZoneCard key={z.id} zone={z} canWrite={canWrite} onChanged={load} />)}
    </div>
  );
}

function AddZoneInline({ onAdd, onCancel, busy }: { onAdd: (name: string) => void; onCancel: () => void; busy: boolean }) {
  const [name, setName] = useState('');
  return (
    <div className="admin-card flex items-center gap-2" style={{ padding: 10 }}>
      <input className="admin-input admin-btn-sm" placeholder="Bölge adı (ör. Ege Bölgesi)" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      <button type="button" className="admin-btn admin-btn-primary admin-btn-sm" disabled={busy || !name.trim()} onClick={() => onAdd(name.trim())}>Ekle</button>
      <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={onCancel}>Vazgeç</button>
    </div>
  );
}
