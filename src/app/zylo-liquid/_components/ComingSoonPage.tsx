"use client";

import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";

/** Page-coquille pour tout item de la sidebar du prototype dont la donnée
 * n'existe pas au Niveau 1 (CAS 4 de la mission d'intégration : ventes,
 * caisse, RH/shifts, crédit client, maintenance, HSE, réglementaire,
 * audit, configuration avancée, utilisateurs par station). L'emplacement
 * et le titre exacts du prototype sont conservés — seule la fonctionnalité
 * est désactivée, jamais retirée, jamais approximée avec une donnée
 * inventée. Voir
 * docs/modules/zylo-liquid/phase-3-prototype-compatibility-matrix.md. */
export function ComingSoonPage({ title, subtitle }: { title: string; subtitle?: string }) {
  const tCommon = useTranslations("common");
  return (
    <>
      <div className="page-head">
        <div className="ph-text">
          <h1>{title}</h1>
          {subtitle && <div className="ph-sub">{subtitle}</div>}
        </div>
      </div>
      <div className="empty">
        <div className="row" style={{ justifyContent: "center", marginBottom: 8 }}>
          <Lock width={20} height={20} strokeWidth={1.8} color="var(--ink-3)" aria-hidden />
        </div>
        <div className="e-t">{tCommon("states.comingSoon")}</div>
      </div>
    </>
  );
}
