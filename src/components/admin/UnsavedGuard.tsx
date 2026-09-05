'use client';

import { useEffect } from 'react';

/**
 * Kaydedilmemiş değişiklik varken sayfadan ayrılma uyarısı.
 * - Tam sayfa kapatma/yenileme: beforeunload.
 * - Uygulama içi <a> tıklaması: yakalama fazında onay iste.
 */
export function UnsavedGuard({ when }: { when: boolean }) {
  useEffect(() => {
    if (!when) return;

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    const onClickCapture = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const anchor = (e.target as HTMLElement | null)?.closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || anchor.target === '_blank') return;
      const url = new URL(href, window.location.href);
      if (url.pathname === window.location.pathname) return;
      const ok = window.confirm(
        'Kaydedilmemiş değişiklikler var. Bu sayfadan ayrılmak istediğinize emin misiniz?',
      );
      if (!ok) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClickCapture, true);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClickCapture, true);
    };
  }, [when]);

  return null;
}
