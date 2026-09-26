'use client';

import { useEffect, useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { adminApi, ApiError } from '@/lib/admin/client';
import { DEFAULT_FLAVOR_PROFILES, type FlavorProfileDef } from '@/lib/flavor-profiles';
import { slugify } from '@/lib/utils';
import { toast } from '@/store/toast';
import { useAdminData } from './AdminDataProvider';
import { ConfirmDialog } from './ConfirmDialog';

// Liste panel ömrü boyunca bir kez çekilir ve editörler arasında paylaşılır.
let cached: FlavorProfileDef[] | null = null;
let inflight: Promise<FlavorProfileDef[]> | null = null;
const listeners = new Set<(list: FlavorProfileDef[]) => void>();

function publish(list: FlavorProfileDef[]) {
  cached = list;
  listeners.forEach((fn) => fn(list));
}

/** Panelde tanımlı tat profilleri; yüklenene dek varsayılan liste döner. */
export function useAdminFlavorProfiles(): {
  profiles: FlavorProfileDef[];
  save: (next: FlavorProfileDef[]) => Promise<boolean>;
} {
  const [profiles, setProfiles] = useState<FlavorProfileDef[]>(cached ?? DEFAULT_FLAVOR_PROFILES);

  useEffect(() => {
    listeners.add(setProfiles);
    if (!cached) {
      inflight ??= adminApi
        .loadFlavorProfiles()
        .then((r) => r.profiles)
        .finally(() => {
          inflight = null;
        });
      inflight.then(publish).catch(() => undefined);
    }
    return () => {
      listeners.delete(setProfiles);
    };
  }, []);

  const save = async (next: FlavorProfileDef[]) => {
    try {
      const { profiles: saved } = await adminApi.saveFlavorProfiles(next);
      publish(saved);
      return true;
    } catch (err) {
      const detail = err instanceof ApiError ? Object.values(err.issues)[0] ?? err.message : undefined;
      toast.error('Profiller kaydedilemedi', detail);
      return false;
    }
  };

  return { profiles, save };
}

/** Türkçe büyük İ/I doğru küçülsün diye önce yerel küçültme, sonra slug. */
function profileId(label: string, taken: Set<string>): string {
  const base = slugify(label.toLocaleLowerCase('tr-TR')) || 'profil';
  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
  return id;
}

interface Props {
  selected: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

/**
 * "Profiller" kutusu: çipe tıklayınca ürüne eklenir/çıkarılır. Alttaki
 * bağlantılarla sayfadan ayrılmadan yeni profil açılır ya da mevcutlar
 * yeniden adlandırılıp silinir (liste tüm ürünler için ortaktır).
 */
export function ProductFlavorProfileBox({ selected, onChange, disabled }: Props) {
  const { products, canWrite } = useAdminData();
  const { profiles, save } = useAdminFlavorProfiles();
  const [mode, setMode] = useState<'view' | 'add' | 'edit'>('view');
  const [newLabel, setNewLabel] = useState('');
  const [rows, setRows] = useState<FlavorProfileDef[]>([]);
  const [pendingDelete, setPendingDelete] = useState<FlavorProfileDef | null>(null);
  const [saving, setSaving] = useState(false);

  const readOnly = disabled || !canWrite;

  const usage = useMemo(() => {
    const count = new Map<string, number>();
    for (const p of products) for (const id of p.flavorProfiles) count.set(id, (count.get(id) ?? 0) + 1);
    return count;
  }, [products]);

  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  const add = async () => {
    const label = newLabel.trim();
    if (!label) return;
    const existing = profiles.find((p) => p.label.toLocaleLowerCase('tr-TR') === label.toLocaleLowerCase('tr-TR'));
    if (existing) {
      if (!selected.includes(existing.id)) onChange([...selected, existing.id]);
      setNewLabel('');
      setMode('view');
      return;
    }
    const id = profileId(label, new Set(profiles.map((p) => p.id)));
    setSaving(true);
    const ok = await save([...profiles, { id, label }]);
    setSaving(false);
    if (ok) {
      // Yeni profil kategori kutusundaki gibi otomatik işaretlenir.
      onChange([...selected, id]);
      setNewLabel('');
      setMode('view');
    }
  };

  const startEdit = () => {
    setRows(profiles.map((p) => ({ ...p })));
    setMode('edit');
  };

  const saveEdit = async () => {
    if (rows.some((r) => !r.label.trim())) {
      toast.error('Profil adı boş olamaz');
      return;
    }
    setSaving(true);
    const ok = await save(rows.map((r) => ({ id: r.id, label: r.label.trim() })));
    setSaving(false);
    if (ok) {
      // Silinen profiller bu ürünün seçiminden de düşer.
      const kept = new Set(rows.map((r) => r.id));
      if (selected.some((id) => !kept.has(id))) onChange(selected.filter((id) => kept.has(id)));
      setMode('view');
      toast.success('Profiller güncellendi');
    }
  };

  return (
    <div>
      {mode === 'edit' ? (
        <div className="flex flex-col gap-1.5">
          {rows.map((r, i) => (
            <div key={r.id} className="flex items-center gap-1.5">
              <input
                className="admin-input admin-btn-sm"
                value={r.label}
                disabled={saving}
                aria-label={`${r.label || 'Profil'} adı`}
                onChange={(e) =>
                  setRows(rows.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))
                }
              />
              <span className="admin-hint w-14 shrink-0 text-right" title="Bu profili kullanan ürün sayısı">
                {usage.get(r.id) ?? 0} ürün
              </span>
              <button
                type="button"
                className="admin-btn admin-btn-danger admin-btn-sm"
                disabled={saving}
                aria-label={`${r.label} profilini sil`}
                onClick={() => setPendingDelete(r)}
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          {rows.length === 0 && <p className="admin-hint">Tanımlı profil yok.</p>}
          <div className="mt-1 flex gap-1.5">
            <button
              type="button"
              className="admin-btn admin-btn-primary admin-btn-sm"
              disabled={saving}
              onClick={() => void saveEdit()}
            >
              {saving ? 'Kaydediliyor…' : 'Profilleri kaydet'}
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-ghost admin-btn-sm"
              disabled={saving}
              onClick={() => setMode('view')}
            >
              Vazgeç
            </button>
          </div>
          <p className="admin-hint">Değişiklikler tüm ürünlerde geçerlidir.</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {profiles.map((p) => (
            <button
              key={p.id}
              type="button"
              className="admin-chip"
              disabled={readOnly}
              aria-pressed={selected.includes(p.id)}
              style={
                selected.includes(p.id)
                  ? { background: 'var(--brand-gold)', color: 'var(--brand-purple-deep)', borderColor: 'transparent' }
                  : undefined
              }
              onClick={() => toggle(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {!readOnly && mode === 'add' && (
        <div className="mt-2 flex flex-col gap-1.5">
          <input
            className="admin-input admin-btn-sm"
            placeholder="Yeni profil adı (ör. Baharatlı)"
            value={newLabel}
            autoFocus
            disabled={saving}
            aria-label="Yeni profil adı"
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void add();
              }
              if (e.key === 'Escape') setMode('view');
            }}
          />
          <div className="flex gap-1.5">
            <button
              type="button"
              className="admin-btn admin-btn-primary admin-btn-sm"
              disabled={saving || !newLabel.trim()}
              onClick={() => void add()}
            >
              {saving ? 'Ekleniyor…' : 'Profili ekle'}
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-ghost admin-btn-sm"
              disabled={saving}
              onClick={() => {
                setMode('view');
                setNewLabel('');
              }}
            >
              Vazgeç
            </button>
          </div>
        </div>
      )}

      {!readOnly && mode === 'view' && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
          <button type="button" className="admin-termbox-link" onClick={() => setMode('add')}>
            + Yeni profil ekle
          </button>
          <button type="button" className="admin-termbox-link" onClick={startEdit}>
            Profilleri düzenle
          </button>
        </div>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title={`"${pendingDelete?.label ?? ''}" profili silinsin mi?`}
        description={
          pendingDelete && (usage.get(pendingDelete.id) ?? 0) > 0
            ? `${usage.get(pendingDelete.id)} üründe kullanılıyor. Silinince vitrin filtresinde ve bu kutuda görünmez. "Profilleri kaydet" ile kesinleşir.`
            : 'Silme "Profilleri kaydet" ile kesinleşir.'
        }
        confirmLabel="Sil"
        destructive
        onConfirm={() => {
          if (pendingDelete) setRows(rows.filter((r) => r.id !== pendingDelete.id));
          setPendingDelete(null);
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
