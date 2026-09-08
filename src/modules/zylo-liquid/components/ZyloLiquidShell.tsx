"use client";

import {
  Activity,
  Banknote,
  Bell,
  BookOpen,
  Building2,
  ChevronRight,
  ClipboardList,
  Droplet,
  FileText,
  Fuel,
  Gauge,
  Home,
  LogOut,
  Menu,
  Package,
  Scale,
  Settings as SettingsIcon,
  ShoppingBag,
  ShieldCheck,
  Truck,
  Users,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { useAuth } from "@/core/auth/AuthContext";
import { useOrganization } from "@/core/organization/OrganizationContext";
import { usePermissions } from "@/core/rbac/PermissionContext";

import { useHolykellSyncStatus } from "@/modules/zylo-liquid/hooks/useHolykellSyncStatus";
import "../styles/prototype.css";

interface NavEntry {
  labelKey: string;
  href?: string;
  icon: LucideIcon;
  comingSoon?: boolean;
  /** Permission requise pour voir cette entrée — vérifiée côté client
   * uniquement pour adapter l'affichage au rôle (jamais un substitut à la
   * vérification serveur, chaque page reste protégée indépendamment).
   * Absente = toujours visible (entrées transverses type tableau de bord).
   * Jamais appliquée aux entrées `comingSoon` (règle absolue du
   * commanditaire, §19 : elles restent visibles, seulement désactivées). */
  requiredPermission?: string;
}

interface NavGroup {
  titleKey: string;
  entries: NavEntry[];
}

/** Reproduit exactement la structure `var NAV` du prototype validé
 * (prototype.html, ~ligne 2901) : 5 groupes, mêmes libellés, même ordre,
 * mêmes icônes (mappées vers leur équivalent lucide-react le plus proche —
 * le prototype utilise déjà des tracés au format lucide : 24x24,
 * stroke-width 1.8, contour seul). Un item est `comingSoon` quand la
 * fonctionnalité est classée hors Niveau 1 ou pas encore branchée dans
 * `docs/modules/zylo-liquid/phase-3-prototype-compatibility-matrix.md` —
 * il reste à sa place et avec son libellé exacts, seulement désactivé,
 * jamais retiré (règle absolue du commanditaire, §19 de la mission). */
// Codes de permission repris tels quels de app/modules/zylo_liquid/permissions.py
// (backend) — vérifiés un par un contre l'écran réel consommé par chaque
// entrée (jamais devinés), pour adapter le menu au rôle effectif de
// l'utilisateur connecté (découvert manquant en testant un scénario de démo
// réel avec des gérants/pompistes scopés station, mission
// « vente-maintenant-reglementation »).
const NAV: NavGroup[] = [
  {
    titleKey: "nav.sections.pilotage",
    entries: [
      { labelKey: "nav.items.dashboard", href: "/zylo-liquid", icon: Home },
      { labelKey: "nav.items.alerts", href: "/zylo-liquid/alerts", icon: Bell, requiredPermission: "zyloLiquid.alert.read" },
      { labelKey: "nav.items.rapports", href: "/zylo-liquid/rapports", icon: Activity },
    ],
  },
  {
    titleKey: "nav.sections.exploitation",
    entries: [
      { labelKey: "nav.items.stations", href: "/zylo-liquid/stations", icon: Building2, requiredPermission: "zyloLiquid.station.read" },
      { labelKey: "nav.items.cuves", href: "/zylo-liquid/cuves", icon: Gauge, requiredPermission: "zyloLiquid.tank.read" },
      { labelKey: "nav.items.deliveries", href: "/zylo-liquid/livraisons", icon: Truck, requiredPermission: "zyloLiquid.delivery.read" },
      { labelKey: "nav.items.approvisionnement", href: "/zylo-liquid/approvisionnement", icon: Package, requiredPermission: "zyloLiquid.deliveryDeclaration.read" },
      { labelKey: "nav.items.reconciliation", href: "/zylo-liquid/reconciliation", icon: Scale, requiredPermission: "zyloLiquid.reconciliation.read" },
    ],
  },
  {
    titleKey: "nav.sections.commerce",
    entries: [
      { labelKey: "nav.items.ventes", href: "/zylo-liquid/ventes", icon: Fuel, requiredPermission: "zyloLiquid.sale.read" },
      { labelKey: "nav.items.produits", href: "/zylo-liquid/produits", icon: ShoppingBag, requiredPermission: "zyloLiquid.sellableProduct.read" },
      { labelKey: "nav.items.shifts", href: "/zylo-liquid/shifts", icon: Users, requiredPermission: "zyloLiquid.shiftCashDeclaration.read" },
      { labelKey: "nav.items.caisse", href: "/zylo-liquid/caisse", icon: Banknote, requiredPermission: "zyloLiquid.cash.read" },
      { labelKey: "nav.items.caisseEcarts", href: "/zylo-liquid/caisse-ecarts", icon: Scale, requiredPermission: "zyloLiquid.reconciliation.read" },
      { labelKey: "nav.items.credit", href: "/zylo-liquid/credit", icon: Users, requiredPermission: "zyloLiquid.commercialAccount.read" },
    ],
  },
  {
    titleKey: "nav.sections.technique",
    entries: [
      { labelKey: "nav.items.maintenance", href: "/zylo-liquid/maintenance", icon: Wrench, requiredPermission: "zyloLiquid.equipment.read" },
      { labelKey: "nav.items.securite", href: "/zylo-liquid/securite", icon: ShieldCheck, comingSoon: true },
      { labelKey: "nav.items.reglementaire", href: "/zylo-liquid/reglementaire", icon: FileText, requiredPermission: "zyloLiquid.regulatoryDocument.read" },
      { labelKey: "nav.items.audit", href: "/zylo-liquid/audit", icon: ClipboardList, comingSoon: true },
    ],
  },
  {
    titleKey: "nav.sections.systeme",
    entries: [
      { labelKey: "nav.items.configuration", href: "/zylo-liquid/configuration", icon: SettingsIcon, requiredPermission: "zyloLiquid.station.manage" },
      { labelKey: "nav.items.utilisateurs", href: "/users", icon: Users, requiredPermission: "rbac.role.manage" },
      { labelKey: "nav.items.sante", href: "/zylo-liquid/sante", icon: Activity, comingSoon: true },
      { labelKey: "nav.items.journalAudit", href: "/audit", icon: ClipboardList, requiredPermission: "audit.log.view" },
      { labelKey: "nav.items.hypotheses", href: "/zylo-liquid/hypotheses", icon: BookOpen, comingSoon: true },
    ],
  },
];

/** Fil d'ariane pour les pages qui ont un libellé propre, distinct de leur
 * entrée de sidebar (ex. sous-pages de détail). Pour toute autre route, le
 * libellé est dérivé directement de `NAV` (une seule source de vérité pour
 * les libellés de page, cohérent avec la sidebar). */
const BREADCRUMB_BY_PATH: Record<string, string> = {
  "/zylo-liquid": "breadcrumb",
  "/zylo-liquid/stations": "breadcrumbStations",
  "/zylo-liquid/alerts": "breadcrumbAlerts",
  "/zylo-liquid/cuves": "breadcrumbTanks",
  "/zylo-liquid/livraisons": "breadcrumbDeliveries",
};

const NAV_LABEL_BY_HREF: Record<string, string> = Object.fromEntries(
  NAV.flatMap((group) => group.entries).filter((entry): entry is NavEntry & { href: string } => !!entry.href).map((entry) => [entry.href, entry.labelKey])
);

export function ZyloLiquidShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("zyloLiquid");
  const tCommon = useTranslations("common");
  const pathname = usePathname() ?? "/zylo-liquid";
  const { user, logout } = useAuth();
  const { currentOrganization } = useOrganization();
  const { account: holykellAccount, minutesAgo: syncMinutesAgo } = useHolykellSyncStatus(currentOrganization?.id ?? null);
  const { can, loading: permissionsLoading } = usePermissions();
  const [navOpen, setNavOpen] = useState(false);

  // Adapte le menu au rôle effectif de l'utilisateur connecté — jamais un
  // substitut à la vérification serveur (chaque page reste protégée
  // indépendamment), seulement l'affichage. Les entrées `comingSoon` restent
  // toujours visibles (règle absolue du commanditaire, §19 : jamais
  // retirées, seulement désactivées) ; les entrées sans permission requise
  // (tableau de bord, rapports) restent toujours visibles. Pendant le
  // chargement des permissions, tout reste affiché pour éviter un
  // clignotement (évite de masquer puis réafficher une entrée à chaque
  // changement d'organisation).
  const visibleNav = useMemo(
    () =>
      NAV.map((group) => ({
        ...group,
        entries: group.entries.filter((entry) => entry.comingSoon || !entry.requiredPermission || permissionsLoading || can(entry.requiredPermission)),
      })).filter((group) => group.entries.length > 0),
    [can, permissionsLoading]
  );

  const breadcrumbPath =
    Object.keys(BREADCRUMB_BY_PATH)
      .filter((path) => pathname.startsWith(path))
      .sort((a, b) => b.length - a.length)[0] ?? "/zylo-liquid";
  const breadcrumbLabel = NAV_LABEL_BY_HREF[pathname] ? t(NAV_LABEL_BY_HREF[pathname]) : t(BREADCRUMB_BY_PATH[breadcrumbPath] ?? "breadcrumb");

  return (
    <div className="zl-shell shell">
      {navOpen && (
        <div
          role="presentation"
          onClick={() => setNavOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(16,28,39,.5)", zIndex: 45 }}
        />
      )}
      <aside className="sidebar" style={navOpen ? { position: "fixed", left: 0, top: 0, transform: "translateX(0)", zIndex: 46 } : undefined}>
        <div className="sb-brand">
          <Droplet className="size-8 text-[var(--brand)]" aria-hidden />
          <div>
            <div className="name">{t("appName")}</div>
            <div className="sub">{t("appSub")}</div>
          </div>
        </div>
        <nav className="sb-scroll">
          {visibleNav.map((group) => (
            <div key={group.titleKey}>
              <div className="sb-group">{t(group.titleKey)}</div>
              {group.entries.map((entry) => {
                const label = t(entry.labelKey);
                const Icon = entry.icon;
                const active = entry.href === "/zylo-liquid" ? pathname === "/zylo-liquid" : Boolean(entry.href && pathname?.startsWith(entry.href));
                if (!entry.href) {
                  return (
                    <button key={entry.labelKey} type="button" className="sb-link" disabled title={t("comingSoonTooltip")} style={{ opacity: 0.45, cursor: "not-allowed" }}>
                      <Icon className="ic" width={17} height={17} strokeWidth={1.8} aria-hidden />
                      <span>{label}</span>
                    </button>
                  );
                }
                return (
                  <Link
                    key={entry.labelKey}
                    href={entry.href}
                    className={`sb-link${active ? " active" : ""}`}
                    title={entry.comingSoon ? t("comingSoonTooltip") : undefined}
                    onClick={() => setNavOpen(false)}
                  >
                    <Icon className="ic" width={17} height={17} strokeWidth={1.8} aria-hidden />
                    <span>{label}</span>
                    {entry.comingSoon && <span className="cnt">{tCommon("states.comingSoon")}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="sb-foot">{t("sbFoot")}</div>
      </aside>

      <div className="main">
        <div className="topbar">
          <button type="button" className="burger" aria-label={tCommon("header.menu")} onClick={() => setNavOpen((v) => !v)}>
            {navOpen ? <X width={20} height={20} strokeWidth={1.8} aria-hidden /> : <Menu width={20} height={20} strokeWidth={1.8} aria-hidden />}
          </button>
          <div className="crumbs">
            <Link href="/zylo-liquid">{t("appName")}</Link>
            <span className="sep">
              <ChevronRight width={12} height={12} strokeWidth={1.8} aria-hidden />
            </span>
            <span className="strong" style={{ color: "var(--ink)" }}>
              {breadcrumbLabel}
            </span>
          </div>
          <div className="spacer" />
          {holykellAccount && syncMinutesAgo !== null && (
            <div className="row" style={{ gap: 6, alignItems: "center", marginRight: 4 }} title={holykellAccount.lastSyncAt ?? undefined}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: holykellAccount.lastSyncStatus === "failed" ? "var(--crit)" : "var(--ok)",
                  flex: "0 0 auto",
                }}
                aria-hidden
              />
              <span className="xsmall" style={{ color: "var(--ink-3)" }}>
                {holykellAccount.lastSyncStatus === "failed" ? t("sync.failed") : t("sync.label", { minutes: syncMinutesAgo })}
              </span>
            </div>
          )}
          <button type="button" className="btn sm" title={tCommon("header.notifications")}>
            <Bell width={16} height={16} strokeWidth={1.8} aria-hidden />
          </button>
          {user && (
            <button type="button" className="btn sm" title={user.fullName || user.email}>
              <Users width={15} height={15} strokeWidth={1.8} aria-hidden />
              <span className="nowrap">{user.fullName || user.email}</span>
            </button>
          )}
          <button type="button" className="btn sm" title={tCommon("header.logout")} onClick={() => logout()}>
            <LogOut width={15} height={15} strokeWidth={1.8} aria-hidden />
          </button>
        </div>
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
