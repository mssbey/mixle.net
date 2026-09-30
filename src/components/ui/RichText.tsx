import { Fragment } from 'react';
import { parseRichText, type RichInline } from '@/lib/rich-text';
import { cn } from '@/lib/utils';

function Inline({ parts }: { parts: RichInline[] }) {
  return (
    <>
      {parts.map((p, i) =>
        p.bold ? (
          <strong key={i} className="font-bold text-ink">
            {p.text}
          </strong>
        ) : (
          <Fragment key={i}>{p.text}</Fragment>
        ),
      )}
    </>
  );
}

/** Paneldeki `**kalın**` ve `## Başlık` işaretli açıklamayı gösterir. */
export function RichText({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn('space-y-3', className)}>
      {parseRichText(text).map((b, i) =>
        b.kind === 'heading' ? (
          <h3 key={i} className="pt-1 text-lg font-bold text-ink">
            <Inline parts={b.parts} />
          </h3>
        ) : (
          <p key={i}>
            {b.lines.map((line, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                <Inline parts={line} />
              </Fragment>
            ))}
          </p>
        ),
      )}
    </div>
  );
}
