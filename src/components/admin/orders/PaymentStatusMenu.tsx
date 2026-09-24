'use client';

// Ödeme durumu rozeti + hızlı değiştirme menüsü (liste ve detayda).
// Menü portal ile açılır — tablo kaydırma kabı içinde kırpılmasın.

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Clock, Loader2, XCircle } from 'lucide-react';
import { ordersApi } from '@/lib/admin/orders-client';
import { ApiError } from '@/lib/admin/client';
import { toast } from '@/store/toast';
import { cn } from '@/lib/utils';
import { paymentStatusLabels } from './status';

type Target = 'ödendi' | 'bekliyor' | 'başarısız';

const TONE: Record<string, string> = {
  ödendi: 'bg-[#e6f6ee] text-[#0f6b3d] border-[#a9dfc2]',
  bekliyor: 'bg-[#fff4de] text-[#8a5a00] border-[#f2d597]',
  kısmi: 'bg-[#fff4de] text-[#8a5a00] border-[#f2d597]',
  başarısız: 'bg-[#fdecec] text-[#b42318] border-[#f4b9b2]',
};

const OPTIONS: { to: Target; label: string; hint: string; icon: typeof Check; dot: string }[] = [
  { to: 'ödendi', label: 'Ödendi', hint: 'Havale eşleşti / tahsil edildi', icon: Check, dot: 'text-[#0f6b3d]' },
  { to: 'bekliyor', label: 'Ödeme bekliyor', hint: 'Ödeme henüz alınmadı', icon: Clock, dot: 'text-[#8a5a00]' },
  { to: 'başarısız', label: 'Başarısız', hint: 'Ödeme gelmedi / reddedildi', icon: XCircle, dot: 'text-[#b42318]' },
];

export function PaymentStatusMenu({
  orderId,
  orderNumber,
  paymentStatus,
  orderStatus,
  canWrite,
  onChanged,
}: {
  orderId: string;
  orderNumber: string;
  paymentStatus: string;
  orderStatus: string;
  canWrite: boolean;
  onChanged: () => void;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const locked = ['iptal', 'iade-edildi'].includes(orderStatus) || ['iade-edildi', 'kısmi-iade'].includes(paymentStatus);
  const interactive = canWrite && !locked;

  const options = OPTIONS.filter((o) => {
    if (o.to === paymentStatus) return false;
    if (o.to === 'başarısız') return orderStatus === 'ödeme-bekliyor';
    return true;
  });

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    let frame = 0;
    const place = () => {
      if (!btnRef.current) return;
      const r = btnRef.current.getBoundingClientRect();
      // Yerleşim henüz hazır değilse (ör. sekme arka plandaysa) sonraki karede dene.
      if (r.width === 0) {
        frame = requestAnimationFrame(place);
        return;
      }
      const width = 232;
      const left = Math.min(Math.max(8, r.left), window.innerWidth - width - 8);
      const below = r.bottom + 6;
      const menuH = menuRef.current?.offsetHeight ?? 160;
      const top = below + menuH > window.innerHeight - 8 ? Math.max(8, r.top - menuH - 6) : below;
      setPos({ top, left });
    };
    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !btnRef.current?.contains(t)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    menuRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const choose = async (to: Target) => {
    setOpen(false);
    setBusy(true);
    try {
      await ordersApi.setPaymentStatus(orderId, to);
      toast.success('Ödeme durumu güncellendi', `${orderNumber} · ${paymentStatusLabels[to]}`);
      onChanged();
    } catch (err) {
      toast.error('Ödeme durumu değiştirilemedi', err instanceof ApiError ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const chip = cn(
    'inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold',
    TONE[paymentStatus] ?? 'bg-[#f1f1f1] text-[#555] border-[#ddd]',
  );

  if (!interactive || options.length === 0) {
    return <span className={chip}>{paymentStatusLabels[paymentStatus] ?? paymentStatus}</span>;
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={cn(chip, 'cursor-pointer transition-shadow hover:shadow-[0_0_0_3px_rgba(103,39,121,0.12)] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(103,39,121,0.25)]')}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${orderNumber} ödeme durumu: ${paymentStatusLabels[paymentStatus] ?? paymentStatus}. Değiştir`}
        disabled={busy}
        onClick={() => setOpen((v) => !v)}
      >
        {busy ? <Loader2 size={11} className="animate-spin" aria-hidden /> : null}
        {paymentStatusLabels[paymentStatus] ?? paymentStatus}
        <ChevronDown size={11} className={cn('opacity-60 transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label="Ödeme durumunu değiştir"
            className="fixed z-[80] w-[232px] overflow-hidden rounded-xl border border-[var(--admin-border)] bg-white p-1 shadow-[0_12px_32px_-8px_rgba(38,14,48,0.28)]"
            style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999 }}
          >
            <p className="px-2.5 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--admin-ink-soft)]">Ödeme durumu</p>
            {options.map((o) => (
              <button
                key={o.to}
                type="button"
                role="menuitem"
                className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-[#f7f4ef] focus-visible:bg-[#f7f4ef] focus-visible:outline-none"
                onClick={() => void choose(o.to)}
              >
                <o.icon size={15} className={cn('mt-0.5 shrink-0', o.dot)} aria-hidden />
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold text-[var(--brand-purple-deep)]">{o.label}</span>
                  <span className="block text-[11px] text-[var(--admin-ink-soft)]">{o.hint}</span>
                </span>
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
