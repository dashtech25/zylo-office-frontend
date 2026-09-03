"use client";

import { AlertTriangle, Check, Printer } from "lucide-react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";

import { useOrganization } from "@/core/organization/OrganizationContext";
import { PageSpinner } from "@/shared/ui/Spinner";

import { useAlertsList, type AlertStatusFilter } from "./_lib/useAlertsList";

const STATUS_VALUES: AlertStatusFilter[] = ["active", "resolved", "all"];

/** Reproduit fidèlement la structure du "Centre d'alertes" du prototype
 * validé (prototype.html, page /alertes) : bandeau de filtres, liste de
 * cartes .alarm triées par ancienneté. Le prototype affiche aussi une
 * répartition par gravité (Critique/Majeur/Mineur/Informationnel) et des
 * champs de catalogue métier (délai de réaction attendu, action attendue,
 * responsable, escalade) — aucun des deux n'existe dans le modèle Alert
 * réel du Niveau 1 (type/status/triggeredValue/thresholdValue seulement,
 * aucune gravité, aucun catalogue de traitement) : plutôt que d'inventer
 * une classification ou un texte de procédure, cette page se limite aux
 * champs réellement enregistrés. Voir
 * docs/modules/zylo-liquid/phase-3-prototype-compatibility-matrix.md
 * (item #16, "catalogue de traitement" classé PRÉSENTER MAIS DÉSACTIVER). */
export default function AlertsListPage() {
  const t = useTranslations("zyloLiquid.alerts");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const { currentOrganization } = useOrganization();
  const [statusFilter, setStatusFilter] = useState<AlertStatusFilter>("active");
  const data = useAlertsList(currentOrganization?.id ?? null, statusFilter);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  function formatDateTime(iso: string): string {
    return format.dateTime(new Date(iso), { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  async function handleResolve(alertId: string) {
    setResolvingId(alertId);
    try {
      await data.resolve(alertId);
    } finally {
      setResolvingId(null);
    }
  }

  return (
    <>
      <div className="page-head">
        <div className="ph-text">
          <h1>{t("page.title")}</h1>
          <div className="ph-sub">{t("page.subtitle", { count: data.rows.length })}</div>
        </div>
        <div className="page-actions no-print">
          <button type="button" className="btn" onClick={() => window.print()}>
            <Printer width={16} height={16} strokeWidth={1.8} aria-hidden />
            {t("page.print")}
          </button>
        </div>
      </div>

      {data.error && (
        <div className="banner crit">
          <div>{data.error}</div>
        </div>
      )}

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="row">
          <select className="f" style={{ width: "auto" }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as AlertStatusFilter)} aria-label={t("page.filterStatus")}>
            <option value="all">{t("page.filterStatus")}</option>
            {STATUS_VALUES.filter((v) => v !== "all").map((value) => (
              <option key={value} value={value}>
                {t(`page.status.${value}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {data.loading ? (
        <PageSpinner label={tCommon("states.loading")} />
      ) : data.rows.length === 0 ? (
        <div className="empty">
          <div className="e-t">{t("empty")}</div>
        </div>
      ) : (
        <div className="stack">
          {data.rows.map(({ alert, tank, station }) => {
            const critical = alert.type === "leak" || alert.type === "level_high";
            return (
              <div key={alert.id} className={`alarm ${critical ? "sev-CRITIQUE" : "sev-MAJEUR"}${alert.status === "resolved" ? " resolved" : ""}`}>
                <div className="a-ic">
                  <AlertTriangle width={18} height={18} strokeWidth={1.8} color={critical ? "var(--crit)" : "var(--major)"} aria-hidden />
                </div>
                <div className="a-main">
                  <div className="a-title">
                    {t(`types.${alert.type}`)}
                    <span className={`badge ${alert.status === "active" ? (critical ? "b-crit" : "b-major") : "b-ok"}`}>
                      <span className="dot" />
                      {t(`page.status.${alert.status}`)}
                    </span>
                  </div>
                  <div className="a-meta">
                    {station && (
                      <Link href={`/zylo-liquid/stations/${station.id}`}>{station.name}</Link>
                    )}
                    {station && tank && " · "}
                    {station && tank && (
                      <Link href={`/zylo-liquid/stations/${station.id}/tanks/${tank.id}`}>{tank.displayName}</Link>
                    )}
                    {" — "}
                    {formatDateTime(alert.triggeredAt)}
                  </div>
                  {(alert.triggeredValue !== null || alert.thresholdValue !== null) && (
                    <div className="a-vals">
                      {alert.triggeredValue !== null && (
                        <div className="kv">
                          <div className="k">{t("page.triggeredValue")}</div>
                          <div className="v">{format.number(alert.triggeredValue, { maximumFractionDigits: 1 })} mm</div>
                        </div>
                      )}
                      {alert.thresholdValue !== null && (
                        <div className="kv">
                          <div className="k">{t("page.thresholdValue")}</div>
                          <div className="v">{format.number(alert.thresholdValue, { maximumFractionDigits: 1 })} mm</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="a-side">
                  {station && tank && (
                    <Link className="btn sm" href={`/zylo-liquid/stations/${station.id}/tanks/${tank.id}`}>
                      {tCommon("actions.open")}
                    </Link>
                  )}
                  {alert.status === "active" && (
                    <button type="button" className="btn sm primary" onClick={() => handleResolve(alert.id)} disabled={resolvingId === alert.id}>
                      <Check width={14} height={14} strokeWidth={1.8} aria-hidden />
                      {t("page.resolve")}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
