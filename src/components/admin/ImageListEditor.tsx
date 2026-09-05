'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import type { AdminImage } from '@/types/admin';
import { localId } from '@/lib/admin/variants';

interface Props {
  images: AdminImage[];
  disabled?: boolean;
  error?: string;
  onChange: (images: AdminImage[]) => void;
}

export function ImageListEditor({ images, disabled, error, onChange }: Props) {
  const [src, setSrc] = useState('');

  const add = () => {
    const value = src.trim();
    if (!value) return;
    onChange([...images, { id: localId('img'), src: value, alt: '' }]);
    setSrc('');
  };

  const update = (id: string, fields: Partial<AdminImage>) => {
    onChange(images.map((img) => (img.id === id ? { ...img, ...fields } : img)));
  };

  const remove = (id: string) => onChange(images.filter((img) => img.id !== id));

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-2">
      {images.length === 0 && <p className="admin-hint">Henüz görsel eklenmedi.</p>}

      {images.map((img, i) => (
        <div
          key={img.id}
          className="flex items-start gap-2 rounded-xl border border-[var(--admin-line)] p-2"
        >
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[#f1ebf0]">
            {img.src ? (
              <Image src={img.src} alt="" fill className="object-cover" sizes="56px" unoptimized />
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <input
              className="admin-input admin-btn-sm"
              value={img.src}
              disabled={disabled}
              aria-label={`Görsel ${i + 1} yolu`}
              onChange={(e) => update(img.id, { src: e.target.value })}
            />
            <input
              className="admin-input admin-btn-sm mt-1"
              placeholder="Alternatif metin (zorunlu)"
              value={img.alt}
              disabled={disabled}
              aria-label={`Görsel ${i + 1} alternatif metni`}
              aria-invalid={img.alt.trim() === '' ? 'true' : undefined}
              onChange={(e) => update(img.id, { alt: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <button
              type="button"
              className="admin-btn admin-btn-ghost admin-btn-sm"
              disabled={disabled || i === 0}
              onClick={() => move(i, -1)}
              aria-label="Yukarı taşı"
            >
              <ArrowUp size={12} />
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-ghost admin-btn-sm"
              disabled={disabled || i === images.length - 1}
              onClick={() => move(i, 1)}
              aria-label="Aşağı taşı"
            >
              <ArrowDown size={12} />
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-danger admin-btn-sm"
              disabled={disabled}
              onClick={() => remove(img.id)}
              aria-label="Görseli kaldır"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      ))}

      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}

      <div className="flex gap-1.5">
        <input
          className="admin-input admin-btn-sm"
          placeholder="/images/… görsel yolu"
          value={src}
          disabled={disabled}
          onChange={(e) => setSrc(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
        />
        <button
          type="button"
          className="admin-btn admin-btn-ghost admin-btn-sm"
          disabled={disabled || !src.trim()}
          onClick={add}
        >
          <Plus size={13} /> Görsel
        </button>
      </div>
    </div>
  );
}
