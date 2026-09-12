"use client";

import { Bell, Maximize2, Minimize2, Plus, Search, Truck as TruckIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { useOrganization } from "@/core/organization/OrganizationContext";
import { TrucksMap, type TruckMapPoint, type TruckMapStatus, type TruckMapStop } from "@/modules/zylo-liquid/components/TrucksMap";
import type { GpsDevice, Truck, TruckCurrentPosition, TruckPositionPing, TruckStopEvent } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import {
  Alert, Badge, Button, Card, EmptyState, FormField, Input, Modal, PageHeader, SearchableSelect, Tabs,
  Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow,
} from "@/shared/ui";
import { PageSpinner } from "@/shared/ui/Spinner";

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
  const tCommon = useTranslations("common");
  const { currentOrganization } = useOrganization();
  const data = useTrucks(currentOrganization?.id ?? null);

  const [tab, setTab] = useState("list");
  const [truckFormOpen, setTruckFormOpen] = useState(false);
  const [editingTruck, setEditingTruck] = useState<Truck | null>(null);
  const [deviceModalTruck, setDeviceModalTruck] = useState<Truck | null>(null);
  const [ingestModalOpen, setIngestModalOpen] = useState(false);

  if (data.loading) return <PageSpinner label={tCommon("states.loading")} />;

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
          {data.trucks.length === 0 ? (
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
                {data.trucks.map((truck) => {
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
  selectedTruckId,
  onSelect,
  t,
}: {
  trucks: Truck[];
  currentPositions: TruckCurrentPosition[];
  selectedTruckId: string | null;
  onSelect: (id: string) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const [query, setQuery] = useState("");
  const filtered = trucks.filter((tr) => tr.plateNumber.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="flex h-full w-72 shrink-0 flex-col border-r border-border-subtle bg-surface">
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
          const pos = currentPositions.find((p) => p.truckId === truck.id);
          const { label, online } = deviceConnectivityLabel(pos?.recordedAt ?? null, t);
          const selected = truck.id === selectedTruckId;
          return (
            <button
              key={truck.id}
              type="button"
              onClick={() => onSelect(truck.id)}
              className={`flex w-full items-start gap-2 border-b border-border-subtle px-3 py-2.5 text-left transition-colors ${selected ? "bg-primary-muted" : "hover:bg-surface-muted"}`}
            >
              <span
                className="mt-1.5 size-2 shrink-0 rounded-full"
                style={{ background: online ? "#1F9D55" : "#DC2626" }}
                aria-hidden
              />
              <span className="flex flex-col">
                <span className="text-body-sm font-medium text-text">{truck.plateNumber}</span>
                <span className="text-body-xs" style={{ color: online ? "#1F9D55" : "#DC2626" }}>{label}</span>
              </span>
            </button>
          );
        })}
      </div>
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
    const until = new Date();
    const since = new Date(until.getTime() - STOP_WINDOW_HOURS * 60 * 60 * 1000);
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
  }, [selectedTruckId]);

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

  return (
    <div
      ref={fullscreenRef}
      className={isFullscreen ? "flex h-screen w-screen flex-row bg-surface" : "flex flex-col gap-4 pt-4 lg:flex-row"}
    >
      {isFullscreen && (
        <TruckSidebar trucks={data.trucks} currentPositions={data.currentPositions} selectedTruckId={selectedTruckId} onSelect={setSelectedTruckId} t={t} />
      )}

      <div className={isFullscreen ? "relative flex-1" : "relative flex-1"}>
        <TrucksMap
          trucks={truckPoints}
          route={route}
          stops={mapStops}
          selectedTruckId={selectedTruckId}
          onTruckClick={setSelectedTruckId}
          height={isFullscreen ? "100vh" : 520}
        />

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
            {loadingRoute ? t("loadingRoute") : t("stopsCount", { count: stops.length })}
          </div>
        )}
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
                ) : (
                  <>
                    <p className="text-body-sm text-text-muted">{t("stopsCount", { count: stops.length })}</p>
                    <ul className="flex flex-col gap-2">
                      {stops.map((s) => (
                        <li key={s.id} className="rounded-card border border-border-subtle px-3 py-2 text-body-sm">
                          <div className="text-text">{new Date(s.startAt).toLocaleString()}</div>
                          <div className="text-text-muted">{formatStopDuration(s, t)}</div>
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

  const [deviceIdentifier, setDeviceIdentifier] = useState("");
  const [label, setLabel] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDeviceIdentifier(existingDevice?.deviceIdentifier ?? "");
    setLabel(existingDevice?.label ?? "");
    setSubmitError(null);
    setAttempted(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, truck?.id]);

  const missingRequired = !deviceIdentifier.trim();
  const displayError = attempted && missingRequired ? t("required") : submitError;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAttempted(true);
    if (missingRequired || !truck) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      if (existingDevice) {
        await data.editGpsDevice(existingDevice.id, { label: label.trim() || undefined });
      } else {
        await data.addGpsDevice({ truckId: truck.id, deviceIdentifier: deviceIdentifier.trim(), label: label.trim() || undefined });
      }
      onOpenChange(false);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : tCommon("states.error"));
    } finally {
      setSubmitting(false);
    }
  }

  if (!truck) return null;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t("title", { plate: truck.plateNumber })}
      size="sm"
      closeLabel={tCommon("actions.close")}
      footer={
        <>
          <Button variant="outline" size="sm" type="button" onClick={() => onOpenChange(false)}>{tCommon("actions.cancel")}</Button>
          <Button size="sm" type="submit" form="gps-device-form" loading={submitting}>{tCommon("actions.save")}</Button>
        </>
      }
    >
      <form id="gps-device-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        {displayError && <Alert tone="error">{displayError}</Alert>}
        {existingDevice && <p className="text-body-sm text-text-muted">{t("existingHint")}</p>}
        <FormField label={t("deviceIdentifier")}>
          {(f) => (
            <Input {...f} value={deviceIdentifier} onChange={(e) => setDeviceIdentifier(e.target.value)} placeholder={t("identifierPlaceholder")} disabled={!!existingDevice} />
          )}
        </FormField>
        <FormField label={t("label")}>
          {(f) => <Input {...f} value={label} onChange={(e) => setLabel(e.target.value)} placeholder={t("labelPlaceholder")} />}
        </FormField>
      </form>
    </Modal>
  );
}
