"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/lib/cn";

const cardVariants = cva("rounded-card bg-surface", {
  variants: {
    variant: {
      default: "border border-border-subtle shadow-card",
      outline: "border border-border",
      flat: "bg-surface-muted",
    },
    padding: {
      none: "p-0",
      sm: "p-4",
      md: "p-6",
      lg: "p-8",
    },
  },
  defaultVariants: { variant: "default", padding: "md" },
});

export interface CardProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {}

export function Card({ className, variant, padding, ...props }: CardProps) {
  return <div className={cn(cardVariants({ variant, padding }), className)} {...props} />;
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-4 flex items-start justify-between gap-4", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-h4 font-semibold text-text", className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-body-sm text-text-muted", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-4 flex items-center gap-3", className)} {...props} />;
}
