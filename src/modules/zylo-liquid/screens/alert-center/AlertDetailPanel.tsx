"use client";

import { ArrowLeft, X, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button, Card, MetricCard, QuickActionButton, Tabs } from "@/shared/ui";
import { cn } from "@/shared/lib/cn";
import type { AlertSeverity, AlertType } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { AlertTypeBadge } from "@/modules/zylo-liquid/components/AlertTypeBadge";
import { SeverityBadge } from "@/modules/zylo-liquid/components/SeverityBadge";

export interface AlertDetailInfoRow {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
}

export interface AlertDetailQuickAction {
  icon: LucideIcon;
  label: string;
  /** Un seul bouton "mis en avant" par alerte — l'action principale
   * recommandée pour ce type, visuellement distincte des autres (pleine
   * couleur au lieu d'un simple contour). */
  highlighted?: boolean;
  onClick?: () => void;
}

export interface AlertDetailTabContent {
  /** Contenu déjà construit pour cet onglet (ex. Historique, une étape
   * ultérieure du chantier) — `undefined` affiche un état "à venir" neutre,
   * pour que l'onglet reste visible et navigable sans faire croire qu'il
   * est déjà construit. */
  context?: React.ReactNode;
  history?: React.ReactNode;
  actionsAndRecommendations?: React.ReactNode;
}

export interface AlertDetailKeyMetric {
  icon: LucideIcon;
  label: string;
  value: string;
}

export interface AlertDetailPanelProps {
  type: AlertType;
  title: string;
  severity: AlertSeverity;
  triggeredAtLabel: string;
  location: string;
  summaryMessage: string;
  keyMetrics: AlertDetailKeyMetric[];
  generalInfo: AlertDetailInfoRow[];
  causeIntro: string;
  causes: string[];
  impactMessage: string;
  quickActions: AlertDetailQuickAction[];
  autoResolveHint: string;
  onBack?: () => void;
  onClose?: () => void;
  otherTabsContent?: AlertDetailTabContent;
}

function GeneralInfoRow({ icon: Icon, label, value, valueClassName }: AlertDetailInfoRow) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="flex items-center gap-1.5 text-caption text-text-muted">
        <Icon className="size-3.5 shrink-0" aria-hidden />
        {label}
      </span>
      <span className={cn("text-body-sm font-medium text-text", valueClassName)}>{value}</span>
    </div>
  );
}

function ComingSoonTab({ label }: { label: string }) {
  return <p className="rounded-card border border-dashed border-border p-6 text-center text-body-sm text-text-muted">{label}</p>;
}

/** Panneau de détail d'une alerte (zone 4 du découpage validé) — s'affiche
 * à droite de la liste une fois une alerte sélectionnée. Purement
 * présentationnel : tout le contenu vient des props, rien n'est encore
 * branché à une vraie alerte ni à `GET /zylo-liquid/alerts/{id}`.
 *
 * Composé exclusivement d'atomes déjà existants (`AlertTypeBadge`,
 * `SeverityBadge`, `MetricCard`, `QuickActionButton`) — refonte 2026-09-20
 * suite au constat que la première version recomposait ces pièces
 * localement (icône+ton dupliqués, bouton stylé à la main), en violation de
 * la hiérarchie composants → blocs → page.
 *
 * Important (retour du 2026-09-20) : la grille "Informations générales /
 * Cause probable / Actions rapides" reste TOUJOURS confinée à la partie
 * basse du panneau, sous les onglets, en 3 colonnes — jamais étendue sur
 * toute la largeur de l'écran, y compris une fois ce panneau posé dans la
 * mise en page à 3 colonnes de la page complète (le panneau garde sa
 * largeur intrinsèque, imposée par sa colonne parente).
 *
 * Seul l'onglet "Détails" est construit dans cette étape — les trois
 * autres onglets restent navigables mais affichent un état "à venir" tant
 * qu'ils n'ont pas leur propre étape dans le cahier des alertes. */
export function AlertDetailPanel({
  type,
  title,
  severity,
  triggeredAtLabel,
  location,
  summaryMessage,
  keyMetrics,
  generalInfo,
  causeIntro,
  causes,
  impactMessage,
  quickActions,
  autoResolveHint,
  onBack,
  onClose,
  otherTabsContent,
}: AlertDetailPanelProps) {
  const t = useTranslations("zyloLiquid.alertCenter.detail");
  const [activeTab, setActiveTab] = useState("details");

  const detailsTabContent = (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-4">
          <h4 className="text-body-sm font-semibold text-text">{t("generalInfoTitle")}</h4>
          <div className="flex flex-col gap-3">
            {generalInfo.map((row, i) => (
              <GeneralInfoRow key={i} {...row} />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h4 className="text-body-sm font-semibold text-text">{t("probableCauseTitle")}</h4>
          <p className="text-body-sm text-text-muted">{causeIntro}</p>
          <ul className="flex flex-col gap-1.5 pl-1">
            {causes.map((cause, i) => (
              <li key={i} className="flex items-start gap-2 text-body-sm text-text">
                <span className="mt-2 size-1 shrink-0 rounded-full bg-text-muted" aria-hidden />
                {cause}
              </li>
            ))}
          </ul>
          <div className="mt-1 rounded-card border border-warning/20 bg-warning-muted p-3">
            <p className="text-caption font-semibold uppercase tracking-wide text-warning">{t("possibleImpactTitle")}</p>
            <p className="mt-1 text-body-sm text-text">{impactMessage}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h4 className="text-body-sm font-semibold text-text">{t("quickActionsTitle")}</h4>
          <div className="flex flex-col gap-2">
            {quickActions.map((action, i) => (
              <QuickActionButton key={i} icon={action.icon} highlighted={action.highlighted} onClick={action.onClick}>
                {action.label}
              </QuickActionButton>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-card border border-info/20 bg-info-muted p-3">
        <AlertTypeBadge type={type} size="sm" className="mt-0" />
        <p className="text-body-sm text-text">{autoResolveHint}</p>
      </div>
    </div>
  );

  return (
    <Card padding="none" className="flex flex-col overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-border-subtle p-5">
        <div className="flex items-center justify-between">
          <Button variant="link" size="inline" onClick={onBack}>
            <ArrowLeft className="size-4" aria-hidden />
            {t("backToList")}
          </Button>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="rounded-button p-1 text-text-muted hover:bg-surface-muted hover:text-text"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTypeBadge type={type} />
            <div>
              <h3 className="text-h4 font-semibold text-text">{title}</h3>
              <p className="mt-0.5 text-body-sm text-text-muted">{location}</p>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <SeverityBadge severity={severity} />
            <span className="text-caption text-text-muted">{triggeredAtLabel}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-5 p-5">
        <div className="rounded-card border border-error/20 bg-error-muted p-3 text-body-sm text-text">{summaryMessage}</div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {keyMetrics.map((metric, i) => (
            <MetricCard key={i} {...metric} />
          ))}
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          items={[
            { value: "details", label: t("tabDetails"), content: detailsTabContent },
            { value: "context", label: t("tabContext"), content: otherTabsContent?.context ?? <ComingSoonTab label={t("comingSoon")} /> },
            { value: "history", label: t("tabHistory"), content: otherTabsContent?.history ?? <ComingSoonTab label={t("comingSoon")} /> },
            {
              value: "actions",
              label: t("tabActions"),
              content: otherTabsContent?.actionsAndRecommendations ?? <ComingSoonTab label={t("comingSoon")} />,
            },
          ]}
        />
      </div>
    </Card>
  );
}
