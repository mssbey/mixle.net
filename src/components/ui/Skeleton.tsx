import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-md', className)} />;
}

export function ProductCardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-md border border-line bg-white">
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="flex flex-1 flex-col p-3 sm:p-3.5">
        <Skeleton className="h-2.5 w-16" />
        <Skeleton className="mt-2 h-3.5 w-full" />
        <Skeleton className="mt-1.5 h-3.5 w-2/3" />
        <div className="mt-auto pt-2.5">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="mt-2.5 h-10 w-full" />
        </div>
      </div>
    </div>
  );
}

export function ProductGridSkeleton({
  count = 8,
  columns = 4,
}: {
  count?: number;
  columns?: 3 | 4 | 5;
}) {
  const colClass =
    columns === 3
      ? 'grid-cols-2 md:grid-cols-3'
      : columns === 4
        ? 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4'
        : 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5';
  return (
    <div className={cn('grid gap-3 sm:gap-4', colClass)}>
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}
