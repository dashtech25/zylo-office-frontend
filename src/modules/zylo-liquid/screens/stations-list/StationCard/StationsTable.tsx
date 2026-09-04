import type { ReactNode } from "react";

import { Card } from "@/shared/ui";

import { StationTableHeader } from "./StationTableHeader";

/** Table blanche unifiée (en-tête + lignes) conforme à la référence :
 * un seul bloc `Card` avec une bande d'en-tête `bg-surface-muted`,
 * plutôt que des cartes séparées flottant sur le fond gris de page. */
export function StationsTable({ children }: { children: ReactNode }) {
  return (
    <Card padding="none" className="overflow-hidden">
      <StationTableHeader />
      {children}
    </Card>
  );
}
