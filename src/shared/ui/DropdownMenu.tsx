"use client";

import Link from "next/link";
import type { RefObject } from "react";
import { cn } from "@/shared/lib/cn";

/** Menu contextuel générique (actions de ligne dans une liste/tableau).
 * Présentationnel uniquement : le parent contrôle `open` et la fermeture
 * au clic extérieur (pattern déjà utilisé dans les listes de l'app) —
 * pas de portail/positionnement complexe, suffisant pour un menu ancré à
 * un bouton dans une ligne de tableau. Source unique pour ce pattern :
 * ne pas recréer un menu "⋮" à la main dans un module. */
export function DropdownMenu({
  open,
  menuRef,
  align = "end",
  className,
  children,
}: {
  open: boolean;
  menuRef?: RefObject<HTMLDivElement | null>;
  align?: "start" | "end";
  className?: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      ref={menuRef}
      role="menu"
      className={cn(
        "absolute top-full z-20 mt-1 w-48 rounded-card border border-border bg-surface p-1 shadow-elevated",
        align === "end" ? "right-0" : "left-0",
        className
      )}
    >
      {children}
    </div>
  );
}

export interface DropdownMenuItemProps {
  href?: string;
  onClick?: () => void;
  danger?: boolean;
  children: React.ReactNode;
}

export function DropdownMenuItem({ href, onClick, danger, children }: DropdownMenuItemProps) {
  const className = cn(
    "flex w-full items-center rounded-button px-3 py-2 text-left text-body-sm text-text transition-colors hover:bg-surface-muted",
    danger && "text-error hover:bg-error-muted"
  );
  if (href) {
    return (
      <Link href={href} role="menuitem" className={className}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" role="menuitem" onClick={onClick} className={className}>
      {children}
    </button>
  );
}

export function DropdownMenuSeparator() {
  return <div className="my-1 border-t border-border-subtle" role="separator" />;
}
