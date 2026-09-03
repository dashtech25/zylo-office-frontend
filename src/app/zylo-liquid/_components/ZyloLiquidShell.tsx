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
import { useState } from "react";

import { useAuth } from "@/core/auth/AuthContext";

import "../prototype.css";

interface NavEntry {
  labelKey: string;
  href?: string;
  icon: LucideIcon;
  comingSoon?: boolean;
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
const NAV: NavGroup[] = [
  {
    titleKey: "nav.sections.pilotage",
    entries: [
      { labelKey: "nav.items.dashboard", href: "/zylo-liquid", icon: Home },
      { labelKey: "nav.items.alerts", href: "/zylo-liquid/alerts", icon: Bell },
      { labelKey: "nav.items.rapports", href: "/zylo-liquid/rapports", icon: Activity, comingSoon: true },
    ],
  },
  {
    titleKey: "nav.sections.exploitation",
    entries: [
      { labelKey: "nav.items.stations", href: "/zylo-liquid/stations", icon: Building2 },
      { labelKey: "nav.items.cuves", href: "/zylo-liquid/cuves", icon: Gauge },
      { labelKey: "nav.items.deliveries", href: "/zylo-liquid/livraisons", icon: Truck },
      { labelKey: "nav.items.approvisionnement", href: "/zylo-liquid/approvisionnement", icon: Package, comingSoon: true },
      { labelKey: "nav.items.reconciliation", href: "/zylo-liquid/reconciliation", icon: Scale, comingSoon: true },
    ],
  },
  {
    titleKey: "nav.sections.commerce",
    entries: [
      { labelKey: "nav.items.ventes", href: "/zylo-liquid/ventes", icon: Fuel, comingSoon: true },
      { labelKey: "nav.items.shifts", href: "/zylo-liquid/shifts", icon: Users, comingSoon: true },
      { labelKey: "nav.items.caisse", href: "/zylo-liquid/caisse", icon: Banknote, comingSoon: true },
      { labelKey: "nav.items.caisseEcarts", href: "/zylo-liquid/caisse-ecarts", icon: Scale, comingSoon: true },
      { labelKey: "nav.items.credit", href: "/zylo-liquid/credit", icon: Users, comingSoon: true },
    ],
  },
  {
    titleKey: "nav.sections.technique",
    entries: [
      { labelKey: "nav.items.maintenance", href: "/zylo-liquid/maintenance", icon: Wrench, comingSoon: true },
      { labelKey: "nav.items.securite", href: "/zylo-liquid/securite", icon: ShieldCheck, comingSoon: true },
      { labelKey: "nav.items.reglementaire", href: "/zylo-liquid/reglementaire", icon: FileText, comingSoon: true },
      { labelKey: "nav.items.audit", href: "/zylo-liquid/audit", icon: ClipboardList, comingSoon: true },
    ],
  },
  {
    titleKey: "nav.sections.systeme",
    entries: [
      { labelKey: "nav.items.configuration", href: "/zylo-liquid/configuration", icon: SettingsIcon, comingSoon: true },
      { labelKey: "nav.items.utilisateurs", href: "/zylo-liquid/utilisateurs", icon: Users, comingSoon: true },
      { labelKey: "nav.items.sante", href: "/zylo-liquid/sante", icon: Activity, comingSoon: true },
      { labelKey: "nav.items.journalAudit", href: "/zylo-liquid/journal-audit", icon: ClipboardList, comingSoon: true },
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
  const [navOpen, setNavOpen] = useState(false);

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
          {NAV.map((group) => (
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
