"use client";

import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";

import { useOrganization } from "@/core/organization/OrganizationContext";
import { EmptyState } from "@/shared/ui";
import { PageSpinner } from "@/shared/ui/Spinner";

import { useLeakEventsList } from "./_lib/useLeakEventsList";

/** Journal des tests de fuite statique — endpoint 11 (leak-events), déjà en
 * production. Accepte un filtre `?station=<id>` pour être ouvert
 * directement depuis le menu contextuel d'une ligne de la liste des
 * stations ("Voir les fuites"). */
export default function LeakEventsListPage() {
  const t = useTranslations("zyloLiquid.leaks");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const { currentOrganization } = useOrganization();
  const searchParams = useSearchParams();
  const stationId = searchParams.get("station") ?? undefined;
  const data = useLeakEventsList(currentOrganization?.id ?? null, stationId);

  function formatDateTime(iso: string): string {
    return format.dateTime(new Date(iso), { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  return (
    <>
      <div className="page-head">
        <div className="ph-text">
          <h1>{t("pageTitle")}</h1>
          <div className="ph-sub">{t("pageSubtitle", { count: data.rows.length, anomalies: data.anomalyCount })}</div>
        </div>
      </div>

      <div className="banner info">
        <div>{t("banner")}</div>
      </div>

      {data.error && (
        <div className="banner crit">
          <div>{data.error}</div>
        </div>
      )}

      {data.loading ? (
        <PageSpinner label={tCommon("states.loading")} />
      ) : data.rows.length === 0 ? (
        <EmptyState icon={AlertTriangle} title={t("empty")} />
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <div className="tw" style={{ border: "none" }}>
            <table className="t">
              <thead>
                <tr>
                  <th>{t("table.date")}</th>
                  <th>{t("table.station")}</th>
                  <th>{t("table.tank")}</th>
                  <th className="r">{t("table.rate")}</th>
                  <th>{t("table.result")}</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map(({ leak, tank, station, fuelProduct }) => (
                  <tr key={leak.id}>
                    <td className="mono small">{formatDateTime(leak.endTime)}</td>
                    <td>{station ? <Link href={`/zylo-liquid/stations/${station.id}`}>{station.code}</Link> : "—"}</td>
                    <td>
                      {tank?.displayName ?? "—"} · {fuelProduct?.name ?? "—"}
                    </td>
                    <td className="r mono">{leak.leakRateLph === null ? "—" : `${format.number(leak.leakRateLph, { maximumFractionDigits: 2 })} L/H`}</td>
                    <td>
                      <span className={`badge ${leak.result === "anomaly" ? "b-crit" : "b-ok"}`}>
                        <span className="dot" />
                        {t(`result.${leak.result}`)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
