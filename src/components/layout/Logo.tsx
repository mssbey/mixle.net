import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export function Logo({
  variant = 'default',
  className,
  priority = false,
  mark = false,
  onNavigate,
}: {
  variant?: 'default' | 'light';
  className?: string;
  priority?: boolean;
  mark?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href="/"
      aria-label="Ana sayfa"
      onClick={onNavigate}
      className={cn('inline-flex shrink-0 items-center', variant === 'light' && 'rounded-md bg-white px-3 py-2', className)}
    >
      <Image
        src="/brand/logo.png"
        alt="Mixle Lezzet Sepeti"
        width={185}
        height={84}
        preload={priority}
        className={cn(mark ? 'w-[88px]' : 'w-[100px] sm:w-[120px]', 'h-auto object-contain')}
      />
    </Link>
  );
}
