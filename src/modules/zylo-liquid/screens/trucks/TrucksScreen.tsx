"use client";

import { Bell, Loader2, Maximize2, Minimize2, Plus, Search, Truck as TruckIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { useOrganization } from "@/core/organization/OrganizationContext";
import { TrucksMap, type TruckMapPoint, type TruckMapStatus, type TruckMapStop } from "@/modules/zylo-liquid/components/TrucksMap";
import type { GpsDevice, TraccarDeviceListItem, Truck, TruckCurrentPosition, TruckPositionPing, TruckStopComment, TruckStopEvent } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import {
  Alert, Badge, Button, Card, EmptyState, FormField, Input, Modal, PageHeader, SearchableSelect, Tabs,
  Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow,
} from "@/shared/ui";
import { Skeleton, TableRowSkeleton } from "@/shared/ui/Skeleton";

import { TrackingLocationsTab } from "./TrackingLocationsTab";
import { TruckStopReconciliationTab } from "./TruckStopReconciliationTab";
import { useTrucks } from "./useTrucks";

const STOP_WINDOW_HOURS = 24;
/** Une position plus vieille que ça est considérée "inconnue" plutôt que
 * "en mouvement" — évite d'afficher un camion comme actif alors que son
 * boîtier n'a plus rien envoyé depuis longtemps. */
const STALE_POSITION_MINUTES = 60;

/** Écran réseau « Camions » (mission « tracking », étape 1 — position +
 * arrêts sur carte, 2026-09-11) — un camion dessert plusieurs stations,
 * jamais un onglet du Centre administratif d'une station. Deux vues :
 * Liste (référentiel, prérequis pour associer un boîtier GPS — n'existait
 * pas avant ce lot) et Carte (position en direct + trajet + arrêts). */
export default function TrucksScreen() {
  const t = useTranslations("zyloLiquid.trucks");
  const { currentOrganization } = useOrganization();
  const data = useTrucks(currentOrganization?.id ?? null);

  const [tab, setTab] = useState("list");
  const [truckFormOpen, setTruckFormOpen] = useState(false);
  const [editingTruck, setEditingTruck] = useState<Truck | null>(null);
  const [deviceModalTruck, setDeviceModalTruck] = useState<Truck | null>(null);
  const [ingestModalOpen, setIngestModalOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t("pageTitle")}
        description={t("pageSubtitle")}
        actions={<Button variant="outline" size="sm" onClick={() => setIngestModalOpen(true)}>{t("ingest.action")}</Button>}
      />
      {data.error && <Alert tone="error">{data.error}</Alert>}

      <Tabs
        value={tab}
        onValueChange={setTab}
        items={[
          {
            value: "list",
            label: t("tabs.list"),
            content: (
              <TrucksListTab
                data={data}
                onCreate={() => {
                  setEditingTruck(null);
                  setTruckFormOpen(true);
                }}
                onEdit={(truck) => {
                  setEditingTruck(truck);
                  setTruckFormOpen(true);
                }}
                onManageDevice={(truck) => setDeviceModalTruck(truck)}
              />
            ),
          },
          { value: "map", label: t("tabs.map"), content: <TrucksMapTab data={data} /> },
          { value: "locations", label: t("tabs.locations"), content: <TrackingLocationsTab data={data} /> },
          {
            value: "reconciliation",
            label: `${t("tabs.reconciliation")}${data.reconciliations.filter((r) => r.status === "pending").length > 0 ? ` (${data.reconciliations.filter((r) => r.status === "pending").length})` : ""}`,
            content: <TruckStopReconciliationTab data={data} />,
          },
        ]}
      />

      <TruckFormModal data={data} truck={editingTruck} open={truckFormOpen} onOpenChange={setTruckFormOpen} />
      <GpsDeviceFormModal data={data} truck={deviceModalTruck} open={deviceModalTruck !== null} onOpenChange={(next) => { if (!next) setDeviceModalTruck(null); }} />
      <IngestCredentialModal data={data} open={ingestModalOpen} onOpenChange={setIngestModalOpen} />
    </div>
  );
}

