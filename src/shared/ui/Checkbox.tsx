"use client";

import { forwardRef } from "react";
import { cn } from "@/shared/lib/cn";

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
}

/** Checkbox natif stylé — pas de wrapper Radix : l'input natif + <label>
 * associé par htmlFor/id offre déjà l'accessibilité clavier nécessaire. */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, id, ...props }, ref) => {
    const inputId = id ?? props.name;
    return (
      <label htmlFor={inputId} className="inline-flex items-center gap-2 text-body-md text-text">
        <input
          ref={ref}
          id={inputId}
          type="checkbox"
          className={cn(
            "size-4 rounded border border-border text-primary accent-primary",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          {...props}
        />
        {label}
      </label>
    );
  }
);
Checkbox.displayName = "Checkbox";
