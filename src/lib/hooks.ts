'use client';

import { useEffect, useRef, useState } from 'react';
import { useSelectedLayoutSegment } from 'next/navigation';

/** Persist store'ların SSR/CSR uyumsuzluğunu önlemek için mount guard. */
export function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

/**
 * Ana sayfada mıyız? `usePathname() === '/'` yerine router ağacındaki segment
 * kullanılır: Vercel'in statik ön-render'ında kök sayfa `/index` yoluyla
 * üretildiği için pathname sunucuda '/index', istemcide '/' oluyor; buna bağlı
 * header/footer dalları hydration hatasına (React #418) ve yükleme sonrası
 * header'ın değişip zıplamasına yol açıyordu. Segment iki tarafta da aynıdır.
 */
export function useIsHome() {
  return useSelectedLayoutSegment() === null;
}

/** Body scroll kilidi (modal/drawer açıkken). Scrollbar genişliğini telafi eder. */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const { body, documentElement } = document;
    const scrollBarW = window.innerWidth - documentElement.clientWidth;
    const prevOverflow = body.style.overflow;
    const prevPad = body.style.paddingRight;
    body.style.overflow = 'hidden';
    if (scrollBarW > 0) body.style.paddingRight = `${scrollBarW}px`;
    return () => {
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPad;
    };
  }, [active]);
}

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** ESC ile kapama + Tab döngüsü (focus trap) + açılışta ilk öğeye odak. */
export function useDialog(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const node = ref.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const focusables = () =>
      Array.from(node?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );

    const t = window.setTimeout(() => {
      const list = focusables();
      (list[0] ?? node)?.focus();
    }, 20);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const list = focusables();
      if (!list.length) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  return ref;
}

/** Bir elementin viewport'a girip girmediği (skeleton/lazy tetikleme). */
export function useInView<T extends Element>(options?: IntersectionObserverInit) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true);
        obs.disconnect();
      }
    }, options ?? { rootMargin: '200px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, [options]);
  return { ref, inView };
}

/** Debounce edilmiş değer. */
export function useDebounced<T>(value: T, delay = 200) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}
