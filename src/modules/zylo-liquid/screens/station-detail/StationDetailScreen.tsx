"use client";

import { AlertTriangle, Circle, Clock, Droplet, Fuel, MoreVertical, Truck } from "lucide-react";
import { useParams } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useRef, useState } from "react";

import { usePermissions } from "@/core/rbac/PermissionContext";
import { useOrganization } from "@/core/organization/OrganizationContext";
import { deactivateStation, reactivateStation, type Tank } from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { formatLiters } from "@/modules/zylo-liquid/utils/formatLiters";
import { computeStationOnlineStatus } from "@/modules/zylo-liquid/utils/stationStatus";
import { ActivityRow, Alert, Badge, Button, Card, CardSectionHeader, DropdownMenu, DropdownMenuItem, EmptyState, Kpi, Modal, PageHeader, Stack, Tabs } from "@/shared/ui";
import { CardSkeleton, KpiSkeleton, Skeleton } from "@/shared/ui/Skeleton";

import { AlertsBrowserModal } from "@/modules/zylo-liquid/components/AlertsBrowserModal";
import { DeliveriesBrowserModal } from "@/modules/zylo-liquid/components/DeliveriesBrowserModal";
import { LeaksBrowserModal } from "@/modules/zylo-liquid/components/LeaksBrowserModal";
import { AddTankModal } from "./AddTankModal";
import { CalibrationModal } from "@/modules/zylo-liquid/components/CalibrationModal";
import { StationAdminCenter } from "../station-admin/StationAdminCenter";
import { AtgTab } from "./AtgTab";
import { PumpsTab } from "./PumpsTab";
import { RegulationTab } from "./RegulationTab";
import { StaffTab } from "./StaffTab";
import { StackedBarChart, type StackedBarSeries } from "@/modules/zylo-liquid/components/StackedBarChart";
import { ModeSwitcher, TankLegend } from "@/modules/zylo-liquid/components/TankVisual";
import { TrendChart } from "@/modules/zylo-liquid/components/TrendChart";
import { TankCard } from "./TankCard";
import type { TankGaugeMode } from "./TankGaugeColumn";
import { useStationDetail } from "./useStationDetail";
import { last7DaysVolumeByProduct, useStationTrends } from "./useStationTrends";

const PRODUCT_COLOR_FALLBACK = ["#1B998B", "#D4A017", "#8E44AD", "#3498DB", "#E74C3C", "#2ECC71"];

const STATUS_TONE = { critical: "error", alert: "warning", offline: "neutral", online: "success" } as const;

// Statut opérationnel déclaré (`Station.status`) — distinct du badge de
// connectivité capteurs ci-dessus (`stationState`) : « ouverte/fermée/en
// maintenance » est une décision humaine (double vérité), jamais déduite de
// l'état des sondes. Mission « amélioration zylo liquid », page de
// station.docx : « le statut opérationnel, où l'on doit voir si la station
// est ouverte ou fermée ».
const OPERATIONAL_STATUS_TONE = { active: "success", maintenance: "warning", inactive: "neutral" } as const;

// Même permission que celle qui protège déjà la création/lecture de
// l'historique des prix (`PRICE_HISTORY_READ` côté backend,
// `roles_seed.py`) — c'est la seule permission existante qui distingue déjà
// les rôles autorisés à voir une valorisation monétaire du stock (ex.
// "administrateur de station") de ceux qui ne le sont pas (ex. "chef
// d'équipe"). Reprise ici plutôt qu'une nouvelle permission "voirValeur"
// inventée pour coller au prototype : elle protège exactement la même
// donnée (prix unitaire × volume). Cf. décision utilisateur « omet pour les
// rôles qui n'ont pas droit à valeur du stock » — la carte est omise, pas
// désactivée, pour ces rôles.
const PRICE_HISTORY_READ = "zyloLiquid.priceHistory.read";

type Freshness = "ok" | "late" | "old" | "never";

// Mêmes seuils que `TanksNetworkScreen.tsx` (15 / 45 min) — reproduit ici
// plutôt qu'extrait dans un utilitaire partagé pour rester cohérent avec ce
// fichier existant sans le toucher hors mission.
function freshnessOf(lastMeasurementAt: string | null): Freshness {
  if (!lastMeasurementAt) return "never";
  const ageMin = (Date.now() - new Date(lastMeasurementAt).getTime()) / 60000;
  if (ageMin <= 15) return "ok";
  if (ageMin <= 45) return "late";
  return "old";
}

/** Reconstruit la page détail d'une station selon la spécification détaillée
 * fournie par le commanditaire (ZoneA-D).
 *
 * Deux écarts assumés avec la spécification, documentés plutôt que
 * masqués : le champ "Gérant" (ligne d'info secondaire, modal Modifier)
 * n'existe sur aucune colonne de `Station` — omis, jamais inventé. La
 * colonne Livraisons ne montre pas de "Livreur" : aucune entité fournisseur
 * n'existe au Niveau 1 (déjà noté sur la page Livraisons/PR #24). */
