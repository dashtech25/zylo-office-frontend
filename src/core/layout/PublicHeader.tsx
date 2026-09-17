"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { buttonVariants } from "@/shared/ui/Button";
import { cn } from "@/shared/lib/cn";

/** En-tête des pages publiques (site vitrine, hors application authentifiée)
 * — structure inspirée d'odoo.com : logo, navigation principale (Applications
 * / Tarification / Aide / Communauté), puis Se connecter / C'est gratuit en
 * bout de barre. Contenu propre à Zylo Office, jamais le contenu d'Odoo.
 * Distinct de `AppShell` (sidebar de l'application authentifiée) — ce
 * header n'apparaît jamais derrière `ProtectedRoute`. */
export function PublicHeader() {
  const t = useTranslations("publicNav");
  const pathname = usePathname();

  const navItems: { href: string; label: string }[] = [
    { href: "/produits", label: t("header.applications") },
    { href: "/tarification", label: t("header.pricing") },
    { href: "/aide", label: t("header.help") },
    { href: "/communaute", label: t("header.community") },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border-subtle bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-[8px] bg-primary text-body-md font-bold text-white">
            Z
          </span>
          <span className="text-h4 font-bold text-text">{t("brand")}</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-button px-3 py-2 text-body-sm font-medium transition-colors",
                  active ? "text-primary" : "text-text-muted hover:text-text"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <Link href="/login" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
            {t("header.signIn")}
          </Link>
          <Link href="/essai-gratuit" className={cn(buttonVariants({ variant: "primary", size: "sm" }))}>
            {t("header.freeTrial")}
          </Link>
        </div>
      </div>

      <nav className="flex items-center gap-1 overflow-x-auto border-t border-border-subtle px-4 py-2 md:hidden">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="shrink-0 rounded-button px-3 py-1.5 text-body-sm font-medium text-text-muted hover:text-text"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
