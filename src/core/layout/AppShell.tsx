"use client";

import {
  Bell,
  Building2,
  ChevronDown,
  ClipboardList,
  Component,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  MessageSquare,
  Settings as SettingsIcon,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/core/auth/AuthContext";
import { LocaleSwitcher } from "@/shared/i18n/LocaleSwitcher";
import { Avatar, Badge } from "@/shared/ui";
import { cn } from "@/shared/lib/cn";

interface SidebarEntry {
  labelKey: string;
  href?: string;
  icon: LucideIcon;
  comingSoon?: boolean;
}

interface SidebarSection {
  titleKey: string;
  entries: SidebarEntry[];
}

/** Sidebar conforme à interface-zylo-liquid-convention/interface/instruction.md
 * (groupes ACCUEIL/APPLICATIONS/GESTION, item actif en fond bleu clair avec
 * barre d'accentuation). Aucune entrée de module métier codée en dur ici :
 * la page Applications (marketplace) est le seul point d'installation, les
 * cartes du tableau de bord reflètent les modules réellement actifs. */
const SECTIONS: SidebarSection[] = [
  {
    titleKey: "sections.home",
    entries: [{ labelKey: "items.dashboard", href: "/", icon: LayoutDashboard }],
  },
  {
    titleKey: "sections.applications",
    entries: [{ labelKey: "items.applications", href: "/applications", icon: LayoutGrid }],
  },
  {
    titleKey: "sections.management",
    entries: [
      { labelKey: "items.organizations", href: "/organizations", icon: Building2 },
      { labelKey: "items.users", href: "/users", icon: Users },
      { labelKey: "items.roles", href: "/roles", icon: ShieldCheck },
      { labelKey: "items.audit", href: "/audit", icon: ClipboardList },
      { labelKey: "items.settings", icon: SettingsIcon, comingSoon: true },
      { labelKey: "items.uiPreview", href: "/ui-preview", icon: Component },
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
        className="flex items-center gap-2 rounded-button p-1 hover:bg-surface-muted"
      >
        <Avatar name={user.fullName || user.email} size="sm" />
        <ChevronDown className="size-4 text-text-muted" aria-hidden />
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

export function AppShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("navigation");
  const tCommon = useTranslations("common");
  const pathname = usePathname();

  return (
    <div className="flex h-screen bg-surface-muted">
      <aside className="flex w-60 shrink-0 flex-col border-r border-border-subtle bg-surface">
        <div className="flex items-center gap-2 border-b border-border-subtle px-4 py-4">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-primary text-body-md font-bold text-white">
            Z
          </span>
          <span className="text-h4 font-bold text-text">{tCommon("appName")}</span>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {SECTIONS.map((section) => (
            <div key={section.titleKey} className="py-2">
              <h6 className="px-3 pb-1 text-caption font-bold uppercase tracking-wide text-text-muted">
                {t(section.titleKey)}
              </h6>
              {section.entries.map((entry) => {
                const label = t(entry.labelKey);
                const active = entry.href === "/" ? pathname === "/" : Boolean(entry.href && pathname?.startsWith(entry.href));
                const Icon = entry.icon;
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
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-end gap-3 border-b border-border-subtle bg-surface px-6">
          <button
            type="button"
            aria-label={tCommon("header.notifications")}
            className="relative rounded-full p-2 text-text-muted hover:bg-surface-muted"
          >
            <Bell className="size-5" aria-hidden />
            <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-error" aria-hidden />
          </button>
          <button
            type="button"
            aria-label={tCommon("header.messages")}
            className="rounded-full p-2 text-text-muted hover:bg-surface-muted"
          >
            <MessageSquare className="size-5" aria-hidden />
          </button>
          <LocaleSwitcher />
          <AccountMenu />
        </header>
        <main className="flex-1 overflow-y-auto bg-surface-muted p-8">{children}</main>
      </div>
    </div>
  );
}
