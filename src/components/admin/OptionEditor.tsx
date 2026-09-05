'use client';

import { useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import type { AdminVariant, ProductOption } from '@/types/admin';
import { ensureSingleDefault, generateMatrix, localId } from '@/lib/admin/variants';

interface Props {
  options: ProductOption[];
  variants: AdminVariant[];
  disabled?: boolean;
  onChange: (options: ProductOption[], variants: AdminVariant[]) => void;
}

export function OptionEditor({ options, variants, disabled, onChange }: Props) {
  const [newOption, setNewOption] = useState('');
  const [newValue, setNewValue] = useState<Record<string, string>>({});

  const commit = (nextOptions: ProductOption[]) => {
    const ordered = nextOptions.map((o, i) => ({ ...o, order: i }));
    const nextVariants = ensureSingleDefault(generateMatrix(ordered, variants), variants);
    onChange(ordered, nextVariants);
  };

  const addOption = () => {
    const name = newOption.trim();
    if (!name) return;
    commit([...options, { id: localId('opt'), name, values: [], order: options.length }]);
    setNewOption('');
  };

  const renameOption = (id: string, name: string) => {
    commit(options.map((o) => (o.id === id ? { ...o, name } : o)));
  };

  const removeOption = (id: string) => {
    commit(options.filter((o) => o.id !== id));
  };

  const moveOption = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= options.length) return;
    const next = [...options];
    [next[index], next[target]] = [next[target], next[index]];
    commit(next);
  };

  const addValue = (optionId: string) => {
    const label = (newValue[optionId] ?? '').trim();
    if (!label) return;
    commit(
      options.map((o) =>
        o.id === optionId
          ? { ...o, values: [...o.values, { id: localId('val'), label }] }
          : o,
      ),
    );
    setNewValue((prev) => ({ ...prev, [optionId]: '' }));
  };

  const renameValue = (optionId: string, valueId: string, label: string) => {
    commit(
      options.map((o) =>
        o.id === optionId
          ? { ...o, values: o.values.map((v) => (v.id === valueId ? { ...v, label } : v)) }
          : o,
      ),
    );
  };

  const removeValue = (optionId: string, valueId: string) => {
    commit(
      options.map((o) =>
        o.id === optionId ? { ...o, values: o.values.filter((v) => v.id !== valueId) } : o,
      ),
    );
  };

  const moveValue = (optionId: string, index: number, delta: number) => {
    const option = options.find((o) => o.id === optionId);
    if (!option) return;
    const target = index + delta;
    if (target < 0 || target >= option.values.length) return;
    const values = [...option.values];
    [values[index], values[target]] = [values[target], values[index]];
    commit(options.map((o) => (o.id === optionId ? { ...o, values } : o)));
  };

  return (
    <div className="flex flex-col gap-3">
      {options.length === 0 && (
        <p className="admin-hint">
          Seçenek eklemezseniz ürün tek (gizli) varsayılan varyantla yönetilir.
        </p>
      )}

      {options.map((option, oi) => (
        <div key={option.id} className="rounded-xl border border-[var(--admin-line)] p-3">
          <div className="flex items-center gap-2">
            <input
              className="admin-input"
              value={option.name}
              disabled={disabled}
              aria-label={`Seçenek ${oi + 1} adı`}
              onChange={(e) => renameOption(option.id, e.target.value)}
            />
            <button
              type="button"
              className="admin-btn admin-btn-ghost admin-btn-sm"
              disabled={disabled || oi === 0}
              onClick={() => moveOption(oi, -1)}
              aria-label="Yukarı taşı"
            >
              <ArrowUp size={13} />
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-ghost admin-btn-sm"
              disabled={disabled || oi === options.length - 1}
              onClick={() => moveOption(oi, 1)}
              aria-label="Aşağı taşı"
            >
              <ArrowDown size={13} />
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-danger admin-btn-sm"
              disabled={disabled}
              onClick={() => removeOption(option.id)}
              aria-label={`${option.name} seçeneğini sil`}
            >
              <Trash2 size={13} />
            </button>
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {option.values.map((value, vi) => (
              <span key={value.id} className="admin-chip">
                <button
                  type="button"
                  className="text-[var(--admin-ink-soft)] disabled:opacity-30"
                  disabled={disabled || vi === 0}
                  onClick={() => moveValue(option.id, vi, -1)}
                  aria-label={`${value.label} sola`}
                >
                  ‹
                </button>
                <input
                  className="w-[7ch] bg-transparent text-xs focus:outline-none"
                  value={value.label}
                  disabled={disabled}
                  aria-label="Değer adı"
                  onChange={(e) => renameValue(option.id, value.id, e.target.value)}
                  style={{ width: `${Math.max(4, value.label.length + 1)}ch` }}
                />
                <button
                  type="button"
                  className="text-[var(--admin-ink-soft)] disabled:opacity-30"
                  disabled={disabled || vi === option.values.length - 1}
                  onClick={() => moveValue(option.id, vi, 1)}
                  aria-label={`${value.label} sağa`}
                >
                  ›
                </button>
                <button
                  type="button"
                  className="text-rose-600"
                  disabled={disabled}
                  onClick={() => removeValue(option.id, value.id)}
                  aria-label={`${value.label} değerini sil`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>

          <div className="mt-2 flex gap-1.5">
            <input
              className="admin-input admin-btn-sm"
              placeholder="Değer ekle (ör. 250g)"
              value={newValue[option.id] ?? ''}
              disabled={disabled}
              onChange={(e) => setNewValue((p) => ({ ...p, [option.id]: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addValue(option.id);
                }
              }}
            />
            <button
              type="button"
              className="admin-btn admin-btn-ghost admin-btn-sm"
              disabled={disabled}
              onClick={() => addValue(option.id)}
            >
              <Plus size={13} /> Ekle
            </button>
          </div>
        </div>
      ))}

      {options.length < 6 && (
        <div className="flex gap-2">
          <input
            className="admin-input"
            placeholder="Yeni seçenek adı (ör. Aroma)"
            value={newOption}
            disabled={disabled}
            onChange={(e) => setNewOption(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addOption();
              }
            }}
          />
          <button
            type="button"
            className="admin-btn admin-btn-ghost"
            disabled={disabled || !newOption.trim()}
            onClick={addOption}
          >
            <Plus size={14} /> Seçenek
          </button>
        </div>
      )}
    </div>
  );
}