export default function StationDetailScreen() {
  const params = useParams<{ stationId: string }>();
  const stationId = params.stationId;
  const t = useTranslations("zyloLiquid.stationDetail");
  const tAlerts = useTranslations("zyloLiquid.alerts");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const { currentOrganization } = useOrganization();
  const { can } = usePermissions();
  const data = useStationDetail(currentOrganization?.id ?? null, stationId);
  // Calculé avant les retours anticipés (chargement/erreur) plus bas : les
  // hooks doivent s'exécuter dans le même ordre à chaque rendu. `data.tanks`
  // vaut [] tant que rien n'est chargé, donc ce filtrage est sûr même avant
  // que `data.station` existe.
  const trendActiveTanks = data.tanks.filter((tank) => tank.active);
  const trends = useStationTrends(currentOrganization?.id ?? null, stationId, trendActiveTanks);

  // Défaut = "horizontal" (niveau physique + badges de seuil), pas
  // "vertical" comme dans le prototype : c'était déjà l'unique mode de
  // cette page avant cette mission, plus riche que les 3 autres (seul mode
  // à afficher les badges de seuil atteint). Changer le défaut aurait
  // changé ce que voient déjà les utilisateurs actuels sans bénéfice — les
  // 4 modes restent tous disponibles via le sélecteur.
  const [gaugeMode, setGaugeMode] = useState<TankGaugeMode>("horizontal");
  const [adminCenterOpen, setAdminCenterOpen] = useState(false);
  const [addTankOpen, setAddTankOpen] = useState(false);
  const [calibrationTank, setCalibrationTank] = useState<Tank | null>(null);
  const [statusActionError, setStatusActionError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const [alertsModal, setAlertsModal] = useState<{ open: boolean; initialAlertId: string | null }>({ open: false, initialAlertId: null });
  const [deliveriesModal, setDeliveriesModal] = useState<{ open: boolean; initialDeliveryId: string | null }>({ open: false, initialDeliveryId: null });
  const [leaksModal, setLeaksModal] = useState<{ open: boolean; initialLeakId: string | null }>({ open: false, initialLeakId: null });

  function formatVolume(liters: number): string {
    return `${formatLiters(liters)} L`;
  }
  function formatTime(iso: string): string {
    return format.dateTime(new Date(iso), { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }
  function minutesAgo(iso: string): number {
    // Math.max(0, ...) : une mesure horodatée dans le futur par rapport à
    // l'horloge du navigateur (dérive d'horloge du simulateur de démo,
    // donnée réelle mais non fiable pour un calcul de fraîcheur) ne doit
    // jamais s'afficher comme un nombre de minutes négatif — traitée comme
    // "à l'instant" plutôt que dans un sens ou l'autre.
    return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  }

  async function handleToggleStatus() {
    if (!currentOrganization || !data.station) return;
    setMenuOpen(false);
    setStatusActionError(null);
    try {
      if (data.station.status === "active") {
        if (!window.confirm(t("confirmDeactivate"))) return;
        await deactivateStation(currentOrganization.id, data.station.id);
      } else {
        if (!window.confirm(t("confirmReactivate"))) return;
        await reactivateStation(currentOrganization.id, data.station.id);
      }
      data.reload();
    } catch (err) {
      setStatusActionError(err instanceof Error ? err.message : tCommon("states.error"));
    }
  }

  // Silhouette de page plutôt qu'un spinner plein écran — mêmes lignes que
  // le contenu réel (bandeau + KPI + cuves) une fois chargé, jamais un écran
  // vide ni un flash de chargement générique.
  if (data.loading) {
    return (
      <Stack>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <KpiSkeleton />
          <KpiSkeleton />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </Stack>
    );
  }
  if (!data.station) {
    return <EmptyState icon={AlertTriangle} title={tCommon("states.error")} description={data.error ?? undefined} />;
  }

  const { station } = data;
  const activeTanks = data.tanks.filter((tank) => tank.active);
  const city = (station.cityId ? data.cities.find((c) => c.id === station.cityId) : null) ?? null;

  const tankStates = activeTanks.map((tank) => data.tankStateById.get(tank.id)).filter((s): s is NonNullable<typeof s> => !!s);
  const { online: stationOnline } = computeStationOnlineStatus(tankStates);
  const criticalAlert = data.alerts.some((a) => a.type === "leak" || a.type === "level_high");
  const stationState: "offline" | "critical" | "alert" | "online" = !stationOnline ? "offline" : criticalAlert ? "critical" : data.alerts.length > 0 ? "alert" : "online";

  const lastStationSync = tankStates.reduce<string | null>((latest, s) => {
    if (!s.lastMeasurementAt) return latest;
    return !latest || s.lastMeasurementAt > latest ? s.lastMeasurementAt : latest;
  }, null);

  // Bandeau de fiabilité (double vérité) : reprend la même logique de
  // fraîcheur que `TanksNetworkScreen.tsx`, appliquée aux seules cuves de
  // cette station. Une cuve "old" (>45 min sans mesure) rend les valeurs
  // affichées non fiables ; "late" (15-45 min) invite à la prudence sans
  // les invalider.
  const tankFreshness = tankStates.map((s) => freshnessOf(s.lastMeasurementAt));
  const worstFreshness: "old" | "late" | null = tankFreshness.includes("old") ? "old" : tankFreshness.includes("late") ? "late" : null;

  // Synthèse stock station (5e KPI) : même construction que la section
  // "Synthèse stock réseau" du tableau de bord (`useNetworkDashboard.ts`
  // `products`), mais agrégée depuis les données déjà chargées par cette
  // page (cuves + état courant) plutôt qu'un nouvel appel réseau — il
  // n'existe pas d'équivalent scopé-station de `getNetworkSummary` côté
  // backend, et en construire un ferait doublon avec cette agrégation
  // client déjà établie dans le codebase (cf. `useStationsList.ts`).
  interface StationProductAggregate {
    fuelProductId: string;
    name: string;
    displayColor: string | null;
    volumeLiters: number;
    capacityLiters: number;
    monetaryValue: number | null;
    currencyCode: string | null;
    /** Volume net moins le seuil bas de chaque cuve (jamais gaté par le
     * prix) et sa valeur monétaire, qui elle partage exactement la même
     * devise/disponibilité que `monetaryValue` — même prix résolu par
     * cuve, jamais une deuxième résolution. */
    sellableVolumeLiters: number;
    sellableMonetaryValue: number | null;
    /** Volume vendu sur les 7 derniers jours (calcul réel backend via
     * `getStationCashDetail`, jamais une donnée simulée). */
    soldLast7DaysLiters: number;
    /** Jours avant rupture au rythme moyen des 7 derniers jours = stock
     * actuel / (volume vendu 7j / 7). `null` si aucune vente sur la fenêtre
     * (couverture non calculable — jamais approximée à l'infini ou à 0). */
    coverageDays: number | null;
  }
  const salesLast7DaysByProduct = last7DaysVolumeByProduct(trends.salesByDay);
  const stationProductsMap = new Map<string, StationProductAggregate>();
  for (const tank of activeTanks) {
    const product = data.fuelProductById.get(tank.fuelProductId);
    if (!product) continue;
    const state = data.tankStateById.get(tank.id);
    const entry = stationProductsMap.get(product.id) ?? {
      fuelProductId: product.id,
      name: product.name,
      displayColor: product.displayColor,
      volumeLiters: 0,
      capacityLiters: 0,
      monetaryValue: 0,
      currencyCode: null,
      sellableVolumeLiters: 0,
      sellableMonetaryValue: 0,
      soldLast7DaysLiters: salesLast7DaysByProduct.get(product.id) ?? 0,
      coverageDays: null,
    };
    entry.capacityLiters += tank.calibratedCapacityLiters ?? tank.capacityLiters;
    entry.volumeLiters += state?.volumeLiters ?? 0;
    entry.sellableVolumeLiters += state?.sellableVolumeLiters ?? 0;
    if (state?.monetaryValue != null && state.currencyCode) {
      if (entry.currencyCode === null || entry.currencyCode === state.currencyCode) {
        entry.monetaryValue = (entry.monetaryValue ?? 0) + state.monetaryValue;
        entry.currencyCode = state.currencyCode;
        // Même prix/devise déjà résolus pour `monetaryValue` — jamais une
        // deuxième résolution pour la valeur du volume vendable.
        const sellableValue = state.sellableVolumeLiters != null && state.unitPriceAmount != null ? state.sellableVolumeLiters * state.unitPriceAmount : 0;
        entry.sellableMonetaryValue = (entry.sellableMonetaryValue ?? 0) + sellableValue;
      } else {
        entry.monetaryValue = null; // devises mixtes sur une même station : non sommable, jamais approximé
        entry.sellableMonetaryValue = null;
      }
    }
    stationProductsMap.set(product.id, entry);
  }
  for (const entry of stationProductsMap.values()) {
    entry.coverageDays = entry.soldLast7DaysLiters > 0 ? entry.volumeLiters / (entry.soldLast7DaysLiters / 7) : null;
  }
  // Tri « plus vendu → moins vendu » (mission « amélioration zylo liquid »,
  // page de station.docx) — fiche du produit le plus vendu affichée en
  // premier, jamais un ordre arbitraire de cuve.
  const stationProducts = [...stationProductsMap.values()].sort((a, b) => b.soldLast7DaysLiters - a.soldLast7DaysLiters);
  // Produits les plus critiques d'abord (couverture la plus faible) ; les
  // produits sans vente calculable (coverageDays null) restent en fin de
  // liste — pas de fausse urgence sans donnée réelle.
  const criticalityRanking = [...stationProductsMap.values()].sort((a, b) => {
    if (a.coverageDays === null && b.coverageDays === null) return 0;
    if (a.coverageDays === null) return 1;
    if (b.coverageDays === null) return -1;
    return a.coverageDays - b.coverageDays;
  });
  const stationTotalCapacityLiters = activeTanks.reduce((sum, tk) => sum + (tk.calibratedCapacityLiters ?? tk.capacityLiters), 0);
  const stationTotalVolumeLiters = tankStates.reduce((sum, s) => sum + (s.volumeLiters ?? 0), 0);
  const stationTotalSellableVolumeLiters = tankStates.reduce((sum, s) => sum + (s.sellableVolumeLiters ?? 0), 0);
  const stationValueCurrencies = new Set(tankStates.map((s) => s.currencyCode).filter((c): c is string => c !== null));
  const stationTotalValue =
    stationValueCurrencies.size === 1 && tankStates.every((s) => s.monetaryValue !== null || (s.volumeLiters ?? 0) === 0)
      ? tankStates.reduce((sum, s) => sum + (s.monetaryValue ?? 0), 0)
      : null;
  // Même porte que `stationTotalValue` (une seule devise, aucune cuve avec
  // du stock et un prix inconnu) — jamais une deuxième résolution de prix.
  const stationTotalSellableValue =
    stationValueCurrencies.size === 1 && tankStates.every((s) => s.monetaryValue !== null || (s.volumeLiters ?? 0) === 0)
      ? tankStates.reduce((sum, s) => sum + (s.sellableVolumeLiters != null && s.unitPriceAmount != null ? s.sellableVolumeLiters * s.unitPriceAmount : 0), 0)
      : null;
  const stationTotalCurrency = stationValueCurrencies.size === 1 ? [...stationValueCurrencies][0] : null;

  // Séries du graphique « rythme de vente » : une série par produit
  // présent sur la station (couleur réelle du produit si définie, sinon
  // une couleur de secours parmi une palette fixe — jamais une couleur
  // aléatoire différente à chaque rendu).
  const salesSeries: StackedBarSeries[] = stationProducts.map((p, i) => ({
    key: p.fuelProductId,
    label: p.name,
    color: data.fuelProductById.get(p.fuelProductId)?.displayColor ?? PRODUCT_COLOR_FALLBACK[i % PRODUCT_COLOR_FALLBACK.length],
  }));
  const salesPoints = trends.salesByDay.map((day) => ({
    at: day.date,
    values: Object.fromEntries(day.byProduct.map((p) => [p.fuelProductId, p.volumeSoldLiters])),
  }));

  function formatDateShort(iso: string): string {
    return format.dateTime(new Date(iso), { day: "2-digit", month: "2-digit" });
  }

  function formatMoney(value: number, currencyCode: string): string {
    try {
      return format.number(value, { style: "currency", currency: currencyCode, maximumFractionDigits: 0 });
    } catch {
      return `${format.number(Math.round(value))} ${currencyCode}`;
    }
  }

  const activeLeakAlerts = data.alerts.filter((a) => a.type === "leak");
  const anomalyLeaksByTank = new Map<string, (typeof data.leakEvents)[number]>();
  for (const leak of data.leakEvents.filter((l) => l.result === "anomaly")) {
    const existing = anomalyLeaksByTank.get(leak.tankId);
    if (!existing || leak.endTime > existing.endTime) anomalyLeaksByTank.set(leak.tankId, leak);
  }

  return (
    <Stack>
      <PageHeader
        breadcrumbs={[{ label: t("backLink"), href: "/zylo-liquid/stations" }, { label: station.name }]}
        title={
          <span className="flex flex-wrap items-center gap-2">
            <span>
              {station.name}
              {city && <span className="font-normal text-text-muted"> ({city.name})</span>}
            </span>
            <Badge tone={OPERATIONAL_STATUS_TONE[station.status]} dot>
              {t(`operationalStatus.${station.status}`)}
            </Badge>
            <Badge tone={STATUS_TONE[stationState]} dot>
              {t(`status.${stationState}`)}
            </Badge>
          </span>
        }
        description={lastStationSync ? t("sync", { minutes: minutesAgo(lastStationSync) }) : t("syncNever")}
        actions={
          <div className="flex flex-wrap items-center gap-2 no-print">
            <Button variant="outline" size="sm" onClick={() => setDeliveriesModal({ open: true, initialDeliveryId: null })}>
              <Truck className="size-4" aria-hidden />
              {t("actions.deliveries")}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setLeaksModal({ open: true, initialLeakId: null })}>
              <Droplet className="size-4" aria-hidden />
              {t("actions.leaks")}
            </Button>
            <Button size="sm" onClick={() => setAdminCenterOpen(true)}>
              {t("actions.configuration")}
            </Button>
            <div className="relative">
              <Button variant="outline" size="sm" onClick={() => setMenuOpen((v) => !v)} aria-haspopup="menu" aria-expanded={menuOpen}>
                <MoreVertical className="size-4" aria-hidden />
              </Button>
              <DropdownMenu open={menuOpen} menuRef={menuRef}>
                <DropdownMenuItem onClick={handleToggleStatus}>{station.status === "active" ? t("actions.deactivate") : t("actions.reactivate")}</DropdownMenuItem>
              </DropdownMenu>
            </div>
          </div>
        }
      />

      {statusActionError && <Alert tone="error">{statusActionError}</Alert>}

      {worstFreshness && (
        <Alert tone={worstFreshness === "old" ? "error" : "warning"} title={t(`reliabilityBanner.${worstFreshness}.title`)}>
          {t(`reliabilityBanner.${worstFreshness}.description`)}
        </Alert>
      )}

      {/* Les tuiles « Couverture minimale »/« Pompes disponibles » (placeholder
          "—"/"À venir") ont été retirées — sans valeur affichée, aucune
          fonction (mission « amélioration zylo liquid », page de
          station.docx : « il faut retirer cette partie, elle ne sert plus à
          rien »). La couverture réelle, calculée par produit, vit désormais
          dans le bloc Synthèse stock station ci-dessous. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Kpi icon={Droplet} label={t("kpis.stock")} value={formatVolume(stationTotalVolumeLiters)} sub={t("kpis.stockSub", { capacity: formatVolume(stationTotalCapacityLiters) })} />
        <Kpi
          icon={AlertTriangle}
          label={t("kpis.activeAlerts")}
          value={data.alerts.length}
          tone={criticalAlert ? "error" : data.alerts.length > 0 ? "warning" : "neutral"}
        />
      </div>

      {can(PRICE_HISTORY_READ) && stationProducts.length > 0 && (
        <Card>
          <CardSectionHeader title={t("stockSynthesis.title")} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stationProducts.map((product, index) => {
              const rate = product.capacityLiters > 0 ? (product.volumeLiters / product.capacityLiters) * 100 : 0;
              return (
                <div key={product.fuelProductId} className="rounded-card border border-border-subtle p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-body-sm font-semibold text-text-muted">
                      <Circle className="size-2.5" style={{ fill: product.displayColor ?? "var(--color-text-muted)", color: product.displayColor ?? undefined }} aria-hidden />
                      {product.name.toUpperCase()}
                    </div>
                    {/* Rang de vente (fiche 1 = le plus vendu) — mission
                        « amélioration zylo liquid », page de station.docx. */}
                    <Badge tone="neutral">{t("stockSynthesis.rank", { rank: index + 1 })}</Badge>
                  </div>
                  <p className="mt-2 text-h2 font-bold tabular-nums text-text">{formatVolume(product.volumeLiters)}</p>
                  <p className="text-body-sm text-text-muted">{t("stockSynthesis.ofCapacity", { capacity: formatVolume(product.capacityLiters) })}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-pill bg-surface-muted">
                      <div className="h-full rounded-pill" style={{ width: `${Math.min(100, rate)}%`, background: product.displayColor ?? "var(--color-primary)" }} />
                    </div>
                    <span className="tabular-nums text-body-sm text-text-muted">{format.number(rate, { maximumFractionDigits: 1 })}%</span>
                  </div>
                  <div className="mt-3 flex items-center gap-1.5 text-body-sm text-text-muted">
                    <Clock className="size-3.5" aria-hidden />
                    {product.coverageDays !== null
                      ? t("stockSynthesis.coverageDays", { days: format.number(product.coverageDays, { maximumFractionDigits: 1 }) })
                      : t("stockSynthesis.coverageUnavailable")}
                  </div>
                  <div className="mt-3 border-t border-border-subtle pt-3">
                    <p className="text-caption text-text-muted">{t("stockSynthesis.sellableVolume")}</p>
                    <p className="text-body-md font-semibold tabular-nums text-text">
                      {t("stockSynthesis.sellableOfAvailable", { sellable: formatVolume(product.sellableVolumeLiters), available: formatVolume(product.volumeLiters) })}
                    </p>
                  </div>
                  <div className="mt-3 border-t border-border-subtle pt-3">
                    <p className="text-caption text-text-muted">{t("stockSynthesis.stockValueTotal")}</p>
                    <p className="text-body-lg font-semibold text-text">
                      {product.monetaryValue !== null && product.currencyCode ? formatMoney(product.monetaryValue, product.currencyCode) : t("stockSynthesis.valueUnavailable")}
                    </p>
                    <p className="mt-2 text-caption text-text-muted">{t("stockSynthesis.stockValueSellable")}</p>
                    <p className="text-body-lg font-semibold text-text">
                      {product.sellableMonetaryValue !== null && product.currencyCode ? formatMoney(product.sellableMonetaryValue, product.currencyCode) : t("stockSynthesis.valueUnavailable")}
                    </p>
                  </div>
                </div>
              );
            })}
            <div className="rounded-card border border-secondary/20 bg-secondary p-4 text-white">
              <p className="text-body-sm font-semibold text-white/70">{t("stockSynthesis.totalStation").toUpperCase()}</p>
              <p className="mt-2 text-h2 font-bold tabular-nums">{formatVolume(stationTotalVolumeLiters)}</p>
              <p className="text-body-sm text-white/60">{t("stockSynthesis.ofCapacity", { capacity: formatVolume(stationTotalCapacityLiters) })}</p>
              <div className="mt-3 border-t border-white/10 pt-3">
                <p className="text-caption text-white/60">{t("stockSynthesis.sellableVolume")}</p>
                <p className="text-body-md font-semibold tabular-nums">
                  {t("stockSynthesis.sellableOfAvailable", { sellable: formatVolume(stationTotalSellableVolumeLiters), available: formatVolume(stationTotalVolumeLiters) })}
                </p>
              </div>
              <div className="mt-3 border-t border-white/10 pt-3">
                <p className="text-caption text-white/60">{t("stockSynthesis.stockValueTotal")}</p>
                <p className="text-body-lg font-semibold">
                  {stationTotalValue !== null && stationTotalCurrency ? formatMoney(stationTotalValue, stationTotalCurrency) : t("stockSynthesis.valueUnavailable")}
                </p>
                <p className="mt-2 text-caption text-white/60">{t("stockSynthesis.stockValueSellable")}</p>
                <p className="text-body-lg font-semibold">
                  {stationTotalSellableValue !== null && stationTotalCurrency ? formatMoney(stationTotalSellableValue, stationTotalCurrency) : t("stockSynthesis.valueUnavailable")}
                </p>
              </div>
            </div>
          </div>

          {/* Liste « produit le plus critique → moins critique » (couverture
              croissante) — mission « amélioration zylo liquid », page de
              station.docx : « je sais que actuellement les alertes présentent
              déjà tout mais c'est une information très importante ». */}
          <div className="mt-4 border-t border-border-subtle pt-4">
            <div className="mb-2 flex items-center gap-1.5 text-body-sm font-semibold text-text-muted">
              <Fuel className="size-4" aria-hidden />
              {t("stockSynthesis.criticalityTitle")}
            </div>
            <div className="flex flex-col gap-1.5">
              {criticalityRanking.map((product) => (
                <div key={product.fuelProductId} className="flex items-center justify-between gap-2 text-body-sm">
                  <span className="flex items-center gap-2">
                    <Circle className="size-2.5" style={{ fill: product.displayColor ?? "var(--color-text-muted)", color: product.displayColor ?? undefined }} aria-hidden />
                    {product.name}
                  </span>
                  <span className="tabular-nums text-text-muted">
                    {product.coverageDays !== null
                      ? t("stockSynthesis.coverageDays", { days: format.number(product.coverageDays, { maximumFractionDigits: 1 }) })
                      : t("stockSynthesis.coverageUnavailable")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {data.alerts.length > 0 && (
        <Alert tone={criticalAlert ? "error" : "warning"} title={t("alertsBanner.count", { count: data.alerts.length })}>
          {data.alerts
            .slice(0, 4)
            .map((a) => {
              const tank = data.tanks.find((tk) => tk.id === a.tankId);
              return `${tAlerts(`types.${a.type}`)} · ${tank?.displayName ?? "?"}`;
            })
            .join(" | ")}{" "}
          <button type="button" onClick={() => setAlertsModal({ open: true, initialAlertId: null })} className="font-medium text-primary hover:underline">
            {t("alertsBanner.viewAll")}
          </button>
        </Alert>
      )}

      {currentOrganization && (
        <Modal
          open={adminCenterOpen}
          onOpenChange={setAdminCenterOpen}
          title={station.name}
          size="full"
          closeLabel={tCommon("actions.close")}
        >
          <StationAdminCenter
            organizationId={currentOrganization.id}
            station={station}
            city={city}
            fuelProducts={data.fuelProducts}
            stationId={stationId}
            onReload={data.reload}
            onClose={() => setAdminCenterOpen(false)}
          />
        </Modal>
      )}

      <Tabs
        variant="underline"
        items={[
          { value: "apercu", label: t("tabs.overview"), content: (
            <Stack>
      {/* Alertes / Livraisons récentes / Fuites actives remontées en
          première position dans la vue d'ensemble (mission « amélioration
          zylo liquid », page de station.docx : « les blocs ... doivent
          monter en première position »), avant les cuves et les graphiques. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardSectionHeader
            title={t("columns.alerts.title", { count: data.alerts.length })}
            action={
              <button
                type="button"
                onClick={() => setAlertsModal({ open: true, initialAlertId: null })}
                className="text-caption font-medium text-primary hover:underline"
              >
                {t("columns.viewAll")}
              </button>
            }
          />
          {data.alerts.length === 0 ? (
            <p className="text-body-sm text-text-muted">{t("columns.alerts.empty")}</p>
          ) : (
            data.alerts.map((a) => {
              const tank = data.tanks.find((tk) => tk.id === a.tankId);
              const critical = a.type === "leak" || a.type === "level_high";
              return (
                <ActivityRow
                  key={a.id}
                  icon={AlertTriangle}
                  iconTone={critical ? "error" : "warning"}
                  title={tAlerts(`types.${a.type}`)}
                  meta={tank?.displayName ?? "?"}
                  trailing={<span className="text-caption text-text-muted">{minutesAgo(a.triggeredAt)} min</span>}
                  onClick={() => setAlertsModal({ open: true, initialAlertId: a.id })}
                />
              );
            })
          )}
        </Card>

        <Card>
          <CardSectionHeader
            title={t("columns.deliveries.title", { count: data.deliveries.length })}
            action={
              <button
                type="button"
                onClick={() => setDeliveriesModal({ open: true, initialDeliveryId: null })}
                className="text-caption font-medium text-primary hover:underline"
              >
                {t("columns.viewAll")}
              </button>
            }
          />
          {data.deliveries.length === 0 ? (
            <p className="text-body-sm text-text-muted">{t("columns.deliveries.empty")}</p>
          ) : (
            data.deliveries.map((d) => {
              const tank = data.tanks.find((tk) => tk.id === d.tankId);
              const product = tank ? data.fuelProductById.get(tank.fuelProductId) : null;
              return (
                <ActivityRow
                  key={d.id}
                  icon={Truck}
                  iconTone="success"
                  title={`${(product?.name ?? "?").toUpperCase()} · ${tank?.displayName ?? "?"}`}
                  meta={`+${formatVolume(d.volumeLiters ?? 0)}`}
                  trailing={<span className="text-caption text-text-muted">{formatTime(d.endTime)}</span>}
                  onClick={() => setDeliveriesModal({ open: true, initialDeliveryId: d.id })}
                />
              );
            })
          )}
        </Card>

        <Card>
          <CardSectionHeader
            title={<span className={activeLeakAlerts.length > 0 ? "text-error" : undefined}>{t("columns.leaks.title", { count: activeLeakAlerts.length })}</span>}
            action={
              <button
                type="button"
                onClick={() => setLeaksModal({ open: true, initialLeakId: null })}
                className="text-caption font-medium text-primary hover:underline"
              >
                {t("columns.viewAll")}
              </button>
            }
          />
          {activeLeakAlerts.length === 0 ? (
            <p className="text-body-sm text-text-muted">{t("columns.leaks.empty")}</p>
          ) : (
            activeLeakAlerts.map((a) => {
              const tank = data.tanks.find((tk) => tk.id === a.tankId);
              const product = tank ? data.fuelProductById.get(tank.fuelProductId) : null;
              const anomalyLeak = a.tankId ? anomalyLeaksByTank.get(a.tankId) : undefined;
              return (
                <ActivityRow
                  key={a.id}
                  icon={Droplet}
                  iconTone="error"
                  title={`${tank?.displayName ?? "?"} ${product?.name ?? ""}`}
                  meta={
                    <>
                      {anomalyLeak && <span className="text-error">{t("columns.leaks.rate", { rate: format.number(anomalyLeak.leakRateLph ?? 0, { maximumFractionDigits: 1 }) })} · </span>}
                      {formatTime(a.triggeredAt)}
                    </>
                  }
                  trailing={
                    <Badge tone="error" dot>
                      {t("columns.leaks.status")}
                    </Badge>
                  }
                  onClick={() => setLeaksModal({ open: true, initialLeakId: anomalyLeak?.id ?? null })}
                />
              );
            })
          )}
        </Card>
      </div>

      <Card>
        <CardSectionHeader
          title={t("tanksSection.title")}
          action={
            <Button variant="outline" size="sm" onClick={() => setAddTankOpen(true)}>
              {t("tanksSection.addTank")}
            </Button>
          }
        />
        <p className="-mt-3 mb-1 text-body-sm text-text-muted">{t("tanksSection.activeCount", { count: activeTanks.length })}</p>
        <p className="mb-3 text-caption text-text-muted">{t("tanksSection.hint")}</p>

        <div className="mb-4">
          <ModeSwitcher mode={gaugeMode} onChange={setGaugeMode} />
        </div>

        {activeTanks.length === 0 ? (
          <EmptyState title={t("tanksSection.empty")} />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {activeTanks.map((tank) => (
                <TankCard
                  key={tank.id}
                  tank={tank}
                  state={data.tankStateById.get(tank.id) ?? null}
                  fuelProduct={data.fuelProductById.get(tank.fuelProductId) ?? null}
                  stationAlerts={data.alerts}
                  stationId={stationId}
                  onOpenCalibration={() => setCalibrationTank(tank)}
                  gaugeMode={gaugeMode}
                />
              ))}
            </div>

            <div className="mt-4 border-t border-border-subtle pt-3">
              <TankLegend />
            </div>
          </>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardSectionHeader title={t("charts.sales.title")} />
          <p className="-mt-2 mb-3 text-body-sm text-text-muted">{t("charts.sales.subtitle")}</p>
          {trends.loading ? (
            <Skeleton className="h-48 w-full" />
          ) : salesSeries.length === 0 || salesPoints.every((p) => Object.values(p.values).every((v) => v === 0)) ? (
            <p className="text-body-sm text-text-muted">{t("charts.sales.empty")}</p>
          ) : (
            <>
              <StackedBarChart points={salesPoints} series={salesSeries} formatValue={formatVolume} formatDate={formatDateShort} />
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-caption text-text-muted">
                {salesSeries.map((s) => (
                  <span key={s.key} className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full" style={{ background: s.color }} /> {s.label}
                  </span>
                ))}
              </div>
            </>
          )}
        </Card>

        <Card>
          <CardSectionHeader title={t("charts.stock.title")} />
          <p className="-mt-2 mb-3 text-body-sm text-text-muted">{t("charts.stock.subtitle")}</p>
          {trends.loading ? (
            <Skeleton className="h-48 w-full" />
          ) : trends.stockPoints.length < 2 ? (
            <p className="text-body-sm text-text-muted">{t("charts.stock.empty")}</p>
          ) : (
            <TrendChart
              points={trends.stockPoints.map((p) => ({ at: p.at, value: p.totalVolumeLiters }))}
              formatValue={formatVolume}
              formatDate={formatDateShort}
              seriesLabel={t("charts.stock.title")}
            />
          )}
        </Card>
      </div>
            </Stack>
          ) },
          { value: "pompes", label: t("tabs.pumps"), content: currentOrganization ? <PumpsTab organizationId={currentOrganization.id} stationId={stationId} /> : null },
          { value: "personnel", label: t("tabs.staff"), content: currentOrganization ? <StaffTab organizationId={currentOrganization.id} stationId={stationId} /> : null },
          { value: "reglementation", label: t("tabs.regulation"), content: currentOrganization ? <RegulationTab organizationId={currentOrganization.id} stationId={stationId} /> : null },
          { value: "atg", label: t("tabs.atg"), content: currentOrganization ? <AtgTab organizationId={currentOrganization.id} tanks={activeTanks} /> : null },
        ]}
      />

      {currentOrganization && (
        <>
          <AddTankModal
            organizationId={currentOrganization.id}
            stationId={stationId}
            fuelProducts={data.fuelProducts}
            existingTankNumbers={data.tanks.map((tk) => tk.tankNumber)}
            open={addTankOpen}
            onOpenChange={setAddTankOpen}
            onCreated={data.reload}
          />
          {calibrationTank && (
            <CalibrationModal
              organizationId={currentOrganization.id}
              tank={calibrationTank}
              open={!!calibrationTank}
              onOpenChange={(open) => !open && setCalibrationTank(null)}
              onUpdated={data.reload}
            />
          )}
          <AlertsBrowserModal
            organizationId={currentOrganization.id}
            open={alertsModal.open}
            onOpenChange={(open) => setAlertsModal({ open, initialAlertId: open ? alertsModal.initialAlertId : null })}
            title={t("columns.alerts.title", { count: data.alerts.length })}
            stationId={stationId}
            initialAlertId={alertsModal.initialAlertId}
          />
          <DeliveriesBrowserModal
            organizationId={currentOrganization.id}
            open={deliveriesModal.open}
            onOpenChange={(open) => setDeliveriesModal({ open, initialDeliveryId: open ? deliveriesModal.initialDeliveryId : null })}
            title={t("columns.deliveries.title", { count: data.deliveries.length })}
            stationId={stationId}
            initialDeliveryId={deliveriesModal.initialDeliveryId}
          />
          <LeaksBrowserModal
            organizationId={currentOrganization.id}
            open={leaksModal.open}
            onOpenChange={(open) => setLeaksModal({ open, initialLeakId: open ? leaksModal.initialLeakId : null })}
            title={t("columns.leaks.title", { count: activeLeakAlerts.length })}
            stationId={stationId}
            initialLeakId={leaksModal.initialLeakId}
          />
        </>
      )}
    </Stack>
  );
}
