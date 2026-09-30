'use client';

import { newWindowState } from '@/lib/new-badge';

const STATE_LABEL = {
  yok: null,
  bekliyor: { text: 'Başlamadı', bg: '#fef3c7', fg: '#92400e' },
  aktif: { text: 'Şu an yeni', bg: '#dcfce7', fg: '#166534' },
  bitti: { text: 'Süresi doldu', bg: '#f1f5f9', fg: '#475569' },
} as const;

/**
 * "Yeni" damgasının tarih aralığı. Tarih girilirse vitrindeki "Yeni" rozeti ve
 * Yeni Gelenler listesi yalnızca bu aralıkta görünür; girilmezse süresizdir.
 */
export function NewWindowBox({
  newFrom,
  newUntil,
  disabled,
  error,
  onChange,
}: {
  newFrom: string | null;
  newUntil: string | null;
  disabled?: boolean;
  error?: string;
  onChange: (patch: { newFrom?: string | null; newUntil?: string | null }) => void;
}) {
  const state = STATE_LABEL[newWindowState({ newFrom, newUntil })];

  return (
    <fieldset className="mt-3 rounded border border-[var(--admin-line)] p-2.5">
      <legend className="flex items-center gap-2 px-1">
        <span className="admin-label">&quot;Yeni&quot; damgası tarihleri</span>
        {state && (
          <span
            className="rounded px-1.5 py-0.5 text-[11px] font-semibold"
            style={{ background: state.bg, color: state.fg }}
          >
            {state.text}
          </span>
        )}
      </legend>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-xs text-[var(--admin-ink-soft)]">
          Başlangıç
          <input
            type="date"
            className="admin-input"
            value={newFrom ?? ''}
            max={newUntil ?? undefined}
            disabled={disabled}
            onChange={(e) => onChange({ newFrom: e.target.value || null })}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-[var(--admin-ink-soft)]">
          Bitiş
          <input
            type="date"
            className="admin-input"
            value={newUntil ?? ''}
            min={newFrom ?? undefined}
            disabled={disabled}
            onChange={(e) => onChange({ newUntil: e.target.value || null })}
          />
        </label>
      </div>
      {error ? (
        <p className="admin-error mt-1" role="alert">
          {error}
        </p>
      ) : (
        <p className="admin-hint mt-1">
          Tarih girerseniz &quot;Yeni&quot; rozeti yalnızca bu günler arasında görünür (bitiş günü
          dahil). Boş bırakırsanız &quot;Yeni gelen&quot; / &quot;Yeni&quot; rozeti süresiz geçerlidir.
        </p>
      )}
      {(newFrom || newUntil) && !disabled && (
        <button
          type="button"
          className="admin-btn admin-btn-ghost admin-btn-sm mt-1.5"
          onClick={() => onChange({ newFrom: null, newUntil: null })}
        >
          Tarihleri temizle
        </button>
      )}
    </fieldset>
  );
}
