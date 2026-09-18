"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

/** Chaque module (Zylo Liquid, Zylo Tanker, ...) vit dans un segment de route
 * de premier niveau isolé (`src/app/zylo-liquid`, `src/app/zylo-tanker`),
 * jamais imbriqué sous `(app)` — `AppShell` (la coquille globale) ne s'y
 * compose donc jamais et chaque module doit fournir lui-même un moyen de
 * revenir à Zylo Office. `/dashboard` (tableau de bord) est la destination
 * choisie (décision explicite du commanditaire, pas `/applications`). */
export function BackToZyloOfficeLink({ className }: { className?: string }) {
  const t = useTranslations("common");

  return (
    <Link href="/dashboard" className={className}>
      <ArrowLeft className="size-4 shrink-0" aria-hidden style={{ display: "inline", verticalAlign: "-2px", marginRight: 4 }} />
      {t("header.backToOffice")}
    </Link>
  );
}
