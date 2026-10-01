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

  it('satırlara ve paragraflara yayılan **…** kalın görünür', () => {
    const blocks = parseRichText('**ÖNEMLİ NOT\nENGELİ YOKTUR\n\n3 Farklı Çilek**\nson');
    expect(blocks).toEqual([
      {
        kind: 'paragraph',
        lines: [[{ text: 'ÖNEMLİ NOT', bold: true }], [{ text: 'ENGELİ YOKTUR', bold: true }]],
      },
      {
        kind: 'paragraph',
        lines: [[{ text: '3 Farklı Çilek', bold: true }], [{ text: 'son', bold: false }]],
      },
    ]);
    expect(stripRichText('**a\n\nb** c')).toBe('a\n\nb c');
  });

  it('metindeki son eşsiz ** düz kalır', () => {
    const blocks = parseRichText('**a** b\nc **d');
    expect(blocks[0].kind === 'paragraph' && blocks[0].lines[1]).toEqual([{ text: 'c **d', bold: false }]);
  });

  it('"t****" gibi sansür yıldızları işaret sayılmaz', () => {
    const blocks = parseRichText('t**** aroması **kalın** ve t**** tadı');
    expect(blocks[0].kind === 'paragraph' && blocks[0].lines[0]).toEqual([
      { text: 't**** aroması ', bold: false },
      { text: 'kalın', bold: true },
      { text: ' ve t**** tadı', bold: false },
    ]);
    expect(stripRichText('t**** **a** t****')).toBe('t**** a t****');
  });

  it('işaretleri temizler', () => {
    expect(stripRichText('## Baş\n**x** y')).toBe('Baş\nx y');
  });
});
