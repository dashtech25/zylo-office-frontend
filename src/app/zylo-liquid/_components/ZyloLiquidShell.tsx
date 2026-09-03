"use client";

import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  ChevronDown,
  Droplet,
  Gauge,
  LayoutDashboard,
  LogOut,
  Network,
  Settings as SettingsIcon,
  Truck,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/core/auth/AuthContext";
import { Avatar, Badge } from "@/shared/ui";
import { cn } from "@/shared/lib/cn";

interface NavEntry {
  labelKey: string;
  href?: string;
  icon: LucideIcon;
  comingSoon?: boolean;
}

interface NavSection {
  titleKey: string;
  entries: NavEntry[];
}

/** Sidebar/header dédiés au module Zylo Liquid — délibérément distincts du
 * shell Zylo Office (fond sombre --color-secondary/--color-secondary-active
 * déjà définis dans globals.css, jamais une nouvelle palette), conformément
 * à la maquette (interface-zylo-liquid-convention/interface). Seul
 * "Tableau de bord" a une page réelle pour l'instant — le reste suit la même
 * convention "à venir" déjà utilisée par AppShell (Zylo Office). */
const SECTIONS: NavSection[] = [
  {
    titleKey: "nav.sections.supervision",
    entries: [
      { labelKey: "nav.items.dashboard", href: "/zylo-liquid", icon: LayoutDashboard },
      { labelKey: "nav.items.stations", href: "/zylo-liquid/stations", icon: Network },
      { labelKey: "nav.items.alerts", href: "/zylo-liquid/alerts", icon: AlertTriangle },
    ],
  },
  {
    titleKey: "nav.sections.history",
    entries: [
      { labelKey: "nav.items.deliveries", icon: Truck, comingSoon: true },
      { labelKey: "nav.items.leaks", icon: Droplet, comingSoon: true },
      { labelKey: "nav.items.measurements", icon: Gauge, comingSoon: true },
    ],
  },
  {
    titleKey: "nav.sections.configuration",
    entries: [
      { labelKey: "nav.items.network", icon: Network, comingSoon: true },
      { labelKey: "nav.items.settings", icon: SettingsIcon, comingSoon: true },
    ],
  },
];

function AccountMenu() {
  const { user, logout } = useAuth();
  const tCommon = useTranslations("common");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  if (!user) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={tCommon("header.account")}
        className="flex items-center gap-2 rounded-button p-1 hover:bg-white/10"
      >
        <Avatar name={user.fullName || user.email} size="sm" />
        <ChevronDown className="size-4 text-white/70" aria-hidden />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-56 rounded-card border border-border-subtle bg-surface p-2 shadow-elevated"
        >
          <div className="px-2 py-1.5">
            <p className="truncate text-body-sm font-semibold text-text">{user.fullName}</p>
            <p className="truncate text-caption text-text-muted">{user.email}</p>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => logout()}
            className="mt-1 flex w-full items-center gap-2 rounded-button px-2 py-1.5 text-body-sm text-text hover:bg-surface-muted"
          >
            <LogOut className="size-4" aria-hidden />
            {tCommon("header.logout")}
          </button>
        </div>
      )}
    </div>
  );
}

/** Une entrée par route réelle du module — la clé de traduction du fil
 * d'ariane suit le chemin le plus long qui préfixe l'URL courante, pour que
 * les futures pages de détail (/zylo-liquid/stations/{id}...) retombent sur
 * le titre de leur section tant qu'elles n'ont pas leur propre entrée. */
const BREADCRUMB_BY_PATH: Record<string, string> = {
  "/zylo-liquid": "breadcrumb",
  "/zylo-liquid/stations": "breadcrumbStations",
  "/zylo-liquid/alerts": "breadcrumbAlerts",
};

export function ZyloLiquidShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("zyloLiquid");
  const tCommon = useTranslations("common");
  const pathname = usePathname() ?? "/zylo-liquid";
  const breadcrumbKey =
    Object.keys(BREADCRUMB_BY_PATH)
      .filter((path) => pathname.startsWith(path))
      .sort((a, b) => b.length - a.length)[0] ?? "/zylo-liquid";

  return (
    <div className="flex h-screen bg-surface-muted">
      <aside className="flex w-[220px] shrink-0 flex-col bg-secondary-active text-white">
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-4">
          <Droplet className="size-5 text-primary" aria-hidden />
          <span className="text-body-md font-bold">{t("appName")}</span>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {SECTIONS.map((section) => (
            <div key={section.titleKey} className="py-2">
              <h6 className="px-3 pb-1 text-caption font-bold uppercase tracking-wide text-white/40">{t(section.titleKey)}</h6>
              {section.entries.map((entry) => {
                const label = t(entry.labelKey);
                const active =
                  entry.href === "/zylo-liquid" ? pathname === "/zylo-liquid" : Boolean(entry.href && pathname?.startsWith(entry.href));
                const Icon = entry.icon;
                const className = cn(
                  "relative flex items-center gap-2 rounded-button px-3 py-2 text-body-sm font-medium transition-colors",
                  active ? "bg-white/10 text-white" : entry.comingSoon ? "cursor-not-allowed text-white/30" : "text-white/70 hover:bg-white/10"
                );
                const content = (
                  <>
                    <Icon className="size-4 shrink-0" aria-hidden />
                    <span className="flex-1 truncate">{label}</span>
                    {entry.comingSoon && (
                      <Badge tone="idle" size="sm" className="bg-white/10 text-white/50">
                        {tCommon("states.comingSoon")}
                      </Badge>
                    )}
                  </>
                );
                return entry.comingSoon || !entry.href ? (
                  <button key={entry.labelKey} type="button" disabled className={className}>
                    {content}
                  </button>
                ) : (
                  <Link key={entry.labelKey} href={entry.href} className={className}>
                    {content}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="border-t border-white/10 p-2">
          <Link href="/" className="flex items-center gap-2 rounded-button px-3 py-2 text-body-sm text-white/70 hover:bg-white/10">
            <ArrowLeft className="size-4" aria-hidden />
            {t("backToOffice")}
          </Link>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between bg-secondary px-6 text-white">
          <div className="flex items-center gap-3">
            <Droplet className="size-5 text-primary" aria-hidden />
            <span className="text-body-md font-semibold">{t("appName")}</span>
            <span className="h-5 w-px bg-white/20" aria-hidden />
            <span className="text-body-sm text-white/70">{t(BREADCRUMB_BY_PATH[breadcrumbKey])}</span>
          </div>
          <div className="flex items-center gap-4">
            <button type="button" aria-label={tCommon("header.notifications")} className="relative rounded-full p-2 text-white/70 hover:bg-white/10">
              <Bell className="size-5" aria-hidden />
            </button>
            <AccountMenu />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-8">{children}</main>
      </div>
    </div>
  );
}
