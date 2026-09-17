"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { cn } from "@/shared/lib/cn";

/** Section de page repliable — aucun équivalent n'existait dans le système
 * de composants avant ce besoin (tableau de bord Zylo Liquid organisé en
 * sections rétractables). État local uniquement (pas de persistance
 * inter-session) : une section repliée par erreur se rouvre d'un clic, rien
 * à récupérer. */
export function CollapsibleSection({
  title,
  subtitle,
  defaultOpen = true,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={cn("flex flex-col gap-4", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 rounded-card border border-border-subtle bg-surface px-4 py-3 text-left transition-colors hover:bg-surface-muted"
      >
        <div className="min-w-0">
          <h2 className="text-h3 font-semibold text-text">{title}</h2>
          {subtitle && <p className="text-body-sm text-text-muted">{subtitle}</p>}
        </div>
        <ChevronDown className={cn("size-5 shrink-0 text-text-muted transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open && <div className="flex flex-col gap-6">{children}</div>}
    </section>
  );
}
