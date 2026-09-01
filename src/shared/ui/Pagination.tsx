"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/shared/lib/cn";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  labels: {
    label: string;
    previous: string;
    next: string;
    page: (page: number) => string;
  };
}

function getPageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const result: (number | "ellipsis")[] = [];
  sorted.forEach((page, i) => {
    if (i > 0 && page - sorted[i - 1] > 1) result.push("ellipsis");
    result.push(page);
  });
  return result;
}

export function Pagination({ currentPage, totalPages, onPageChange, labels }: PaginationProps) {
  if (totalPages <= 1) return null;
  const pages = getPageNumbers(currentPage, totalPages);

  return (
    <nav aria-label={labels.label} className="flex items-center justify-center gap-1">
      <button
        type="button"
        aria-label={labels.previous}
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        className="flex size-8 items-center justify-center rounded-button text-text-muted hover:bg-surface-muted disabled:pointer-events-none disabled:opacity-40"
      >
        <ChevronLeft className="size-4" aria-hidden />
      </button>
      {pages.map((page, i) =>
        page === "ellipsis" ? (
          <span key={`ellipsis-${i}`} className="px-2 text-text-disabled">
            …
          </span>
        ) : (
          <button
            key={page}
            type="button"
            aria-label={labels.page(page)}
            aria-current={page === currentPage ? "page" : undefined}
            onClick={() => onPageChange(page)}
            className={cn(
              "flex size-8 items-center justify-center rounded-button text-body-sm",
              page === currentPage ? "bg-primary text-white" : "text-text hover:bg-surface-muted"
            )}
          >
            {page}
          </button>
        )
      )}
      <button
        type="button"
        aria-label={labels.next}
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        className="flex size-8 items-center justify-center rounded-button text-text-muted hover:bg-surface-muted disabled:pointer-events-none disabled:opacity-40"
      >
        <ChevronRight className="size-4" aria-hidden />
      </button>
    </nav>
  );
}
