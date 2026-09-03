"use client";

import type { LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";

/** Reproduit exactement `.kpi` du prototype validé (prototype.html,
 * fonction `kpi()`) : carte compacte avec label, icône, valeur en mono,
 * sous-texte, et une barre de couleur à gauche selon la tonalité.
 * `disabled` couvre le CAS 4 de la mission (fonctionnalité hors Niveau 1) :
 * la carte garde son emplacement et son style exacts, seule la valeur
 * devient "—" avec un badge "À venir" — jamais retirée, jamais inventée. */
export type KpiTone = "crit" | "major" | "ok" | "brand" | "info";

export function Kpi({
  icon: Icon,
  label,
  value,
  unit,
  sub,
  tone,
  disabled,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  value?: React.ReactNode;
  unit?: string;
  sub?: string;
  tone?: KpiTone;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const tCommon = useTranslations("common");
  const Wrapper = onClick && !disabled ? "button" : "div";
  return (
    <Wrapper
      type={onClick && !disabled ? "button" : undefined}
      onClick={disabled ? undefined : onClick}
      className={`kpi${tone && !disabled ? ` tone-${tone}` : ""}`}
      style={onClick && !disabled ? { textAlign: "left", cursor: "pointer" } : disabled ? { opacity: 0.55 } : undefined}
      title={disabled ? tCommon("states.comingSoon") : undefined}
    >
      <div className="k-lab">
        <Icon width={14} height={14} strokeWidth={1.8} aria-hidden />
        {label}
      </div>
      <div className="k-val">
        {disabled ? "—" : value}
        {!disabled && unit && <span className="u">{unit}</span>}
      </div>
      <div className="k-sub">{disabled ? tCommon("states.comingSoon") : sub}</div>
    </Wrapper>
  );
}
