// frontend/src/components/ui/Skeleton.tsx
import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps): JSX.Element {
  return <div className={cn("animate-pulse rounded-lg bg-slate-200", className)} />;
}

export function ProductCardSkeleton(): JSX.Element {
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
      <Skeleton className="h-44 rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-7 w-1/3" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-9 w-16" />
          <Skeleton className="h-9 flex-1" />
        </div>
      </div>
    </article>
  );
}

export function ProductGridSkeleton(): JSX.Element {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}
