'use client';

// Kalem düzenleme: adet / birim fiyat / satır indirimi, kalem ekle-çıkar,
// kargo ücreti; "yeniden hesapla" sunucuda computeTotals ile yapılır.

import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { AdminOrderView } from '@/server/orders/admin-view';
import { useAdminData } from '@/components/admin/AdminDataProvider';
import { comboLabel } from '@/lib/admin/variants';
import { ordersApi } from '@/lib/admin/orders-client';
import { ApiError } from '@/lib/admin/client';
import { formatMinor, minorToInput, parseMajorInput } from '@/lib/money';
import { toast } from '@/store/toast';
import { Field } from '@/components/admin/primitives';
import { Dialog } from './Dialog';

interface Row {
  id?: string;
  variantId: string;
  name: string;
  variantLabel: string;
  quantity: number;
  unitPrice: string; // TL girdi
  discount: string; // TL girdi
}

interface Props {
  order: AdminOrderView;
  open: boolean;
  onClose: () => void;
  onUpdated: (o: AdminOrderView) => void;
}

export function ItemsEditorDialog({ order, open, onClose, onUpdated }: Props) {
  const { products } = useAdminData();
  const [rows, setRows] = useState<Row[]>(() =>
    order.items.map((i) => ({
      id: i.id,
      variantId: i.variantId ?? '',
      name: i.name,
      variantLabel: i.variantLabel,
      quantity: i.quantity,
      unitPrice: minorToInput(i.unitPriceMinor),
      discount: minorToInput(i.discountMinor),
    })),
  );
  const [shipping, setShipping] = useState(minorToInput(order.totals.shippingTotalMinor));
  const [search, setSearch] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const candidates = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('tr');
    if (q.length < 2) return [];
    const out: { variantId: string; name: string; label: string; priceMinor: number; stock: number }[] = [];
    for (const p of products) {
      if (!p.name.toLocaleLowerCase('tr').includes(q) && !p.variants.some((v) => v.sku.toLocaleLowerCase('tr').includes(q))) continue;
      for (const v of p.variants.filter((v) => v.isActive)) {
        out.push({ variantId: v.id, name: p.name, label: comboLabel(p, v), priceMinor: v.priceMinor, stock: v.stock });
      }
      if (out.length > 30) break;
    }
    return out.slice(0, 30);
  }, [products, search]);

  const preview = rows.reduce((s, r) => s + Math.max(0, (parseMajorInput(r.unitPrice) ?? 0) * r.quantity - (parseMajorInput(r.discount) ?? 0)), 0);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await ordersApi.updateItems(order.id, {
        items: rows.map((row) => ({
          id: row.id,
          variantId: row.variantId,
          quantity: row.quantity,
          unitPriceMinor: parseMajorInput(row.unitPrice) ?? undefined,
          discountMinor: parseMajorInput(row.discount) ?? 0,
        })),
        shippingTotalMinor: parseMajorInput(shipping) ?? undefined,
        note,
      });
      onUpdated(r.order);
      toast.success('Kalemler güncellendi, toplamlar yeniden hesaplandı');
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Güncellenemedi');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Kalemleri düzenle" description="Adet 0 = kalemi kaldır. Stok farkı otomatik işlenir; kupon yerine satır indirimi uygulanır." wide
      footer={<>
        <button type="button" className="admin-btn admin-btn-ghost" onClick={onClose} disabled={busy}>Vazgeç</button>
        <button type="button" className="admin-btn admin-btn-primary" disabled={busy || rows.every((r) => r.quantity === 0)} onClick={submit}>
          {busy ? 'Hesaplanıyor…' : `Yeniden hesapla ve kaydet · ≈ ${formatMinor(preview + (parseMajorInput(shipping) ?? 0))}`}
        </button>
      </>}>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Ürün</th><th style={{ width: 80 }}>Adet</th><th style={{ width: 110 }}>Birim (₺)</th><th style={{ width: 110 }}>İndirim (₺)</th><th className="text-right">Satır</th><th style={{ width: 40 }} /></tr></thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={r.variantId + idx}>
                <td>{r.name}{r.variantLabel && <span className="text-xs text-[var(--admin-ink-soft)]"> · {r.variantLabel}</span>}</td>
                <td><input type="number" min={0} className="admin-input admin-btn-sm" value={r.quantity} aria-label="Adet" onChange={(e) => setRows(rows.map((x, i) => (i === idx ? { ...x, quantity: Math.max(0, Number(e.target.value) || 0) } : x)))} /></td>
                <td><input className="admin-input admin-btn-sm" inputMode="decimal" value={r.unitPrice} aria-label="Birim fiyat" onChange={(e) => setRows(rows.map((x, i) => (i === idx ? { ...x, unitPrice: e.target.value } : x)))} /></td>
                <td><input className="admin-input admin-btn-sm" inputMode="decimal" value={r.discount} aria-label="Satır indirimi" onChange={(e) => setRows(rows.map((x, i) => (i === idx ? { ...x, discount: e.target.value } : x)))} /></td>
                <td className="text-right">{formatMinor(Math.max(0, (parseMajorInput(r.unitPrice) ?? 0) * r.quantity - (parseMajorInput(r.discount) ?? 0)))}</td>
                <td><button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" aria-label="Kalemi kaldır" onClick={() => setRows(rows.filter((_, i) => i !== idx))}><Trash2 size={14} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_160px]">
        <Field label="Ürün ekle" htmlFor="ie-search" hint="Ad veya SKU ile ara">
          <input id="ie-search" className="admin-input" value={search} onChange={(e) => setSearch(e.target.value)} />
          {candidates.length > 0 && (
            <ul className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-[var(--admin-border)] bg-white text-sm" role="listbox">
              {candidates.map((c) => (
                <li key={c.variantId}>
                  <button type="button" className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left hover:bg-[#f7f4ef]"
                    onClick={() => {
                      const existing = rows.findIndex((r) => r.variantId === c.variantId);
                      if (existing >= 0) setRows(rows.map((r, i) => (i === existing ? { ...r, quantity: r.quantity + 1 } : r)));
                      else setRows([...rows, { variantId: c.variantId, name: c.name, variantLabel: c.label, quantity: 1, unitPrice: minorToInput(c.priceMinor), discount: '0' }]);
                      setSearch('');
                    }}>
                    <span>{c.name} <span className="text-xs text-[var(--admin-ink-soft)]">· {c.label}</span></span>
                    <span className="text-xs">{formatMinor(c.priceMinor)} · stok {c.stock} <Plus size={12} className="inline" /></span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Field>
        <Field label="Kargo ücreti (₺)" htmlFor="ie-ship"><input id="ie-ship" className="admin-input" inputMode="decimal" value={shipping} onChange={(e) => setShipping(e.target.value)} /></Field>
      </div>
      <Field label="Düzenleme notu" htmlFor="ie-note" className="mt-3"><input id="ie-note" className="admin-input" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      {error && <p className="admin-error mt-2" role="alert">{error}</p>}
    </Dialog>
  );
}
