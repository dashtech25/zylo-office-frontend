"use client";

import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";

import { useOrganization } from "@/core/organization/OrganizationContext";
import { Alert, Badge, Card, EmptyState, PageHeader, Stack, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/shared/ui";
import { PageSpinner } from "@/shared/ui/Spinner";

import { useLeakEventsList } from "./useLeakEventsList";

/** Journal des tests de fuite statique — endpoint 11 (leak-events), déjà en
 * production. Accepte un filtre `?station=<id>` pour être ouvert
 * directement depuis le menu contextuel d'une ligne de la liste des
 * stations ("Voir les fuites"). */
export default function LeaksScreen() {
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
    <Stack>
      <PageHeader title={t("pageTitle")} description={t("pageSubtitle", { count: data.rows.length, anomalies: data.anomalyCount })} />

      <Alert tone="info">{t("banner")}</Alert>

      {data.error && <Alert tone="error">{data.error}</Alert>}

      {data.loading ? (
        <PageSpinner label={tCommon("states.loading")} />
      ) : data.rows.length === 0 ? (
        <EmptyState icon={AlertTriangle} title={t("empty")} />
      ) : (
        <Card padding="none">
          <div className="p-5">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>{t("table.date")}</TableHeaderCell>
                  <TableHeaderCell>{t("table.station")}</TableHeaderCell>
                  <TableHeaderCell>{t("table.tank")}</TableHeaderCell>
                  <TableHeaderCell className="text-right">{t("table.rate")}</TableHeaderCell>
                  <TableHeaderCell>{t("table.result")}</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.rows.map(({ leak, tank, station, fuelProduct }) => (
                  <TableRow key={leak.id}>
                    <TableCell className="font-mono tabular-nums">{formatDateTime(leak.endTime)}</TableCell>
                    <TableCell>{station ? <Link href={`/zylo-liquid/stations/${station.id}`} className="text-primary hover:underline">{station.code}</Link> : "—"}</TableCell>
                    <TableCell>
                      {tank?.displayName ?? "—"} · {fuelProduct?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{leak.leakRateLph === null ? "—" : `${format.number(leak.leakRateLph, { maximumFractionDigits: 2 })} L/H`}</TableCell>
                    <TableCell>
                      <Badge tone={leak.result === "anomaly" ? "error" : "success"} dot>
                        {t(`result.${leak.result}`)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </Stack>
  );
}
