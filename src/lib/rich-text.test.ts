import { describe, expect, it } from 'vitest';
import { parseInline, parseRichText, stripRichText } from './rich-text';

describe('açıklama biçimlendirme', () => {
  it('**kalın** parçaları ayırır', () => {
    expect(parseInline('a **b** c')).toEqual([
      { text: 'a ', bold: false },
      { text: 'b', bold: true },
      { text: ' c', bold: false },
    ]);
  });

  it('kapanmamış ** düz metin kalır', () => {
    expect(parseInline('a **b')).toEqual([{ text: 'a **b', bold: false }]);
  });

  it('## satırı başlık, boş satır paragraf böler', () => {
    const blocks = parseRichText('## Başlık\nsatır 1\nsatır 2\n\nparagraf');
    expect(blocks.map((b) => b.kind)).toEqual(['heading', 'paragraph', 'paragraph']);
    expect(blocks[1].kind === 'paragraph' && blocks[1].lines.length).toBe(2);
  });

  it('işaretleri temizler', () => {
    expect(stripRichText('## Baş\n**x** y')).toBe('Baş\nx y');
  });
});
