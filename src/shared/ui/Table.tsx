"use client";

import { cn } from "@/shared/lib/cn";

/** Coquille présentationnelle uniquement — pas de tri/filtrage/pagination
 * intégré. `DataTable.tsx` d'AlloTech (rapport §13) est un point de départ
 * conceptuel jugé insuffisant pour le volume de données de Zylo Liquid ;
 * l'intégration d'un moteur headless (TanStack Table) est différée au
 * premier écran de données réel, sans réécriture de ces primitives
 * (voir docs/frontend-foundations.md). */
export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto rounded-card border border-border-subtle">
      <table className={cn("w-full border-collapse text-body-sm", className)} {...props} />
    </div>
  );
}

export function TableHead({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("bg-surface-muted text-caption uppercase text-text-muted", className)} {...props} />;
}

export function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("divide-y divide-border-subtle", className)} {...props} />;
}

export function TableRow({
  className,
  clickable,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement> & { clickable?: boolean }) {
  return (
    <tr
      className={cn(clickable && "cursor-pointer transition-colors hover:bg-primary-muted/40", className)}
      {...props}
    />
  );
}

export function TableHeaderCell({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn("px-4 py-3 text-left font-semibold", className)} {...props} />;
}

export function TableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-4 py-3 text-text", className)} {...props} />;
}
