"use client";

import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  ClipboardList,
  Droplet,
  Fuel,
  History,
  Landmark,
  Shield,
  ShoppingBag,
  ShoppingCart,
  Store,
  Truck as TruckIcon,
  Users,
  Wrench,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { cn } from "@/shared/lib/cn";
import type { City, FuelProduct, Station } from "@/modules/zylo-liquid/services/zyloLiquidApi";

import { AdministrationTab } from "../station-detail/AdministrationTab";
import { DeliveriesSection } from "./DeliveriesSection";
import { DocumentsSection } from "./DocumentsSection";
import { EquipmentSection } from "./EquipmentSection";
import { FinancialSection } from "./FinancialSection";
import { HistorySection } from "./HistorySection";
import { InfrastructureSection } from "./InfrastructureSection";
import { MaintenanceSection } from "./MaintenanceSection";
import { OperationsSection } from "./OperationsSection";
import { OrdersSection } from "./OrdersSection";
import { PersonnelSection } from "./PersonnelSection";
import { SecuritySection } from "./SecuritySection";
import { ShopSection } from "./ShopSection";
import { StationAlertsSection } from "./StationAlertsSection";
import { RegulationTab } from "../station-detail/RegulationTab";
import { SuppliersSection } from "./SuppliersSection";

type SectionKey =
  | "identity"
  | "operations"
  | "orders"
  | "deliveries"
  | "stationAlerts"
  | "infrastructure"
  | "equipment"
  | "maintenance"
  | "regulatory"
  | "documents"
  | "personnel"
  | "security"
  | "suppliers"
  | "shop"
  | "financial"
  | "history";

/** Centre administratif et opérationnel de la station — remplace le simple
 * onglet « Administration » (identité + carte) par un vrai regroupement de
 * tout ce qui concerne l'administration de la station, sans jamais dupliquer
 * une donnée opérationnelle déjà affichée ailleurs (les cuves et l'ATG
 * restent des liens vers la page station, jamais recopiés ici — décision
 * explicite du commanditaire, point 19 de la mission). Layout sidebar dédié
 * (validé avec le commanditaire), distinct du système d'onglets horizontal
 * utilisé par le reste de la page station. */
export function StationAdminCenter({
  organizationId,
  station,
  city,
  stationId,
  onReload,
  onClose,
}: {
  organizationId: string;
  station: Station;
  city: City | null;
  fuelProducts: FuelProduct[];
  stationId: string;
  onReload: () => void;
  onClose: () => void;
}) {
  const t = useTranslations("zyloLiquid.stationAdmin");
  const [section, setSection] = useState<SectionKey>("identity");

  const items: { key: SectionKey; label: string; icon: typeof Building2 }[] = [
    { key: "identity", label: t("sections.identity"), icon: Building2 },
    { key: "operations", label: t("sections.operations"), icon: Fuel },
    { key: "orders", label: t("sections.orders"), icon: ShoppingCart },
    { key: "deliveries", label: t("sections.deliveries"), icon: TruckIcon },
    { key: "stationAlerts", label: t("sections.stationAlerts"), icon: AlertTriangle },
    { key: "infrastructure", label: t("sections.infrastructure"), icon: Landmark },
    { key: "equipment", label: t("sections.equipment"), icon: Wrench },
    { key: "maintenance", label: t("sections.maintenance"), icon: ClipboardList },
    { key: "regulatory", label: t("sections.regulatory"), icon: Shield },
    { key: "documents", label: t("sections.documents"), icon: ShoppingBag },
    { key: "personnel", label: t("sections.personnel"), icon: Users },
    { key: "security", label: t("sections.security"), icon: Shield },
    { key: "suppliers", label: t("sections.suppliers"), icon: TruckIcon },
    { key: "shop", label: t("sections.shop"), icon: Store },
    { key: "financial", label: t("sections.financial"), icon: Landmark },
    { key: "history", label: t("sections.history"), icon: History },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr]">
      <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
        <button
          type="button"
          onClick={onClose}
          className="mb-1 flex shrink-0 items-center gap-2 rounded-button px-3 py-2 text-left text-body-sm font-medium text-text-muted hover:bg-surface-muted"
        >
          <ArrowLeft className="size-4 shrink-0" aria-hidden />
          {t("back")}
        </button>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setSection(item.key)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-button px-3 py-2 text-left text-body-sm font-medium transition-colors",
                section === item.key ? "bg-primary/10 text-primary" : "text-text-muted hover:bg-surface-muted"
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              {item.label}
            </button>
          );
        })}
        <div className="my-2 hidden border-t border-border-subtle lg:block" />
        <button
          type="button"
          onClick={onClose}
          className="flex shrink-0 items-center gap-2 rounded-button px-3 py-2 text-left text-body-sm font-medium text-text-muted hover:bg-surface-muted"
        >
          <Droplet className="size-4 shrink-0" aria-hidden />
          {t("sections.tanksLink")}
        </button>
      </nav>

      <div>
        {section === "identity" && (
          <AdministrationTab organizationId={organizationId} station={station} city={city} onReload={onReload} />
        )}
        {section === "operations" && (
          <OperationsSection organizationId={organizationId} station={station} />
        )}
        {section === "orders" && <OrdersSection organizationId={organizationId} station={station} />}
        {section === "deliveries" && <DeliveriesSection organizationId={organizationId} station={station} />}
        {section === "stationAlerts" && <StationAlertsSection organizationId={organizationId} station={station} />}
        {section === "infrastructure" && (
          <InfrastructureSection organizationId={organizationId} station={station} onReload={onReload} />
        )}
        {section === "equipment" && <EquipmentSection organizationId={organizationId} stationId={stationId} />}
        {section === "maintenance" && <MaintenanceSection organizationId={organizationId} stationId={stationId} />}
        {section === "regulatory" && <RegulationTab organizationId={organizationId} stationId={stationId} />}
        {section === "documents" && <DocumentsSection organizationId={organizationId} stationId={stationId} />}
        {section === "personnel" && <PersonnelSection organizationId={organizationId} stationId={stationId} stationName={station.name} />}
        {section === "security" && <SecuritySection organizationId={organizationId} stationId={stationId} />}
        {section === "suppliers" && <SuppliersSection organizationId={organizationId} stationId={stationId} />}
        {section === "shop" && <ShopSection organizationId={organizationId} station={station} />}
        {section === "financial" && <FinancialSection organizationId={organizationId} stationId={stationId} />}
        {section === "history" && <HistorySection organizationId={organizationId} stationId={stationId} />}
      </div>
    </div>
  );
}
