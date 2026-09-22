'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { ImageIcon, Trash2, Upload } from 'lucide-react';
import { mediaApi } from '@/lib/admin/media-client';
import { ApiError } from '@/lib/admin/client';
import { toast } from '@/store/toast';

interface Props {
  /** Seçili görselin yolu; boşsa yer tutucu gösterilir. */
  value: string;
  onChange: (src: string) => void;
  disabled?: boolean;
  /** Önizleme kutusunun oranı — ikonlar kare, kapaklar geniş. */
  shape?: 'square' | 'wide';
  hint?: string;
  /** Erişilebilir etiket eki: "İkon", "Kapak görseli". */
  label: string;
}

const ACCEPT = 'image/jpeg,image/png,image/webp,image/avif,image/svg+xml';

/**
 * Tek görsellik seçici. Yol yapıştırma alanı YOKTUR — görsel yalnızca
 * bilgisayardan yüklenir; dosya medya kütüphanesine gider, dönen yol saklanır.
 */
export function ImagePicker({ value, onChange, disabled, shape = 'wide', hint, label }: Props) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { asset } = await mediaApi.upload(file);
      onChange(asset.path);
      toast.success(`${label} yüklendi`, file.name);
    } catch (err) {
      toast.error(`${label} yüklenemedi`, err instanceof ApiError ? err.message : undefined);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const box = shape === 'square' ? 'h-16 w-16' : 'h-16 w-28';

  return (
    <div className="flex items-start gap-2.5">
      <div
        className={`relative ${box} shrink-0 overflow-hidden rounded-lg border border-[var(--admin-line)] bg-[#f1ebf0]`}
      >
        {value ? (
          <Image src={value} alt="" fill className="object-contain" sizes="112px" unoptimized />
        ) : (
          <span className="grid h-full w-full place-items-center text-[var(--admin-ink-soft)]">
            <ImageIcon size={18} aria-hidden="true" />
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap gap-1.5">
          <label
            className={`admin-btn admin-btn-primary admin-btn-sm ${
              disabled || uploading ? 'pointer-events-none opacity-60' : 'cursor-pointer'
            }`}
          >
            <Upload size={13} aria-hidden="true" />{' '}
            {uploading ? 'Yükleniyor…' : value ? 'Değiştir' : 'Bilgisayardan yükle'}
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPT}
              hidden
              disabled={disabled || uploading}
              aria-label={`${label} dosyası seç`}
              onChange={(e) => void upload(e.target.files)}
            />
          </label>
          {value && (
            <button
              type="button"
              className="admin-btn admin-btn-danger admin-btn-sm"
              disabled={disabled || uploading}
              onClick={() => onChange('')}
              aria-label={`${label} kaldır`}
            >
              <Trash2 size={13} aria-hidden="true" /> Kaldır
            </button>
          )}
        </div>
        <p className="admin-hint truncate" title={value || undefined}>
          {value || hint || 'JPG, PNG, WEBP, AVIF veya SVG — en fazla 8 MB.'}
        </p>
      </div>
    </div>
  );
}
