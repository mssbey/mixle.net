'use client';

// Panel > Sayfalar: SSS ve ana sayfa kampanya bandı metni.

import { useEffect, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { useAdminData } from '@/components/admin/AdminDataProvider';
import { TableSkeleton, Field } from '@/components/admin/primitives';
import { pagesApi, type CampaignContent, type FaqContent, type FaqGroup } from '@/lib/admin/pages-client';
import { ApiError } from '@/lib/admin/client';
import { toast } from '@/store/toast';

function FaqEditor({ canWrite }: { canWrite: boolean }) {
  const [data, setData] = useState<FaqContent | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    pagesApi.getFaq().then(setData).catch((err) => setError(err instanceof Error ? err.message : 'Yüklenemedi'));
  }, []);

  if (error && !data) return <p className="admin-error">{error}</p>;
  if (!data) return <TableSkeleton rows={4} />;

  const setGroups = (groups: FaqGroup[]) => setData({ groups });
  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const saved = await pagesApi.saveFaq(data);
      setData(saved);
      toast.success('SSS kaydedildi');
    } catch (err) {
      const msg = err instanceof ApiError ? (Object.values(err.issues)[0] ?? err.message) : err instanceof Error ? err.message : 'Kaydedilemedi';
      setError(msg);
      toast.error('Kaydedilemedi', msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="admin-hint">/sss sayfasında görünür. Değişiklik hemen yayına girer.</p>
        {canWrite && <button type="button" className="admin-btn admin-btn-primary admin-btn-sm" disabled={busy} onClick={() => void save()}><Save size={14} /> {busy ? 'Kaydediliyor…' : 'Kaydet'}</button>}
      </div>
      {error && <p className="admin-error" role="alert">{error}</p>}

      {data.groups.map((g, gi) => (
        <section key={gi} className="admin-card" style={{ padding: 16 }}>
          <div className="flex items-center gap-2">
            <input className="admin-input font-semibold" style={{ maxWidth: 260 }} disabled={!canWrite} value={g.heading}
              onChange={(e) => setGroups(data.groups.map((x, i) => (i === gi ? { ...x, heading: e.target.value } : x)))} aria-label="Grup başlığı" />
            {canWrite && <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm ml-auto" onClick={() => setGroups(data.groups.filter((_, i) => i !== gi))}><Trash2 size={13} /> Grubu sil</button>}
          </div>
          <div className="mt-3 flex flex-col gap-2">
            {g.items.map((it, ii) => (
              <div key={ii} className="rounded-lg border border-[var(--admin-border)] p-2.5">
                <input className="admin-input admin-btn-sm" disabled={!canWrite} value={it.q} placeholder="Soru"
                  onChange={(e) => setGroups(data.groups.map((x, i) => (i === gi ? { ...x, items: x.items.map((y, j) => (j === ii ? { ...y, q: e.target.value } : y)) } : x)))} />
                <textarea className="admin-input mt-2" rows={2} disabled={!canWrite} value={it.a} placeholder="Cevap"
                  onChange={(e) => setGroups(data.groups.map((x, i) => (i === gi ? { ...x, items: x.items.map((y, j) => (j === ii ? { ...y, a: e.target.value } : y)) } : x)))} />
                {canWrite && <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm mt-2" onClick={() => setGroups(data.groups.map((x, i) => (i === gi ? { ...x, items: x.items.filter((_, j) => j !== ii) } : x)))}><Trash2 size={12} /> Soruyu sil</button>}
              </div>
            ))}
            {canWrite && (
              <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm self-start"
                onClick={() => setGroups(data.groups.map((x, i) => (i === gi ? { ...x, items: [...x.items, { q: '', a: '' }] } : x)))}>
                <Plus size={13} /> Soru ekle
              </button>
            )}
          </div>
        </section>
      ))}

      {canWrite && (
        <button type="button" className="admin-btn admin-btn-ghost self-start" onClick={() => setGroups([...data.groups, { heading: 'Yeni grup', items: [] }])}>
          <Plus size={14} /> Grup ekle
        </button>
      )}
    </div>
  );
}

function CampaignEditor({ canWrite }: { canWrite: boolean }) {
  const [data, setData] = useState<CampaignContent | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    pagesApi.getCampaign().then(setData).catch((err) => setError(err instanceof Error ? err.message : 'Yüklenemedi'));
  }, []);

  if (error && !data) return <p className="admin-error">{error}</p>;
  if (!data) return <TableSkeleton rows={4} />;

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const saved = await pagesApi.saveCampaign(data);
      setData(saved);
      toast.success('Kampanya bandı kaydedildi');
    } catch (err) {
      const msg = err instanceof ApiError ? (Object.values(err.issues)[0] ?? err.message) : err instanceof Error ? err.message : 'Kaydedilemedi';
      setError(msg);
      toast.error('Kaydedilemedi', msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="admin-hint">Ana sayfadaki kampanya bandında görünür (Görseller kütüphanesinden yol kopyalayabilirsiniz).</p>
        {canWrite && <button type="button" className="admin-btn admin-btn-primary admin-btn-sm" disabled={busy} onClick={() => void save()}><Save size={14} /> {busy ? 'Kaydediliyor…' : 'Kaydet'}</button>}
      </div>
      {error && <p className="admin-error" role="alert">{error}</p>}

      <section className="admin-card grid gap-3 sm:grid-cols-2" style={{ padding: 16 }}>
        <Field label="Üst etiket" htmlFor="cb-eyebrow"><input id="cb-eyebrow" className="admin-input" disabled={!canWrite} value={data.eyebrow} onChange={(e) => setData({ ...data, eyebrow: e.target.value })} /></Field>
        <Field label="Kupon kodu" htmlFor="cb-code" hint="Gerçekten geçerli bir kupon kodu olmalı (bkz. Kuponlar)."><input id="cb-code" className="admin-input" disabled={!canWrite} value={data.code} onChange={(e) => setData({ ...data, code: e.target.value })} /></Field>
        <Field label="Başlık" htmlFor="cb-title" className="sm:col-span-2"><input id="cb-title" className="admin-input" disabled={!canWrite} value={data.title} onChange={(e) => setData({ ...data, title: e.target.value })} /></Field>
        <Field label="Açıklama" htmlFor="cb-desc" className="sm:col-span-2"><textarea id="cb-desc" className="admin-input" rows={2} disabled={!canWrite} value={data.description} onChange={(e) => setData({ ...data, description: e.target.value })} /></Field>
        <Field label="Kod açıklaması" htmlFor="cb-note" className="sm:col-span-2"><input id="cb-note" className="admin-input" disabled={!canWrite} value={data.codeNote} onChange={(e) => setData({ ...data, codeNote: e.target.value })} /></Field>
        <Field label="Buton metni" htmlFor="cb-cta-label"><input id="cb-cta-label" className="admin-input" disabled={!canWrite} value={data.cta.label} onChange={(e) => setData({ ...data, cta: { ...data.cta, label: e.target.value } })} /></Field>
        <Field label="Buton bağlantısı" htmlFor="cb-cta-href"><input id="cb-cta-href" className="admin-input" disabled={!canWrite} value={data.cta.href} onChange={(e) => setData({ ...data, cta: { ...data.cta, href: e.target.value } })} /></Field>
        <Field label="Görsel yolu" htmlFor="cb-image" className="sm:col-span-2"><input id="cb-image" className="admin-input" disabled={!canWrite} value={data.image} onChange={(e) => setData({ ...data, image: e.target.value })} /></Field>
      </section>
    </div>
  );
}

