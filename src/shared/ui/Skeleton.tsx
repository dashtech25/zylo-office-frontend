"use client";

import { cn } from "@/shared/lib/cn";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circular" | "rectangular";
}

export function Skeleton({ className, variant = "text", ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={cn(
        "relative overflow-hidden bg-surface-muted",
        "after:absolute after:inset-0 after:-translate-x-full after:animate-[shimmer_1.5s_infinite] after:bg-gradient-to-r after:from-transparent after:via-white/60 after:to-transparent",
        variant === "text" && "h-4 rounded",
        variant === "circular" && "rounded-full",
        variant === "rectangular" && "rounded-card",
        className
      )}
      {...props}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-card border border-border-subtle p-6">
      <Skeleton className="mb-3 h-5 w-1/3" />
      <Skeleton className="mb-2 h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-card" />
      ))}
    </div>
  );
}

export function KpiSkeleton() {
  return (
    <div className="rounded-card border border-border-subtle p-5">
      <Skeleton className="mb-3 h-3 w-1/2" />
      <Skeleton className="h-7 w-1/3" />
    </div>
  );
}
