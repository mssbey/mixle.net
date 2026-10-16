'use client';

import { BadgePercent } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ProductCampaign } from '@/types';

export type { ProductCampaign };

const inWindow = (c: ProductCampaign, now: number) =>
  (!c.startsAt || now >= Date.parse(c.startsAt)) && (!c.endsAt || now <= Date.parse(c.endsAt));

/**
 * Ürün sayfası önbellekli olduğu için ilk çizim sayfanın üretildiği ana göre
 * yapılır (hidrasyon uyuşsun), yüklendikten sonra gerçek saate göre süzülür.
 */
export function CampaignBox({ campaigns, renderedAt }: { campaigns: ProductCampaign[]; renderedAt: number }) {
  const [now, setNow] = useState(renderedAt);
  useEffect(() => setNow(Date.now()), []);
  const visible = campaigns.filter((c) => inWindow(c, now));
  if (!visible.length) return null;

  return (
    <div className="mt-4 space-y-2">
      {visible.map((c) => (
        <div
          key={c.id}
          className="flex items-center gap-3 rounded-lg border-2 border-dashed border-brand-500/60 bg-brand-50 px-4 py-3"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-500 text-white">
            <BadgePercent size={20} />
          </span>
          <div className="min-w-0">
            <p className="text-base font-extrabold text-brand-600">{c.title}</p>
            <p className="whitespace-pre-line text-xs leading-snug text-ink-soft">{c.detail}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
