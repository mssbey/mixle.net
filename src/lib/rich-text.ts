// Ürün açıklaması için hafif biçimlendirme.
//
// Açıklama düz metin olarak saklanır; iki işaret tanınır:
//   **kalın**   → kalın yazı
//   ## Başlık   → satır başında: büyük/kalın başlık satırı
// HTML asla yorumlanmaz — vitrin bunları React öğelerine çevirir.

export type RichInline = { text: string; bold: boolean };
export type RichBlock =
  | { kind: 'heading'; parts: RichInline[] }
  | { kind: 'paragraph'; lines: RichInline[][] };

const HEADING = /^\s*##\s+/;

/** "a **b** c" → [{a}, {b, kalın}, {c}]. Kapanmamış ** düz metin kalır. */
export function parseInline(line: string): RichInline[] {
  const out: RichInline[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  for (let m = re.exec(line); m; m = re.exec(line)) {
    if (m.index > last) out.push({ text: line.slice(last, m.index), bold: false });
    out.push({ text: m[1], bold: true });
    last = m.index + m[0].length;
  }
  if (last < line.length) out.push({ text: line.slice(last), bold: false });
  return out;
}

/** Metni başlık ve paragraf bloklarına ayırır (boş satır paragraf böler). */
export function parseRichText(text: string): RichBlock[] {
  const blocks: RichBlock[] = [];
  let para: RichInline[][] = [];
  const flush = () => {
    if (para.length) blocks.push({ kind: 'paragraph', lines: para });
    para = [];
  };
  for (const raw of text.replace(/\r\n?/g, '\n').split('\n')) {
    if (!raw.trim()) {
      flush();
    } else if (HEADING.test(raw)) {
      flush();
      blocks.push({ kind: 'heading', parts: parseInline(raw.replace(HEADING, '').trim()) });
    } else {
      para.push(parseInline(raw));
    }
  }
  flush();
  return blocks;
}

/** İşaretleri kaldırır — SEO, arama ve özet metinleri için. */
export function stripRichText(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => l.replace(HEADING, ''))
    .join('\n')
    .replace(/\*\*(.+?)\*\*/g, '$1');
}
