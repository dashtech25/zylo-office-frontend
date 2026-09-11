"use client";

import { Radio } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useCallback } from "react";

import { listHolykellAccounts, listTankSensorMappings, type HolykellAccountSyncStatus, type Tank, type TankSensorMapping } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { Badge, Card, CardSectionHeader, EmptyState, InfoRow, Stack, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/shared/ui";

import { PartStateBox, usePartData } from "./PartState";

// 1 = OK, 0 = KO côté Holykell (`ck_zlHolykellDevice_lastStatus`) ; null =
// jamais remonté de statut. L'état mesuré du registre est distinct de la
// vérité déclarée du mapping (validFrom/validUntil/active).
type SensorLiveState = "ok" | "ko" | "unknown" | "never";
function liveStateOf(mapping: TankSensorMapping): SensorLiveState {
  const live = mapping.live;
  if (!live || (live.hkLastSeenAt === null && live.lastValue === null)) return "never";
  if (live.hkLastStatus === 1) return "ok";
  if (live.hkLastStatus === 0) return "ko";
  return "unknown";
}

const SENSOR_TONE = { ok: "success", ko: "error", unknown: "neutral", never: "neutral" } as const;

interface AtgData {
  account: HolykellAccountSyncStatus | null;
  mappings: TankSensorMapping[];
}

/** Onglet « ATG » (prototype) réalisé avec la télémétrie réelle : compte
 * Holykell de l'organisation (console de transmission, dernière
 * synchronisation) et sondes mappées sur les cuves actives de la station,
 * enrichies de l'état *mesuré* du registre Holykell (dernière valeur, unité,
 * statut remonté, dernière visibilité) — voir `HolykellSensorLiveState`. La
 * console « Holykell » des Paramètres gère la connexion. Les cuves passées
 * sont déjà celles de la station (filtrage fait par l'écran parent). */
export function AtgTab({
  organizationId,
  tanks,
}: {
  organizationId: string;
  tanks: Tank[];
}) {
  const t = useTranslations("zyloLiquid.stationDetail.atgTab");
  const tTank = useTranslations("zyloLiquid.tankDetail");
  const tSync = useTranslations("zyloLiquid.settingsPage.holykell");
  const format = useFormatter();

  const activeTankIds = tanks.filter((tk) => tk.active).map((tk) => tk.id);
  const activeTankKey = activeTankIds.sort().join(",");
  const tankNameById = new Map(tanks.map((tk) => [tk.id, tk.displayName]));

  const load = useCallback(async (): Promise<AtgData> => {
    const ids = activeTankKey ? activeTankKey.split(",") : [];
    const [accounts, ...mappingPages] = await Promise.all([
      listHolykellAccounts(organizationId),
      ...ids.map((tankId) => listTankSensorMappings(organizationId, tankId)),
    ]);
    const account = [...accounts].sort((a, b) => (b.lastSyncAt ?? "").localeCompare(a.lastSyncAt ?? ""))[0] ?? null;
    return { account, mappings: mappingPages.flatMap((p) => p.data).filter((m) => m.active) };
  }, [organizationId, activeTankKey]);
  const state = usePartData(["zylo-liquid", "station-detail", "atg", organizationId, activeTankKey], load);

  function formatDateTime(iso: string | null): string {
    return iso
      ? format.dateTime(new Date(iso), { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
      : "—";
  }

  return (
    <PartStateBox state={state}>
      {(() => {
        if (state.status !== "ready") return null;
        const { account, mappings } = state.data;
        return (
          <Stack>
            <Card>
              <CardSectionHeader icon={Radio} title={t("consoleTitle")} />
              {!account ? (
                <p className="text-body-sm text-text-muted">{tSync("notConfigured")}</p>
              ) : (
                <>
                  <InfoRow
                    label={tSync("statusLabel")}
                    value={
                      <Badge tone={account.lastSyncStatus === "failed" ? "error" : "success"} dot>
                        {account.lastSyncStatus === "failed" ? tSync("disconnected") : tSync("connected")}
                      </Badge>
                    }
                  />
                  <InfoRow
                    label={tSync("lastSync")}
                    value={account.lastSyncAt ? formatDateTime(account.lastSyncAt) : tSync("never")}
                    mono
                  />
                  {account.lastSyncStatus === "failed" && account.lastSyncError && (
                    <p className="mt-1 text-caption text-error">{account.lastSyncError}</p>
                  )}
                </>
              )}
            </Card>

            <Card>
              <CardSectionHeader title={t("sensorsTitle")} />
              <p className="-mt-3 mb-1 text-body-sm text-text-muted">{t("note")}</p>
              {activeTankIds.length === 0 ? (
                <EmptyState icon={Radio} title={t("noTanks")} />
              ) : mappings.length === 0 ? (
                <EmptyState icon={Radio} title={t("empty")} />
              ) : (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>{t("columns.tank")}</TableHeaderCell>
                      <TableHeaderCell>{t("columns.measurement")}</TableHeaderCell>
                      <TableHeaderCell>{t("columns.sensor")}</TableHeaderCell>
                      <TableHeaderCell>{t("columns.lastValue")}</TableHeaderCell>
                      <TableHeaderCell>{t("columns.lastSeen")}</TableHeaderCell>
                      <TableHeaderCell>{t("columns.status")}</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {mappings.map((m) => {
                      const live = m.live;
                      const sensorLabel = live?.hkSensorName ?? live?.hkSerialNumber ?? String(m.hkSensorId);
                      const value =
                        live?.lastValue !== null && live?.lastValue !== undefined
                          ? `${format.number(live.lastValue, { maximumFractionDigits: 3 })}${live.hkUnit ? ` ${live.hkUnit}` : ""}`
                          : "—";
                      const liveState = liveStateOf(m);
                      return (
                        <TableRow key={m.id}>
                          <TableCell className="font-medium">{tankNameById.get(m.tankId) ?? "—"}</TableCell>
                          <TableCell>{tTank(`technical.measurementType.${m.measurementType}`)}</TableCell>
                          <TableCell className="tabular-nums text-text-muted">{sensorLabel}</TableCell>
                          <TableCell className="tabular-nums">{value}</TableCell>
                          <TableCell>{formatDateTime(live?.hkLastSeenAt ?? null)}</TableCell>
                          <TableCell>
                            <Badge tone={SENSOR_TONE[liveState]} dot>
                              {t(`sensorStatus.${liveState}`)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </Card>
          </Stack>
        );
      })()}
    </PartStateBox>
  );
}
