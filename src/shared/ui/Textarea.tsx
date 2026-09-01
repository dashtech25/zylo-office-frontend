"use client";

import { forwardRef } from "react";
import { cn } from "@/shared/lib/cn";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, invalid, ...props }, ref) => (
    <textarea
      ref={ref}
      aria-invalid={invalid}
      className={cn(
        "min-h-24 w-full rounded-input border border-border bg-surface px-3 py-2 text-body-md text-text placeholder:text-text-disabled",
        "transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30",
        "disabled:bg-surface-muted disabled:text-text-disabled disabled:cursor-not-allowed",
        invalid && "border-error focus-visible:border-error focus-visible:ring-error/30",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";
