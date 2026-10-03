'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Bölüm ekrana girince bir kez aşağıdan yukarı belirir (referanstaki
 * `animate-fade-in-up`: 0.6s, cubic-bezier(.22,1,.36,1), 100ms gecikme).
 */
export function FadeInUp({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -40px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={className}>
      <div className={shown ? 'home-fade-in-up' : 'opacity-0'}>{children}</div>
    </div>
  );
}
