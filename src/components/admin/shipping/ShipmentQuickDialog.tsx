'use client';

// Kargolar listesinden hızlı durum/takip no güncellemesi (sipariş bağlamı gerektirmez).

import { useState } from 'react';
import { SHIPMENT_STATUSES, carrierLabels, type Carrier, type ShipmentStatus } from '@/server/shipping/carriers';
import { shipmentsApi, type AdminShipmentRow } from '@/lib/admin/shipping-client';
import { ApiError } from '@/lib/admin/client';
import { Field } from '@/components/admin/primitives';
import { Dialog } from '@/components/admin/orders/Dialog';

export function ShipmentQuickDialog({
  shipment,
  open,
  onClose,
  onUpdated,
}: {
  shipment: AdminShipmentRow | null;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [status, setStatus] = useState<ShipmentStatus>((shipment?.status as ShipmentStatus) ?? 'kargoya-verildi');
  const [tracking, setTracking] = useState(shipment?.trackingNumber ?? '');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!shipment) return null;

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await shipmentsApi.update(shipment.id, { status, trackingNumber: tracking, note });
      onUpdated();
    } catch (err) {
      setError(err instanceof ApiError ? (Object.values(err.issues)[0] ?? err.message) : err instanceof Error ? err.message : 'Güncellenemedi');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Sevkiyatı güncelle" description={`${shipment.orderNumber} · ${carrierLabels[shipment.carrier as Carrier] ?? shipment.carrier}`}
      footer={<>
        <button type="button" className="admin-btn admin-btn-ghost" onClick={onClose} disabled={busy}>Vazgeç</button>
        <button type="button" className="admin-btn admin-btn-primary" disabled={busy} onClick={() => void save()}>{busy ? 'Kaydediliyor…' : 'Kaydet'}</button>
      </>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Durum" htmlFor="sq-status">
          <select id="sq-status" className="admin-select" value={status} onChange={(e) => setStatus(e.target.value as ShipmentStatus)}>
            {SHIPMENT_STATUSES.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </Field>
        <Field label="Takip numarası" htmlFor="sq-track"><input id="sq-track" className="admin-input" value={tracking} onChange={(e) => setTracking(e.target.value)} /></Field>
        <Field label="Not" htmlFor="sq-note" className="sm:col-span-2"><input id="sq-note" className="admin-input" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      </div>
      {error && <p className="admin-error mt-2" role="alert">{error}</p>}
    </Dialog>
  );
}
