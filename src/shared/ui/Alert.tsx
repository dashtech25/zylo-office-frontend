"use client";

import { cva } from "class-variance-authority";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/shared/lib/cn";

const alertVariants = cva("flex items-start gap-3 rounded-card border p-4 text-body-sm", {
  variants: {
    tone: {
      success: "border-success/20 bg-success-muted text-success",
      warning: "border-warning/20 bg-warning-muted text-warning",
      error: "border-error/20 bg-error-muted text-error",
      info: "border-info/20 bg-info-muted text-info",
    },
  },
  defaultVariants: { tone: "info" },
});

const icons = { success: CheckCircle2, warning: AlertTriangle, error: XCircle, info: Info };
type AlertTone = keyof typeof icons;

export interface AlertProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  tone?: AlertTone;
  title?: React.ReactNode;
}

export function Alert({ className, tone = "info", title, children, ...props }: AlertProps) {
  const Icon = icons[tone];
  return (
    <div role="alert" className={cn(alertVariants({ tone }), className)} {...props}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="text-text">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="text-text-muted">{children}</div>}
      </div>
    </div>
  );
}
