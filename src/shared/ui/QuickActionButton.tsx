"use client";

import type { LucideIcon } from "lucide-react";
import { Button, type ButtonProps } from "@/shared/ui/Button";
import { cn } from "@/shared/lib/cn";

export interface QuickActionButtonProps extends Omit<ButtonProps, "variant"> {
  icon: LucideIcon;
  /** Une seule action "mise en avant" par groupe (ex. l'action recommandée
   * pour un type d'alerte donné) — pleine couleur verte plutôt qu'un simple
   * contour, pour la distinguer visuellement des actions secondaires. */
  highlighted?: boolean;
}

/** Bouton d'action rapide (icône à gauche + texte) — variante secondaire
 * (contour) par défaut, ou primaire verte via `highlighted`. Un seul
 * composant pour toute action rapide de l'app plutôt qu'un style recomposé
 * à la main à chaque écran (panneau de détail d'alerte, futures actions
 * rapides d'autres modules). */
export function QuickActionButton({ icon: Icon, highlighted, className, children, ...props }: QuickActionButtonProps) {
  return (
    <Button
      variant={highlighted ? "primary" : "outline"}
      className={cn("justify-start", highlighted && "bg-success hover:brightness-95", className)}
      {...props}
    >
      <Icon className="size-4" aria-hidden />
      {children}
    </Button>
  );
}
