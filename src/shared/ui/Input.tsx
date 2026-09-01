"use client";

import { forwardRef } from "react";
import { cn } from "@/shared/lib/cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, icon, rightIcon, disabled, ...props }, ref) => (
    <div className="relative">
      {icon && (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
          {icon}
        </span>
      )}
      <input
        ref={ref}
        disabled={disabled}
        aria-invalid={invalid}
        className={cn(
          "h-10 w-full rounded-input border border-border bg-surface px-3 text-body-md text-text placeholder:text-text-disabled",
          "transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30",
          "disabled:bg-surface-muted disabled:text-text-disabled disabled:cursor-not-allowed",
          invalid && "border-error focus-visible:border-error focus-visible:ring-error/30",
          icon && "pl-9",
          rightIcon && "pr-9",
          className
        )}
        {...props}
      />
      {rightIcon && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">{rightIcon}</span>
      )}
    </div>
  )
);
Input.displayName = "Input";
