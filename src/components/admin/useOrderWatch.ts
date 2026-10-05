'use client';

import { useEffect, useRef } from 'react';
import { ordersApi } from '@/lib/admin/orders-client';
import { toast } from '@/store/toast';

const POLL_MS = 30_000;
/** Panelde bir yere tıklanınca kontrol; art arda tıklamalar sunucuyu yormasın. */
const CLICK_MIN_GAP_MS = 5_000;

/**
 * Yeni sipariş gözcüsü: sekme açıkken 30 sn'de bir, sekmeye dönüldüğünde ve
 * panelde bir yere tıklandığında sipariş sayısına bakar. Sayı artınca bildirim
 * gösterir ve `onNewOrders` ile açık sayfanın verisini tazeletir.
 */
export function useOrderWatch(enabled: boolean, onNewOrders: () => void) {
  const lastTotal = useRef<number | null>(null);
  const lastCheck = useRef(0);
  const inFlight = useRef(false);
  const callback = useRef(onNewOrders);

  useEffect(() => {
    callback.current = onNewOrders;
  });

  useEffect(() => {
    if (!enabled) return;

    const check = async () => {
      if (inFlight.current || document.visibilityState !== 'visible') return;
      inFlight.current = true;
      lastCheck.current = Date.now();
      try {
        const { total, items } = await ordersApi.list({ pageSize: 1 });
        const prev = lastTotal.current;
        lastTotal.current = total;
        if (prev !== null && total > prev) {
          const count = total - prev;
          const latest = items[0]?.orderNumber;
          toast.success(
            count === 1 ? 'Yeni sipariş geldi' : `${count} yeni sipariş geldi`,
            latest ? `Son sipariş: ${latest}` : undefined,
          );
          callback.current();
        }
      } catch {
        /* ağ hatası: bir sonraki turda yeniden denenir */
      } finally {
        inFlight.current = false;
      }
    };

    const onClick = () => {
      if (Date.now() - lastCheck.current >= CLICK_MIN_GAP_MS) void check();
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') void check();
    };

    void check();
    const timer = window.setInterval(() => void check(), POLL_MS);
    document.addEventListener('click', onClick, true);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled]);
}
