"use client";

import { AlertTriangle, Inbox, type LucideIcon } from "lucide-react";
import { Button } from "./Button";

/** Générique — aucun texte par défaut : le parent fournit systématiquement
 * title/description/actionLabel via i18n (cf. instruction.md §11). */
export interface EmptyStateProps {
  icon?: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
  actionLabel?: React.ReactNode;
  onAction?: () => void;
}

export function EmptyState({ icon: Icon = Inbox, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-card border border-dashed border-border p-10 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-surface-muted text-text-muted">
        <Icon className="size-6" aria-hidden />
      </span>
      <p className="text-h4 font-semibold text-text">{title}</p>
      {description && <p className="max-w-sm text-body-sm text-text-muted">{description}</p>}
      {actionLabel && onAction && (
        <Button variant="outline" size="sm" className="mt-2" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export interface ErrorStateProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  retryLabel?: React.ReactNode;
  onRetry?: () => void;
}

export function ErrorState({ title, description, retryLabel, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-card border border-error/20 bg-error-muted p-10 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-surface text-error">
        <AlertTriangle className="size-6" aria-hidden />
      </span>
      <p className="text-h4 font-semibold text-text">{title}</p>
      {description && <p className="max-w-sm text-body-sm text-text-muted">{description}</p>}
      {retryLabel && onRetry && (
        <Button variant="destructive" size="sm" className="mt-2" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
