"use client";

import {
  Anchor,
  BadgeCheck,
  BarChart3,
  Bell,
  Bot,
  Brain,
  Camera,
  Cpu,
  Droplets,
  FileText,
  Fuel,
  Gauge,
  LayoutDashboard,
  Map,
  Plug,
  Radar,
  Ship,
  Sparkles,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Badge } from "@/shared/ui";
import { cn } from "@/shared/lib/cn";

/** Sidebar Zylo Tanker (SMART TANKER) — reprend les 20 modules du cahier
 * des charges (Downloads/SMART_TANKER_Specifications_Fonctionnelles.docx),
 * même ordre. Chantier frontend-only, données mockées
 * (modules/zylo-tanker/mock) : seuls les modules prioritaires validés ont
 * une page ; le reste reste visible et désactivé (`comingSoon`), jamais
 * retiré — même règle que ZyloLiquidShell. */

interface NavEntry {
  label: string;
  href?: string;
  icon: LucideIcon;
  comingSoon?: boolean;
}

const NAV: NavEntry[] = [
  { label: "Tableau de bord", href: "/zylo-tanker", icon: LayoutDashboard },
  { label: "Gestion des cuves", href: "/zylo-tanker/cuves", icon: Droplets },
  { label: "Gestion des moteurs", icon: Cpu, comingSoon: true },
  { label: "Groupes électrogènes", icon: Zap, comingSoon: true },
  { label: "Maintenance prédictive IA", icon: Brain, comingSoon: true },
  { label: "Digital Twin", icon: Ship, comingSoon: true },
  { label: "Gestion des pompes", href: "/zylo-tanker/pompes", icon: Gauge },
  { label: "Réseau de tuyauterie", icon: Plug, comingSoon: true },
  { label: "Consommation carburant", href: "/zylo-tanker/consommation", icon: Fuel },
  { label: "Navigation", icon: Map, comingSoon: true },
  { label: "Optimisation énergétique", icon: Sparkles, comingSoon: true },
  { label: "Vidéosurveillance IA", icon: Camera, comingSoon: true },
  { label: "Contrôle d'accès", icon: BadgeCheck, comingSoon: true },
  { label: "Alarmes", icon: Bell, comingSoon: true },
  { label: "Reporting", icon: BarChart3, comingSoon: true },
  { label: "Gestion documentaire", href: "/zylo-tanker/documents", icon: FileText },
  { label: "Utilisateurs", icon: Users, comingSoon: true },
  { label: "KPI", icon: Radar, comingSoon: true },
  { label: "Centre de supervision", href: "/zylo-tanker/supervision", icon: Anchor },
  { label: "Intégrations", icon: Bot, comingSoon: true },
];

export function ZyloTankerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/zylo-tanker";

  return (
    <div className="flex h-screen bg-surface-muted">
      <aside className="flex w-64 shrink-0 flex-col border-r border-border-subtle bg-surface">
        <div className="flex items-center gap-2 border-b border-border-subtle px-4 py-4">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-primary text-body-md font-bold text-white">
            <Ship className="size-4" aria-hidden />
          </span>
          <div>
            <div className="text-h4 font-bold text-text">Zylo Tanker</div>
            <div className="text-caption text-text-muted">SMART TANKER</div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {NAV.map((entry) => {
            const label = entry.label;
            const Icon = entry.icon;
            const active = entry.href === "/zylo-tanker" ? pathname === "/zylo-tanker" : Boolean(entry.href && pathname?.startsWith(entry.href));
            const className = cn(
              "relative flex items-center gap-2 rounded-button px-3 py-2 text-body-sm font-medium transition-colors",
              active
                ? "bg-primary-muted text-primary"
                : entry.comingSoon
                  ? "cursor-not-allowed text-text-disabled"
                  : "text-text hover:bg-surface-muted"
            );
            const content = (
              <>
                {active && <span className="absolute inset-y-1 left-0 w-1 rounded-r bg-primary" aria-hidden />}
                <Icon className="size-4 shrink-0" aria-hidden />
                <span className="flex-1 truncate">{label}</span>
                {entry.comingSoon && (
                  <Badge tone="idle" size="sm">
                    Bientôt
                  </Badge>
                )}
              </>
            );
            return entry.comingSoon || !entry.href ? (
              <button key={label} type="button" disabled className={className}>
                {content}
              </button>
            ) : (
              <Link key={label} href={entry.href} className={className}>
                {content}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border-subtle px-4 py-3 text-caption text-text-muted">
          Données de démonstration — aucun backend branché.
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border-subtle bg-surface px-6">
          <Link href="/zylo-liquid" className="text-body-sm text-text-muted hover:text-text">
            ← Retour à Zylo Office
          </Link>
        </header>
        <main className="flex-1 overflow-y-auto bg-surface-muted p-8">{children}</main>
      </div>
    </div>
  );
}
