"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  getNetworkCashSummary,
  getStationCashDetail,
  getTankCash,
  type CashMode,
  type NetworkCashSummary,
  type StationCashDetail,
  type TankCash,
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
  const [data, setData] = useState<NetworkCashSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!organizationId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setData(await getNetworkCashSummary(organizationId, fromDate, toDate, mode));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [organizationId, fromDate, toDate, mode]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}

export function useStationCash(
  organizationId: string | null,
  stationId: string | null,
  fromDate: string,
  toDate: string,
  mode: CashMode = "calendar"
) {
  const [data, setData] = useState<StationCashDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!organizationId || !stationId) {
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getStationCashDetail(organizationId, stationId, fromDate, toDate, mode)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [organizationId, stationId, fromDate, toDate, mode]);

  return { data, loading, error };
}

export function useTankCash(
  organizationId: string | null,
  tankId: string | null,
  fromDate: string,
  toDate: string,
  mode: CashMode = "calendar"
) {
  const [data, setData] = useState<TankCash | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!organizationId || !tankId) {
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getTankCash(organizationId, tankId, fromDate, toDate, mode)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [organizationId, tankId, fromDate, toDate, mode]);

  return { data, loading, error };
}