export function PagesEditor() {
  const { status, can } = useAdminData();
  const canWrite = can('ayar:yaz');
  const [tab, setTab] = useState<'sss' | 'kampanya'>('sss');

  if (status === 'loading') return <TableSkeleton rows={4} />;

  return (
    <div className="flex flex-col gap-3">
      <header>
        <h1 className="text-lg font-semibold text-[var(--brand-purple-deep)]">Sayfalar</h1>
        <p className="admin-hint mt-0.5">SSS ve ana sayfa kampanya bandı. Diğer vitrin metinleri (rehber, hakkımızda, yorumlar) bu sürümde panelden düzenlenemez.</p>
      </header>

      <div role="tablist" aria-label="İçerik" className="flex flex-wrap gap-1 border-b border-[var(--admin-border)]">
        {([['sss', 'SSS'], ['kampanya', 'Kampanya bandı']] as const).map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id}
            className={`admin-focusable -mb-px border-b-2 px-3 py-2 text-sm ${tab === id ? 'border-[var(--brand-purple)] font-semibold text-[var(--brand-purple-deep)]' : 'border-transparent text-[var(--admin-ink-soft)]'}`}
            onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'sss' ? <FaqEditor canWrite={canWrite} /> : <CampaignEditor canWrite={canWrite} />}
    </div>
  );
}
