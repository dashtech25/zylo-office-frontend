"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

/** Pied de page des pages publiques — structure inspirée d'odoo.com
 * (colonnes de liens + tagline + copyright), adaptée au périmètre réel de
 * Zylo Office (pas de communauté open source, pas de mentions inventées). */
export function PublicFooter() {
  const t = useTranslations("publicNav");
  const year = new Date().getFullYear();

  const columns: { titleKey: string; links: { href: string; labelKey: string }[] }[] = [
    {
      titleKey: "footer.columns.product.title",
      links: [
        { href: "/produits", labelKey: "footer.columns.product.applications" },
        { href: "/tarification", labelKey: "footer.columns.product.pricing" },
        { href: "/produits#zylo-liquid", labelKey: "footer.columns.product.zyloLiquid" },
        { href: "/produits#zylo-tanker", labelKey: "footer.columns.product.zyloTanker" },
      ],
    },
    {
      titleKey: "footer.columns.resources.title",
      links: [
        { href: "/aide", labelKey: "footer.columns.resources.help" },
        { href: "/communaute", labelKey: "footer.columns.resources.community" },
      ],
    },
    {
      titleKey: "footer.columns.company.title",
      links: [
        { href: "/aide#contact", labelKey: "footer.columns.company.contact" },
        { href: "/login", labelKey: "footer.columns.company.signIn" },
      ],
    },
    {
      titleKey: "footer.columns.legal.title",
      links: [
        { href: "/legal/confidentialite", labelKey: "footer.columns.legal.privacy" },
        { href: "/legal/conditions", labelKey: "footer.columns.legal.terms" },
      ],
    },
  ];

  return (
    <footer className="border-t border-border-subtle bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {columns.map((col) => (
            <div key={col.titleKey}>
              <h3 className="text-caption font-bold uppercase tracking-wide text-text-muted">{t(col.titleKey)}</h3>
              <ul className="mt-3 flex flex-col gap-2">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-body-sm text-text-muted hover:text-text">
                      {t(link.labelKey)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t border-border-subtle pt-6">
          <p className="max-w-2xl text-body-sm text-text-muted">{t("footer.tagline")}</p>
          <p className="mt-4 text-caption text-text-muted">{t("footer.copyright", { year })}</p>
        </div>
      </div>
    </footer>
  );
}
