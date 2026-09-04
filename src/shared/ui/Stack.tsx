"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/lib/cn";

/** Rythme vertical (ou horizontal) générique — remplace le `flex flex-col
 * gap-6` recopié à la main en tête de chaque page. Source unique pour cet
 * espacement : si l'espacement standard entre sections change, il change
 * ici, pas dans chaque page. */
const stackVariants = cva("flex", {
  variants: {
    direction: {
      column: "flex-col",
      row: "flex-row",
    },
    gap: {
      sm: "gap-2",
      md: "gap-4",
      lg: "gap-6",
      xl: "gap-8",
    },
  },
  defaultVariants: { direction: "column", gap: "lg" },
});

export interface StackProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof stackVariants> {}

export function Stack({ className, direction, gap, ...props }: StackProps) {
  return <div className={cn(stackVariants({ direction, gap }), className)} {...props} />;
}
