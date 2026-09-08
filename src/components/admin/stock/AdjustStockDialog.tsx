'use client';

import { useState } from 'react';
import { Dialog } from '@/components/admin/orders/Dialog';
import { Field } from '@/components/admin/primitives';
import { stockApi, type LowStockRow } from '@/lib/admin/stock-client';
import { ApiError } from '@/lib/admin/client';
import { toast } from '@/store/toast';

const REASONS = [
  { id: 'manuel', label: 'Manuel düzeltme' },
  { id: 'sayım', label: 'Fiziksel sayım farkı' },
  { id: 'fire', label: 'Fire / kayıp' },
] as const;

export function AdjustStockDialog({ row, open, onClose, onSaved }: { row: LowStockRow; open: boolean; onClose: () => void; onSaved: () => void }) {
  const [delta, setDelta] = useState(0);
  const [reason, setReason] = useState<(typeof REASONS)[number]['id']>('manuel');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resulting = row.stock + delta;

  const save = async () => {
    if (delta === 0) { setError('Miktar sıfır olamaz.'); return; }
    setBusy(true);
    setError(null);
    try {
      await stockApi.adjust(row.variantId, { delta, reason, note });
      toast.success('Stok güncellendi', `${row.productName}: ${row.stock} → ${resulting}`);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? (Object.values(err.issues)[0] ?? err.message) : err instanceof Error ? err.message : 'Güncellenemedi');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Stok düzelt" description={`${row.productName}${row.sku ? ` · ${row.sku}` : ''} — mevcut: ${row.stock}`}
      footer={<>
        <button type="button" className="admin-btn admin-btn-ghost" onClick={onClose} disabled={busy}>Vazgeç</button>
        <button type="button" className="admin-btn admin-btn-primary" disabled={busy || delta === 0 || resulting < 0} onClick={() => void save()}>{busy ? 'Kaydediliyor…' : 'Kaydet'}</button>
      </>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Değişim (+ekle / −düş)" htmlFor="adj-delta" required>
          <input id="adj-delta" type="number" className="admin-input" value={delta} onChange={(e) => setDelta(Number(e.target.value) || 0)} />
        </Field>
        <Field label="Sebep" htmlFor="adj-reason">
          <select id="adj-reason" className="admin-select" value={reason} onChange={(e) => setReason(e.target.value as typeof reason)}>
            {REASONS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
        </Field>
        <Field label="Not (opsiyonel)" htmlFor="adj-note" className="sm:col-span-2">
          <input id="adj-note" className="admin-input" value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>
      <p className="admin-hint mt-2">Yeni stok: <strong className={resulting < 0 ? 'text-rose-600' : ''}>{resulting}</strong></p>
      {error && <p className="admin-error mt-2" role="alert">{error}</p>}
    </Dialog>
  );
}
