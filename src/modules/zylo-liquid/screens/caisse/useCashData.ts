"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getNetworkCashSummary,
  getStationCashDetail,
  getTankCash,
  type CashMode,
} from "@/modules/zylo-liquid/services/zyloLiquidApi";

export type CashQuickPeriod = "today" | "yesterday" | "7d" | "30d" | "custom";

/** "Aujourd'hui" = minuit local -> maintenant (page_caisse.md §J) : même
 * convention que l'onglet Rapports (useReportsData.ts), pour que "minuit"
 * signifie la même chose partout dans Zylo Liquid plutôt que de réinventer
 * une résolution par fuseau de station non exploitée ailleurs à ce jour. */
function quickPeriodToRange(period: CashQuickPeriod): { from: Date; to: Date } {
  const now = new Date();
  const todayMidnight = new Date(now);
  todayMidnight.setHours(0, 0, 0, 0);

  switch (period) {
    case "today":
      return { from: todayMidnight, to: now };
    case "yesterday": {
      const yesterdayMidnight = new Date(todayMidnight);
      yesterdayMidnight.setDate(yesterdayMidnight.getDate() - 1);
      return { from: yesterdayMidnight, to: todayMidnight };
    }
    case "7d":
      return { from: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), to: now };
    case "30d":
      return { from: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), to: now };
    case "custom":
      return { from: todayMidnight, to: now };
  }
}

export function useCashPeriod() {
  const [quickPeriod, setQuickPeriodRaw] = useState<CashQuickPeriod>("today");
  const [customFrom, setCustomFrom] = useState<string>("");
  const [customTo, setCustomTo] = useState<string>("");
  const [isOperationalDay, setIsOperationalDay] = useState(false);

  function setQuickPeriod(period: CashQuickPeriod) {
    setQuickPeriodRaw(period);
    if (period !== "today") setIsOperationalDay(false);
  }

  const range = useMemo(() => {
    if (quickPeriod === "custom" && customFrom && customTo) {
      return { from: new Date(customFrom), to: new Date(customTo) };
    }
    return quickPeriodToRange(quickPeriod);
  }, [quickPeriod, customFrom, customTo]);

  return {
    quickPeriod,
    setQuickPeriod,
    customFrom,
    setCustomFrom,
    customTo,
    setCustomTo,
    isOperationalDay,
    setIsOperationalDay,
    fromDate: range.from.toISOString(),
    toDate: range.to.toISOString(),
    mode: (isOperationalDay && quickPeriod === "today" ? "operational" : "calendar") as CashMode,
  };
}

export function useNetworkCash(organizationId: string | null, fromDate: string, toDate: string, mode: CashMode = "calendar") {
  const queryClient = useQueryClient();
  const queryKey = ["zylo-liquid", "network-cash", organizationId, fromDate, toDate, mode];

  const query = useQuery({
    queryKey,
    queryFn: () => getNetworkCashSummary(organizationId as string, fromDate, toDate, mode),
    enabled: !!organizationId,
  });

  async function reload() {
    await queryClient.invalidateQueries({ queryKey });
  }

  return {
    data: query.data ?? null,
    loading: !!organizationId && query.isPending,
    error: query.error ? (query.error instanceof Error ? query.error.message : String(query.error)) : null,
    reload,
  };
}

export function useStationCash(
  organizationId: string | null,
  stationId: string | null,
  fromDate: string,
  toDate: string,
  mode: CashMode = "calendar"
) {
  const query = useQuery({
    queryKey: ["zylo-liquid", "station-cash", organizationId, stationId, fromDate, toDate, mode],
    queryFn: () => getStationCashDetail(organizationId as string, stationId as string, fromDate, toDate, mode),
    enabled: !!organizationId && !!stationId,
  });

  return {
    data: query.data ?? null,
    loading: !!organizationId && !!stationId && query.isPending,
    error: query.error ? (query.error instanceof Error ? query.error.message : String(query.error)) : null,
  };
}

export function useTankCash(
  organizationId: string | null,
  tankId: string | null,
  fromDate: string,
  toDate: string,
  mode: CashMode = "calendar"
) {
  const query = useQuery({
    queryKey: ["zylo-liquid", "tank-cash", organizationId, tankId, fromDate, toDate, mode],
    queryFn: () => getTankCash(organizationId as string, tankId as string, fromDate, toDate, mode),
    enabled: !!organizationId && !!tankId,
  });

  return {
    data: query.data ?? null,
    loading: !!organizationId && !!tankId && query.isPending,
    error: query.error ? (query.error instanceof Error ? query.error.message : String(query.error)) : null,
  };
}
