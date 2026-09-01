"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface Breadcrumb {
  label: string;
  href?: string;
}

export interface PageHeaderProps {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  breadcrumbs?: Breadcrumb[];
  breadcrumbLabel?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ eyebrow, title, description, breadcrumbs, breadcrumbLabel, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div>
        {breadcrumbs && breadcrumbs.length >= 2 && (
          <nav aria-label={breadcrumbLabel} className="mb-1 flex items-center gap-1 text-caption text-text-muted">
            {breadcrumbs.map((crumb, i) => (
              <span key={crumb.label} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="size-3" aria-hidden />}
                {crumb.href ? (
                  <Link href={crumb.href} className="hover:text-primary">
                    {crumb.label}
                  </Link>
                ) : (
                  <span>{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        {eyebrow && <p className="text-caption font-semibold uppercase tracking-wide text-primary">{eyebrow}</p>}
        <h1 className="text-h1 font-semibold text-text">{title}</h1>
        {description && <p className="mt-1 text-body-sm text-text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-3">{actions}</div>}
    </div>
  );
}
