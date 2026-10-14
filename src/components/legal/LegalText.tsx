// Panelde düz metin olarak tutulan yasal belgeyi okunur biçimde gösterir.
// Tümü büyük harf satırlar ve "MADDE …" satırları başlık olur; "- " ile
// başlayan satırlar madde işaretli liste. Sunucu ve istemcide çalışır.

import { cn } from '@/lib/utils';

type Block = { kind: 'h' | 'p' | 'li'; text: string };

function isHeading(line: string): boolean {
  if (/^MADDE\s+\d+/i.test(line)) return true;
  const letters = line.replace(/[^A-Za-zÇĞİÖŞÜçğıöşü]/g, '');
  return letters.length >= 4 && line.length <= 90 && letters === letters.toLocaleUpperCase('tr');
}

function parse(body: string): Block[] {
  return body
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) =>
      line.startsWith('- ') ? { kind: 'li' as const, text: line.slice(2) } : { kind: isHeading(line) ? ('h' as const) : ('p' as const), text: line },
    );
}

export function LegalText({ body, className, skipTitle }: { body: string; className?: string; skipTitle?: boolean }) {
  const blocks = parse(body);
  // Belgenin ilk satırı genelde başlığın tekrarıdır (ör. "ÜYELİK SÖZLEŞMESİ").
  if (skipTitle && blocks[0]?.kind === 'h') blocks.shift();
  return (
    <div className={cn('space-y-3 text-sm leading-relaxed text-ink', className)}>
      {blocks.map((b, i) =>
        b.kind === 'h' ? (
          <h2 key={i} className="pt-3 text-[13px] font-bold uppercase tracking-wide text-purple-900 first:pt-0">
            {b.text}
          </h2>
        ) : b.kind === 'li' ? (
          <p key={i} className="pl-4 before:-ml-3 before:mr-1.5 before:content-['•']">
            {b.text}
          </p>
        ) : (
          <p key={i}>{b.text}</p>
        ),
      )}
    </div>
  );
}
