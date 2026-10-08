'use client';

import { useRef, useState } from 'react';
import { Bold, Eye, Heading, Pencil } from 'lucide-react';
import { RichText } from '@/components/ui/RichText';

/**
 * Ürün açıklaması alanı: düz metin + hafif biçimlendirme araç çubuğu.
 * "Kalın" seçimi **…** ile sarar, "Başlık" seçili satırların başına "## " koyar
 * (tekrar basınca kaldırır). Vitrin bu işaretleri kalın yazı/başlık olarak gösterir.
 */
export function RichTextArea({
  id,
  value,
  onChange,
  disabled,
  invalid,
  minHeight = 360,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  minHeight?: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = useState(false);

  /**
   * Değeri değiştirir, ardından imleci/seçimi geri yükler. Değişen kısım tarayıcının
   * kendi "insertText" komutuyla yazılır; böylece Ctrl+Z / Ctrl+Y geçmişi bozulmaz.
   */
  const apply = (next: string, selStart: number, selEnd: number) => {
    const el = ref.current;
    if (el) {
      let start = 0;
      while (start < value.length && start < next.length && value[start] === next[start]) start++;
      let endOld = value.length;
      let endNew = next.length;
      while (endOld > start && endNew > start && value[endOld - 1] === next[endNew - 1]) {
        endOld--;
        endNew--;
      }
      el.focus();
      el.setSelectionRange(start, endOld);
      const ok = document.execCommand('insertText', false, next.slice(start, endNew));
      if (ok && el.value === next) {
        el.setSelectionRange(selStart, selEnd);
        return;
      }
    }
    onChange(next);
    requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(selStart, selEnd);
    });
  };

  const toggleBold = () => {
    const el = ref.current;
    if (!el) return;
    let { selectionStart: a, selectionEnd: b } = el;
    // Seçimin kenarındaki boşluklar işaretin dışında kalsın ("** metin**" olmasın).
    while (a < b && /\s/.test(value[a])) a++;
    while (b > a && /\s/.test(value[b - 1])) b--;
    const inner = value.slice(a, b);
    // Zaten kalınsa (seçim **…** içinde ya da işaretlerle birlikte seçilmiş) kaldır.
    if (value.slice(a - 2, a) === '**' && value.slice(b, b + 2) === '**') {
      return apply(value.slice(0, a - 2) + inner + value.slice(b + 2), a - 2, b - 2);
    }
    if (inner.length >= 4 && inner.startsWith('**') && inner.endsWith('**')) {
      return apply(value.slice(0, a) + inner.slice(2, -2) + value.slice(b), a, b - 4);
    }
    const text = inner || 'kalın metin';
    apply(value.slice(0, a) + `**${text}**` + value.slice(b), a + 2, a + 2 + text.length);
  };

  const toggleHeading = () => {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: a, selectionEnd: b } = el;
    const lineStart = value.lastIndexOf('\n', a - 1) + 1;
    const nl = value.indexOf('\n', b);
    const lineEnd = nl === -1 ? value.length : nl;
    const lines = value.slice(lineStart, lineEnd).split('\n');
    const allHeadings = lines.every((l) => !l.trim() || /^\s*##\s+/.test(l));
    const next = lines
      .map((l) => (!l.trim() ? l : allHeadings ? l.replace(/^\s*##\s+/, '') : `## ${l.replace(/^\s*##\s+/, '')}`))
      .join('\n');
    apply(value.slice(0, lineStart) + next + value.slice(lineEnd), lineStart, lineStart + next.length);
  };

  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-center gap-1.5" role="toolbar" aria-label="Metin biçimi">
        <button
          type="button"
          className="admin-btn admin-btn-ghost admin-btn-sm"
          disabled={disabled || preview}
          onMouseDown={(e) => e.preventDefault()}
          onClick={toggleBold}
          title="Seçili metni kalın yap (Ctrl+B)"
        >
          <Bold size={13} /> Kalın
        </button>
        <button
          type="button"
          className="admin-btn admin-btn-ghost admin-btn-sm"
          disabled={disabled || preview}
          onMouseDown={(e) => e.preventDefault()}
          onClick={toggleHeading}
          title="Satırı büyük, kalın başlık yap"
        >
          <Heading size={13} /> Başlık
        </button>
        <button
          type="button"
          className="admin-btn admin-btn-ghost admin-btn-sm ml-auto"
          onClick={() => setPreview((p) => !p)}
          aria-pressed={preview}
        >
          {preview ? <Pencil size={13} /> : <Eye size={13} />} {preview ? 'Düzenle' : 'Önizle'}
        </button>
      </div>
      {preview ? (
        <div
          className="admin-textarea overflow-auto text-sm leading-relaxed"
          style={{ minHeight, maxHeight: 640 }}
        >
          {value.trim() ? (
            <RichText text={value} />
          ) : (
            <span className="text-[var(--admin-ink-soft)]">Açıklama boş</span>
          )}
        </div>
      ) : (
        <textarea
          ref={ref}
          id={id}
          className="admin-textarea"
          style={{ minHeight }}
          value={value}
          disabled={disabled}
          aria-invalid={invalid ? 'true' : undefined}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
              e.preventDefault();
              toggleBold();
            }
          }}
        />
      )}
      <p className="admin-hint mt-1">
        Kalın için <code>**metin**</code>, başlık için satır başına <code>## </code> — vitrinde biçimli görünür.
      </p>
    </div>
  );
}
