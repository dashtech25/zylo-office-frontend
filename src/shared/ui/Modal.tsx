"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "@/shared/lib/cn";

const contentVariants = cva(
  "fixed left-1/2 top-1/2 z-50 w-full -translate-x-1/2 -translate-y-1/2 rounded-card bg-surface p-6 shadow-elevated " +
    "overflow-y-auto transition-[opacity,transform] duration-200 " +
    "data-[state=closed]:opacity-0 data-[state=closed]:scale-95",
  {
    variants: {
      size: {
        sm: "max-w-sm max-h-[calc(100vh-6rem)]",
        md: "max-w-md max-h-[calc(100vh-6rem)]",
        lg: "max-w-2xl max-h-[calc(100vh-6rem)]",
        xl: "max-w-4xl max-h-[calc(100vh-6rem)]",
        // Formulaire long (ex. création station + cuves) qui a besoin de
        // presque tout l'écran sur grand écran plutôt qu'une colonne étroite
        // perdue au milieu — reste sous 100vw/100vh pour garder l'overlay visible.
        full: "max-w-[96vw] w-[96vw] h-[94vh] max-h-[94vh]",
      },
    },
    defaultVariants: { size: "md" },
  }
);

export interface ModalProps extends VariantProps<typeof contentVariants> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  closeLabel: string;
  /** Empêche la fermeture au clic extérieur (garde uniquement Échap et le
   * bouton de fermeture explicite) — utile pour un formulaire long où une
   * fermeture accidentelle perdrait la saisie. Comportement par défaut de
   * Radix inchangé (ferme au clic extérieur) tant que ce prop est omis. */
  preventOutsideClose?: boolean;
}

/** Wrapper Radix Dialog — remplace le pattern createPortal + gestion Échap
 * manuelle observé chez AlloTech (Modal.tsx) par un focus trap et une
 * fermeture clavier/aria gérés par construction (trou d'accessibilité
 * identifié dans le rapport §21 pour les composants faits main). */
export function Modal({ open, onOpenChange, title, description, children, footer, size, closeLabel, preventOutsideClose }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-secondary/40 transition-opacity duration-200 data-[state=closed]:opacity-0" />
        <Dialog.Content
          className={cn(contentVariants({ size }))}
          onPointerDownOutside={preventOutsideClose ? (e) => e.preventDefault() : undefined}
          onInteractOutside={preventOutsideClose ? (e) => e.preventDefault() : undefined}
        >
          <div className="mb-4 flex items-start justify-between gap-4 border-b border-border-subtle pb-4">
            <div>
              <Dialog.Title className="text-h4 font-semibold text-text">{title}</Dialog.Title>
              {description && (
                <Dialog.Description className="mt-1 text-body-sm text-text-muted">{description}</Dialog.Description>
              )}
            </div>
            <Dialog.Close
              aria-label={closeLabel}
              className="rounded-button p-1 text-text-muted hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <X className="size-4" aria-hidden />
            </Dialog.Close>
          </div>
          {children}
          {footer && <div className="mt-6 flex items-center justify-end gap-3 border-t border-border-subtle pt-4">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