function IngestCredentialModal({
  data,
  open,
  onOpenChange,
}: {
  data: ReturnType<typeof useTrucks>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("zyloLiquid.trucks.ingest");
  const tCommon = useTranslations("common");
  const [secret, setSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSecret(null);
    setLoading(true);
    data.fetchIngestCredential().then((token) => {
      setSecret(token);
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleRegenerate() {
    setRegenerating(true);
    const token = await data.regenerateIngestCredential();
    setSecret(token);
    setRegenerating(false);
  }

  async function handleCopy() {
    if (!secret) return;
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={t("title")} size="md" closeLabel={tCommon("actions.close")}>
      <div className="flex flex-col gap-4">
        <p className="text-body-sm text-text-muted">{t("description")}</p>
        {loading ? (
          <p className="text-body-sm text-text-muted">{tCommon("states.loading")}</p>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Input readOnly value={secret ?? ""} />
              <Button variant="outline" size="sm" onClick={handleCopy}>{copied ? tCommon("actions.copied") : tCommon("actions.copy")}</Button>
            </div>
            <Alert tone="warning">{t("warning")}</Alert>
            <div>
              <Button variant="outline" size="sm" loading={regenerating} onClick={handleRegenerate}>{t("regenerate")}</Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

function TrucksListTab({
  data,
  onCreate,
  onEdit,
  onManageDevice,
}: {
  data: ReturnType<typeof useTrucks>;
  onCreate: () => void;
  onEdit: (truck: Truck) => void;
  onManageDevice: (truck: Truck) => void;
}) {
  const t = useTranslations("zyloLiquid.trucks");

  return (
    <div className="flex flex-col gap-4 pt-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={onCreate}>
          <Plus className="size-4" aria-hidden />
          {t("newTruck")}
        </Button>
      </div>

      <Card padding="none">
        <div className="p-5">
          {!data.loading && data.trucks.length === 0 ? (
            <EmptyState icon={TruckIcon} title={t("empty")} />
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>{t("table.plate")}</TableHeaderCell>
                  <TableHeaderCell>{t("table.carrier")}</TableHeaderCell>
                  <TableHeaderCell>{t("table.gpsDevice")}</TableHeaderCell>
                  <TableHeaderCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {data.loading
                  ? Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} columns={4} />)
                  : data.trucks.map((truck) => {
                      const carrier = data.carriers.find((c) => c.id === truck.carrierId);
                      const device = data.gpsDevices.find((d) => d.truckId === truck.id && d.active);
                      return (
                        <TableRow key={truck.id}>
                          <TableCell className="font-medium text-text">{truck.plateNumber}</TableCell>
                          <TableCell>{carrier?.name ?? "—"}</TableCell>
                          <TableCell>
                            {device ? (
                              <Badge tone="success">{device.deviceIdentifier}</Badge>
                            ) : (
                              <Badge tone="neutral">{t("noGpsDevice")}</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => onManageDevice(truck)}>{t("manageDevice")}</Button>
                              <Button variant="outline" size="sm" onClick={() => onEdit(truck)}>{t("edit")}</Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>
    </div>
  );
}

/** Statut de connectivité d'un boîtier tel qu'affiché dans la barre
 * latérale en plein écran (calqué sur l'interface Traccar montrée par le
 * commanditaire : point vert « En ligne » / point rouge « il y a X
 * heures »). Dérivé de la fraîcheur de la dernière position reçue, même
 * seuil que le statut affiché sur la carte (`STALE_POSITION_MINUTES`). */
function deviceConnectivityLabel(recordedAt: string | null, t: ReturnType<typeof useTranslations>): { label: string; online: boolean } {
  if (!recordedAt) return { label: t("neverSeen"), online: false };
  const ms = Date.now() - new Date(recordedAt).getTime();
  if (ms <= STALE_POSITION_MINUTES * 60 * 1000) return { label: t("online"), online: true };
  const hours = Math.round(ms / (60 * 60 * 1000));
  if (hours < 1) return { label: t("lastSeenMinutes", { minutes: Math.max(1, Math.round(ms / 60000)) }), online: false };
  return { label: t("lastSeenHours", { hours }), online: false };
}

function TruckSidebar({
  trucks,
  currentPositions,
  gpsDevices,
  selectedTruckId,
  onSelect,
  t,
  height,
}: {
  trucks: Truck[];
  currentPositions: TruckCurrentPosition[];
  gpsDevices: GpsDevice[];
  selectedTruckId: string | null;
  onSelect: (id: string) => void;
  t: ReturnType<typeof useTranslations>;
  height: number | string;
}) {
  const [query, setQuery] = useState("");
  const filtered = trucks.filter((tr) => tr.plateNumber.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="flex w-72 shrink-0 flex-col overflow-hidden border-r border-border-subtle bg-surface" style={{ height }}>
      <div className="flex items-center gap-2 border-b border-border-subtle p-3">
        <Search className="size-4 text-text-muted" aria-hidden />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchTrucks")}
          className="w-full bg-transparent text-body-sm text-text outline-none placeholder:text-text-muted"
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && <p className="p-4 text-body-sm text-text-muted">{t("noTruckMatch")}</p>}
        {filtered.map((truck) => {
          const hasActiveDevice = gpsDevices.some((d) => d.truckId === truck.id && d.active);
          const pos = currentPositions.find((p) => p.truckId === truck.id);
          const selected = truck.id === selectedTruckId;
          // Un camion sans boîtier actif n'a jamais de statut "en ligne
          // depuis..." à afficher — étiquette distincte, pour ne jamais
          // laisser croire qu'on a juste perdu le signal récemment
          // (scénario 2 : historique préservé mais camion sans boîtier,
          // corrigé après un test réel qui a révélé ce trou d'interface).
          const connectivity = hasActiveDevice ? deviceConnectivityLabel(pos?.recordedAt ?? null, t) : { label: t("noActiveDevice"), online: false };
          return (
            <button
              key={truck.id}
              type="button"
              onClick={() => onSelect(truck.id)}
              className={`flex w-full items-start gap-2 border-b border-border-subtle px-3 py-2.5 text-left transition-colors ${selected ? "bg-primary-muted" : "hover:bg-surface-muted"}`}
            >
              <span
                className="mt-1.5 size-2 shrink-0 rounded-full"
                style={{ background: hasActiveDevice ? (connectivity.online ? "#1F9D55" : "#DC2626") : "#94A3B8" }}
                aria-hidden
              />
              <span className="flex flex-col">
                <span className="text-body-sm font-medium text-text">{truck.plateNumber}</span>
                <span className="text-body-xs" style={{ color: hasActiveDevice ? (connectivity.online ? "#1F9D55" : "#DC2626") : "#64748B" }}>{connectivity.label}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

type PeriodOption = "today" | "yesterday" | "7d" | "custom";

/** Bornes since/until dérivées du choix de période (scénario carte,
 * correctif du 2026-09-13) — remplace l'ancienne fenêtre fixe unique
 * (STOP_WINDOW_HOURS = toujours "24h avant maintenant") : "trajet actuel"
 * et "trajet passé" utilisent désormais le même mécanisme, seule la
 * période choisie change. */
function resolvePeriodBounds(period: PeriodOption, customFrom: string, customTo: string): { since: Date; until: Date } {
  const now = new Date();
  if (period === "today") {
    const since = new Date(now);
    since.setHours(0, 0, 0, 0);
    return { since, until: now };
  }
  if (period === "yesterday") {
    const since = new Date(now);
    since.setDate(since.getDate() - 1);
    since.setHours(0, 0, 0, 0);
    const until = new Date(since);
    until.setHours(23, 59, 59, 999);
    return { since, until };
  }
  if (period === "7d") {
    return { since: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), until: now };
  }
  // custom
  const since = customFrom ? new Date(customFrom) : new Date(now.getTime() - STOP_WINDOW_HOURS * 60 * 60 * 1000);
  const until = customTo ? new Date(customTo) : now;
  return { since, until };
}

function PeriodSelector({
  period,
  onPeriodChange,
  customFrom,
  customTo,
  onCustomFromChange,
  onCustomToChange,
  t,
}: {
  period: PeriodOption;
  onPeriodChange: (p: PeriodOption) => void;
  customFrom: string;
  customTo: string;
  onCustomFromChange: (v: string) => void;
  onCustomToChange: (v: string) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const options: PeriodOption[] = ["today", "yesterday", "7d", "custom"];
  return (
    <div className="flex flex-wrap items-center gap-2">
      {options.map((opt) => (
        <Button key={opt} type="button" size="sm" variant={period === opt ? "primary" : "outline"} onClick={() => onPeriodChange(opt)}>
          {t(`period.${opt}`)}
        </Button>
      ))}
      {period === "custom" && (
        <div className="flex items-center gap-2">
          <Input type="date" value={customFrom} onChange={(e) => onCustomFromChange(e.target.value)} className="w-auto" />
          <span className="text-body-sm text-text-muted">→</span>
          <Input type="date" value={customTo} onChange={(e) => onCustomToChange(e.target.value)} className="w-auto" />
        </div>
      )}
    </div>
  );
}

function TrucksMapTab({ data }: { data: ReturnType<typeof useTrucks> }) {
  const t = useTranslations("zyloLiquid.trucks.map");
  const [selectedTruckId, setSelectedTruckId] = useState<string | null>(null);
  const [positions, setPositions] = useState<TruckPositionPing[]>([]);
  const [stops, setStops] = useState<TruckStopEvent[]>([]);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [period, setPeriod] = useState<PeriodOption>("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const fullscreenRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(document.fullscreenElement === fullscreenRef.current);
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void fullscreenRef.current?.requestFullscreen();
    }
  }

  useEffect(() => {
    if (!selectedTruckId) {
      setPositions([]);
      setStops([]);
      return;
    }
    let cancelled = false;
    setLoadingRoute(true);
    const { since, until } = resolvePeriodBounds(period, customFrom, customTo);
    (async () => {
      const [pos, stopEvents] = await Promise.all([
        data.fetchTruckPositions(selectedTruckId, { since: since.toISOString(), until: until.toISOString() }),
        data.fetchTruckStops(selectedTruckId, { since: since.toISOString(), until: until.toISOString() }),
      ]);
      if (cancelled) return;
      setPositions(pos);
      setStops(stopEvents);
      setLoadingRoute(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTruckId, period, customFrom, customTo]);

  const now = Date.now();
  const truckPoints: TruckMapPoint[] = data.currentPositions
    .filter((p): p is typeof p & { latitude: number; longitude: number } => p.latitude !== null && p.longitude !== null)
    .map((p) => {
      const truck = data.trucks.find((tk) => tk.id === p.truckId);
      const isStale = !p.recordedAt || now - new Date(p.recordedAt).getTime() > STALE_POSITION_MINUTES * 60 * 1000;
      const status: TruckMapStatus = isStale ? "unknown" : p.currentStop ? "stopped" : "moving";
      return { id: p.truckId, label: truck?.plateNumber ?? p.truckId, latitude: p.latitude, longitude: p.longitude, status };
    });

  const route: [number, number][] = positions.map((p) => [p.longitude, p.latitude]);
  const mapStops: TruckMapStop[] = stops.map((s) => ({
    latitude: s.latitude,
    longitude: s.longitude,
    durationLabel: formatStopDuration(s, t),
  }));

  const selectedTruck = selectedTruckId ? data.trucks.find((tk) => tk.id === selectedTruckId) : null;
  const stoppedTrucks = data.currentPositions.filter((p) => p.currentStop !== null);

  const mapHeight = isFullscreen ? "100vh" : 520;
  const hasDataForPeriod = positions.length > 0 || stops.length > 0;

  return (
    <div
      ref={fullscreenRef}
      className={isFullscreen ? "flex h-screen w-screen flex-row bg-surface" : "flex flex-col gap-3 pt-4 lg:flex-row"}
    >
      <TruckSidebar
        trucks={data.trucks}
        currentPositions={data.currentPositions}
        gpsDevices={data.gpsDevices}
        selectedTruckId={selectedTruckId}
        onSelect={setSelectedTruckId}
        t={t}
        height={mapHeight}
      />

      <div className={isFullscreen ? "flex flex-1 flex-col" : "flex flex-1 flex-col gap-3"}>
        {!isFullscreen && (
          <PeriodSelector
            period={period}
            onPeriodChange={setPeriod}
            customFrom={customFrom}
            customTo={customTo}
            onCustomFromChange={setCustomFrom}
            onCustomToChange={setCustomTo}
            t={t}
          />
        )}
        <div className="relative flex-1">
        {data.loading ? (
          <Skeleton variant="rectangular" className="w-full" style={{ height: mapHeight }} />
        ) : (
          <TrucksMap
            trucks={truckPoints}
            route={route}
            stops={mapStops}
            selectedTruckId={selectedTruckId}
            onTruckClick={setSelectedTruckId}
            height={mapHeight}
          />
        )}

        <button
          type="button"
          onClick={toggleFullscreen}
          title={isFullscreen ? t("exitFullscreen") : t("enterFullscreen")}
          aria-label={isFullscreen ? t("exitFullscreen") : t("enterFullscreen")}
          className="absolute top-2.5 left-2.5 z-10 flex size-[29px] items-center justify-center rounded border-none bg-white shadow-[0_0_0_2px_rgba(0,0,0,.1)]"
        >
          {isFullscreen ? <Minimize2 size={15} color="#333" /> : <Maximize2 size={15} color="#333" />}
        </button>

        {isFullscreen && (
          <div className="absolute top-2.5 right-2.5 z-10">
            <button
              type="button"
              onClick={() => setAlertsOpen((v) => !v)}
              title={t("alerts")}
              aria-label={t("alerts")}
              className="relative flex size-[29px] items-center justify-center rounded border-none bg-white shadow-[0_0_0_2px_rgba(0,0,0,.1)]"
            >
              <Bell size={15} color="#333" />
              {stoppedTrucks.length > 0 && (
                <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-warning text-[10px] font-semibold text-white">
                  {stoppedTrucks.length}
                </span>
              )}
            </button>
            {alertsOpen && (
              <div className="absolute top-9 right-0 min-w-[220px] rounded-card bg-white p-2 shadow-lg">
                {stoppedTrucks.length === 0 ? (
                  <p className="p-2 text-body-sm text-text-muted">{t("noActiveStop")}</p>
                ) : (
                  stoppedTrucks.map((p) => {
                    const truck = data.trucks.find((tk) => tk.id === p.truckId);
                    return (
                      <button
                        key={p.truckId}
                        type="button"
                        onClick={() => {
                          setSelectedTruckId(p.truckId);
                          setAlertsOpen(false);
                        }}
                        className="block w-full rounded px-2 py-1.5 text-left text-body-sm text-text hover:bg-surface-muted"
                      >
                        {truck?.plateNumber ?? p.truckId} — {t("stoppedNow")}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}

        {!isFullscreen && selectedTruck && (
          <div className="absolute bottom-2.5 left-1/2 z-10 -translate-x-1/2 rounded-card bg-white px-3 py-1.5 text-body-sm text-text shadow-[0_0_0_2px_rgba(0,0,0,.1)]">
            {loadingRoute
              ? t("loadingRoute")
              : hasDataForPeriod
                ? t("stopsCount", { count: stops.length })
                : t("noDataForPeriod")}
          </div>
        )}
        </div>
      </div>

      {!isFullscreen && (
        <Card padding="none" className="lg:w-80">
          <div className="p-4">
            {!selectedTruck ? (
              <p className="text-body-sm text-text-muted">{t("selectHint")}</p>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-body-md font-semibold text-text">{selectedTruck.plateNumber}</p>
                {loadingRoute ? (
                  <p className="text-body-sm text-text-muted">{t("loadingRoute")}</p>
                ) : !hasDataForPeriod ? (
                  <p className="text-body-sm text-text-muted">{t("noDataForPeriod")}</p>
                ) : (
                  <>
                    <p className="text-body-sm text-text-muted">{t("stopsCount", { count: stops.length })}</p>
                    <ul className="flex flex-col gap-2">
                      {stops.map((s) => (
                        <li key={s.id} className="rounded-card border border-border-subtle px-3 py-2 text-body-sm">
                          <div className="text-text">{new Date(s.startAt).toLocaleString()}</div>
                          <div className="text-text-muted">{formatStopDuration(s, t)}</div>
                          <StopCommentsSection data={data} stopId={s.id} />
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

function formatStopDuration(stop: TruckStopEvent, t: ReturnType<typeof useTranslations>): string {
  const end = stop.endAt ? new Date(stop.endAt) : new Date();
  const minutes = Math.max(0, Math.round((end.getTime() - new Date(stop.startAt).getTime()) / 60000));
  return stop.endAt ? t("stopDuration", { minutes }) : t("stopOngoing", { minutes });
}

/** Commentaires sur un arrêt (scénario 7, validé avec le commanditaire) —
 * illimités par arrêt, modifiables et supprimables (version simple
 * assumée), jamais liés automatiquement au traitement d'une alerte. */
function StopCommentsSection({ data, stopId }: { data: ReturnType<typeof useTrucks>; stopId: string }) {
  const t = useTranslations("zyloLiquid.trucks.comments");
  const [expanded, setExpanded] = useState(false);
  const [comments, setComments] = useState<TruckStopComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [newBody, setNewBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");

  async function load() {
    setLoading(true);
    try {
      setComments(await data.fetchStopComments(stopId));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (expanded) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  async function handleAdd() {
    if (!newBody.trim()) return;
    setSubmitting(true);
    try {
      await data.addStopComment(stopId, newBody.trim());
      setNewBody("");
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveEdit(commentId: string) {
    if (!editBody.trim()) return;
    await data.editStopComment(commentId, editBody.trim());
    setEditingId(null);
    await load();
  }

  async function handleDelete(commentId: string) {
    await data.removeStopComment(commentId);
    await load();
  }

  return (
    <div className="mt-1.5 border-t border-border-subtle pt-1.5">
      <button type="button" onClick={() => setExpanded((v) => !v)} className="text-body-xs font-medium text-primary hover:underline">
        {expanded ? t("hide") : t("show", { count: comments.length })}
      </button>
      {expanded && (
        <div className="mt-2 flex flex-col gap-2">
          {loading ? (
            <p className="text-body-xs text-text-muted">{t("loading")}</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {comments.map((c) => (
                <li key={c.id} className="rounded bg-surface-muted px-2 py-1.5 text-body-xs">
                  {editingId === c.id ? (
                    <div className="flex flex-col gap-1">
                      <Input value={editBody} onChange={(e) => setEditBody(e.target.value)} />
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => handleSaveEdit(c.id)}>{t("saveEdit")}</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>{t("cancelEdit")}</Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-text">{c.body}</p>
                      <div className="mt-1 flex gap-2">
                        <button type="button" className="text-primary hover:underline" onClick={() => { setEditingId(c.id); setEditBody(c.body); }}>{t("edit")}</button>
                        <button type="button" className="text-error hover:underline" onClick={() => handleDelete(c.id)}>{t("delete")}</button>
                      </div>
                    </>
                  )}
                </li>
              ))}
              {comments.length === 0 && <p className="text-body-xs text-text-muted">{t("empty")}</p>}
            </ul>
          )}
          <div className="flex gap-1.5">
            <Input value={newBody} onChange={(e) => setNewBody(e.target.value)} placeholder={t("addPlaceholder")} className="flex-1" />
            <Button size="sm" loading={submitting} onClick={handleAdd}>{t("add")}</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function TruckFormModal({
  data,
  truck,
  open,
  onOpenChange,
}: {
  data: ReturnType<typeof useTrucks>;
  truck: Truck | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("zyloLiquid.trucks.form");
  const tCommon = useTranslations("common");
  const isEdit = truck !== null;

  const [plateNumber, setPlateNumber] = useState("");
  const [carrierId, setCarrierId] = useState("");
  const [capacityLiters, setCapacityLiters] = useState("");
  const [compartmentsCount, setCompartmentsCount] = useState("");
  const [newCarrierName, setNewCarrierName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPlateNumber(truck?.plateNumber ?? "");
    setCarrierId(truck?.carrierId ?? "");
    setCapacityLiters(truck?.capacityLiters ? String(truck.capacityLiters) : "");
    setCompartmentsCount(truck?.compartmentsCount ? String(truck.compartmentsCount) : "");
    setNewCarrierName("");
    setSubmitError(null);
    setAttempted(false);
  }, [open, truck]);

  const missingRequired = !plateNumber.trim();
  const displayError = attempted && missingRequired ? t("required") : submitError;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAttempted(true);
    if (missingRequired) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      let finalCarrierId = carrierId || undefined;
      if (!finalCarrierId && newCarrierName.trim()) {
        const created = await data.addCarrier({ name: newCarrierName.trim() });
        finalCarrierId = created?.id;
      }
      const payload = {
        plateNumber: plateNumber.trim(),
        carrierId: finalCarrierId,
        capacityLiters: capacityLiters ? Number(capacityLiters) : undefined,
        compartmentsCount: compartmentsCount ? Number(compartmentsCount) : undefined,
      };
      if (isEdit && truck) {
        await data.editTruck(truck.id, payload);
      } else {
        await data.addTruck(payload);
      }
      onOpenChange(false);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : tCommon("states.error"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? t("editTitle") : t("createTitle")}
      size="md"
      closeLabel={tCommon("actions.close")}
      footer={
        <>
          <Button variant="outline" size="sm" type="button" onClick={() => onOpenChange(false)}>{tCommon("actions.cancel")}</Button>
          <Button size="sm" type="submit" form="truck-form" loading={submitting}>{tCommon("actions.save")}</Button>
        </>
      }
    >
      <form id="truck-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        {displayError && <Alert tone="error">{displayError}</Alert>}
        <FormField label={t("plateNumber")}>
          {(f) => <Input {...f} value={plateNumber} onChange={(e) => setPlateNumber(e.target.value)} placeholder={t("platePlaceholder")} />}
        </FormField>
        <FormField label={t("carrier")}>
          {() => (
            <SearchableSelect
              aria-label={t("carrier")}
              value={carrierId || undefined}
              onValueChange={setCarrierId}
              placeholder={t("selectCarrier")}
              searchPlaceholder={t("searchPlaceholder")}
              emptyLabel={t("noResult")}
              options={data.carriers.map((c) => ({ value: c.id, label: c.name }))}
            />
          )}
        </FormField>
        {!carrierId && (
          <FormField label={t("newCarrier")}>
            {(f) => <Input {...f} value={newCarrierName} onChange={(e) => setNewCarrierName(e.target.value)} placeholder={t("newCarrierPlaceholder")} />}
          </FormField>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField label={t("capacity")}>{(f) => <Input {...f} type="number" value={capacityLiters} onChange={(e) => setCapacityLiters(e.target.value)} />}</FormField>
          <FormField label={t("compartments")}>{(f) => <Input {...f} type="number" value={compartmentsCount} onChange={(e) => setCompartmentsCount(e.target.value)} />}</FormField>
        </div>
      </form>
    </Modal>
  );
}

/** Écran « Boîtier GPS » (mission « tracking », étape 2 — scénario 1/2,
 * 2026-09-12) — plus de saisie manuelle d'identifiant : la liste vient de
 * l'API Traccar (déjà configuré), on choisit dedans. Camion déjà équipé :
 * bouton de dissociation avec confirmation obligatoire (scénario 2),
 * l'historique des positions passées reste attribué à ce camion pour
 * toujours même après réaffectation ailleurs. */
function GpsDeviceFormModal({
  data,
  truck,
  open,
  onOpenChange,
}: {
  data: ReturnType<typeof useTrucks>;
  truck: Truck | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("zyloLiquid.trucks.deviceForm");
  const tCommon = useTranslations("common");
  const existingDevice: GpsDevice | undefined = truck ? data.gpsDevices.find((d) => d.truckId === truck.id && d.active) : undefined;

  const [devices, setDevices] = useState<TraccarDeviceListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [onlyFree, setOnlyFree] = useState(false);
  const [busyIdentifier, setBusyIdentifier] = useState<string | null>(null);
  const [alreadyAssociatedPopup, setAlreadyAssociatedPopup] = useState<TraccarDeviceListItem | null>(null);
  const [unassignConfirmOpen, setUnassignConfirmOpen] = useState(false);
  const [unassigning, setUnassigning] = useState(false);

  useEffect(() => {
    if (!open || existingDevice) return;
    setQuery("");
    setOnlyFree(false);
    setLoadError(null);
    setLoading(true);
    data.fetchTraccarDeviceList().then(setDevices).catch((err) => {
      setLoadError(err instanceof Error ? err.message : tCommon("states.error"));
    }).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, truck?.id, existingDevice]);

  async function handleSelect(item: TraccarDeviceListItem) {
    if (!truck) return;
    if (item.truckId) {
      setAlreadyAssociatedPopup(item);
      return;
    }
    setBusyIdentifier(item.deviceIdentifier);
    try {
      // Ce boîtier a peut-être déjà une fiche dans notre référentiel
      // (ex. déjà utilisé lors d'un test précédent, puis dissocié) — dans
      // ce cas, on met à jour cette fiche existante plutôt que d'en créer
      // une nouvelle, sous peine d'un conflit d'identifiant déjà pris.
      const existing = data.gpsDevices.find((d) => d.deviceIdentifier === item.deviceIdentifier);
      if (existing) {
        await data.editGpsDevice(existing.id, { truckId: truck.id, label: item.name ?? undefined });
      } else {
        await data.addGpsDevice({ truckId: truck.id, deviceIdentifier: item.deviceIdentifier, label: item.name ?? undefined });
      }
      onOpenChange(false);
    } finally {
      setBusyIdentifier(null);
    }
  }

  async function handleConfirmUnassign() {
    if (!existingDevice) return;
    setUnassigning(true);
    try {
      await data.removeGpsDeviceAssignment(existingDevice.id);
      setUnassignConfirmOpen(false);
      onOpenChange(false);
    } finally {
      setUnassigning(false);
    }
  }

  if (!truck) return null;

  const filtered = devices.filter((d) => {
    if (onlyFree && d.truckId) return false;
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return d.deviceIdentifier.toLowerCase().includes(q) || (d.name ?? "").toLowerCase().includes(q);
  });

  return (
    <>
      <Modal open={open} onOpenChange={onOpenChange} title={t("title", { plate: truck.plateNumber })} size="md" closeLabel={tCommon("actions.close")}>
        {existingDevice ? (
          <div className="flex flex-col gap-4">
            <div className="rounded-card border border-border-subtle p-3">
              <p className="text-body-sm font-medium text-text">{existingDevice.label || existingDevice.deviceIdentifier}</p>
              <p className="text-body-xs text-text-muted">{existingDevice.deviceIdentifier}</p>
            </div>
            <Button variant="destructive" size="sm" onClick={() => setUnassignConfirmOpen(true)}>{t("unassign")}</Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {loadError && (
              <Alert tone="error">
                {loadError.includes("traccar_connection") || loadError.toLowerCase().includes("traccar") ? t("traccarNotConfigured") : loadError}
              </Alert>
            )}
            <div className="flex items-center gap-2">
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("searchPlaceholder")} className="flex-1" />
              <Button variant={onlyFree ? "primary" : "outline"} size="sm" type="button" onClick={() => setOnlyFree((v) => !v)}>
                {onlyFree ? t("filterFreeOnly") : t("filterAll")}
              </Button>
            </div>
            {loading ? (
              <p className="text-body-sm text-text-muted">{tCommon("states.loading")}</p>
            ) : filtered.length === 0 ? (
              <p className="text-body-sm text-text-muted">{t("noDevice")}</p>
            ) : (
              <ul className="flex max-h-80 flex-col gap-1.5 overflow-y-auto">
                {filtered.map((item) => {
                  const isBusy = busyIdentifier === item.deviceIdentifier;
                  return (
                  <li key={item.deviceIdentifier}>
                    <button
                      type="button"
                      onClick={() => handleSelect(item)}
                      disabled={busyIdentifier === item.deviceIdentifier}
                      className={`flex w-full items-center justify-between rounded-card border border-border-subtle px-3 py-2 text-left transition-colors ${isBusy ? "opacity-60" : item.truckId ? "bg-surface-muted" : "bg-surface hover:bg-primary-muted"}`}
                    >
                      <span className="flex flex-col">
                        <span className="text-body-sm font-medium text-text">{item.name || item.deviceIdentifier}</span>
                        <span className="text-body-xs text-text-muted">{item.deviceIdentifier}{item.truckPlateNumber ? ` — ${item.truckPlateNumber}` : ""}</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        {isBusy ? (
                          <Loader2 className="size-4 animate-spin text-text-muted" aria-hidden />
                        ) : (
                          <>
                            <span className="size-2 rounded-full" style={{ background: item.online ? "#1F9D55" : "#DC2626" }} aria-hidden />
                            <Badge tone={item.truckId ? "neutral" : "success"}>{item.truckId ? t("statusAssociated") : t("statusFree")}</Badge>
                          </>
                        )}
                      </span>
                    </button>
                  </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </Modal>

      <Modal open={alreadyAssociatedPopup !== null} onOpenChange={(v) => !v && setAlreadyAssociatedPopup(null)} title={t("alreadyAssociatedTitle")} size="sm" closeLabel={tCommon("actions.close")}>
        <div className="flex flex-col gap-4">
          <p className="text-body-sm text-text">{t("alreadyAssociatedMessage", { plate: alreadyAssociatedPopup?.truckPlateNumber ?? "" })}</p>
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setAlreadyAssociatedPopup(null)}>{tCommon("actions.confirm")}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={unassignConfirmOpen} onOpenChange={setUnassignConfirmOpen} title={t("unassignConfirmTitle")} size="sm" closeLabel={tCommon("actions.close")}>
        <div className="flex flex-col gap-4">
          <p className="text-body-sm text-text">{t("unassignConfirmMessage")}</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setUnassignConfirmOpen(false)}>{tCommon("actions.cancel")}</Button>
            <Button size="sm" variant="destructive" loading={unassigning} onClick={handleConfirmUnassign}>{t("unassignConfirmAction")}</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
