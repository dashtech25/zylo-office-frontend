"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/lib/cn";

const avatarVariants = cva(
  "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-muted font-semibold text-primary",
  {
    variants: {
      size: {
        xs: "size-6 text-caption",
        sm: "size-8 text-caption",
        md: "size-10 text-body-sm",
        lg: "size-12 text-body-md",
      },
    },
    defaultVariants: { size: "md" },
  }
);

export interface AvatarProps extends VariantProps<typeof avatarVariants> {
  name: string;
  src?: string;
  className?: string;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

export function Avatar({ name, src, size, className }: AvatarProps) {
  return (
    <span className={cn(avatarVariants({ size }), className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="size-full object-cover" />
      ) : (
        <>
          <span aria-hidden>{initials(name)}</span>
          <span className="sr-only">{name}</span>
        </>
      )}
    </span>
  );
}
