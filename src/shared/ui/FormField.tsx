"use client";

import { useId } from "react";
import { cn } from "@/shared/lib/cn";

export interface FormFieldProps {
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  children: (fieldProps: { id: string; "aria-describedby"?: string; "aria-invalid"?: boolean }) => React.ReactNode;
}

/** Compose label + hint + erreur autour d'un champ générique
 * (Input/Select/Textarea/Checkbox), sans dépendre d'une lib de validation —
 * AlloTech recompose ce trio manuellement à chaque page (rapport §12) ;
 * ici c'est centralisé une fois pour toutes. */
export function FormField({ label, hint, error, required, children }: FormFieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-body-sm font-medium text-text">
        {label}
        {required && (
          <span className="text-error" aria-hidden>
            {" "}
            *
          </span>
        )}
      </label>
      {children({ id, "aria-describedby": describedBy, "aria-invalid": !!error })}
      {hint && !error && (
        <p id={hintId} className="text-caption text-text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className={cn("text-caption text-error")} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
