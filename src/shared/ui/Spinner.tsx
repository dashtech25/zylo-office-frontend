"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/shared/lib/cn";

export function Spinner({ className, label }: { className?: string; label: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-2">
      <Loader2 className={cn("size-4 animate-spin text-primary", className)} aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function PageSpinner({ label }: { label: string }) {
  return (
    <div className="flex h-full min-h-40 items-center justify-center">
      <Spinner label={label} className="size-6" />
    </div>
  );
}
