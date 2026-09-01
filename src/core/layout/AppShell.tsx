"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAuth } from "@/core/auth/AuthContext";
import { LocaleSwitcher } from "@/shared/i18n/LocaleSwitcher";
import { Avatar, Badge, Button } from "@/shared/ui";
import { cn } from "@/shared/lib/cn";

interface SidebarEntry {
  labelKey: string;
  href?: string;
  comingSoon?: boolean;
}

interface SidebarSection {
  titleKey: string;
  entries: SidebarEntry[];
}

/** Sidebar catégorisée avec entrées actives/désactivées ("À venir") — même
 * principe que la sidebar déjà validée sur station-simulator, adapté aux
 * modules de Zylo Office. Les libellés viennent de navigation.json — aucun
 * texte en dur (instruction.md §8-11). */
const SECTIONS: SidebarSection[] = [
  {
    titleKey: "sections.main",
    entries: [
      { labelKey: "items.dashboard", href: "/" },
      { labelKey: "items.organizations", href: "/organizations" },
    ],
  },
  {
    titleKey: "sections.modules",
    entries: [
      { labelKey: "items.zyloLiquid", comingSoon: true },
      { labelKey: "items.crm", comingSoon: true },
      { labelKey: "items.stock", comingSoon: true },
      { labelKey: "items.accounting", comingSoon: true },
    ],
  },
  {
    titleKey: "sections.administration",
    entries: [
      { labelKey: "items.uiPreview", href: "/ui-preview" },
      { labelKey: "items.users", comingSoon: true },
      { labelKey: "items.roles", comingSoon: true },
      { labelKey: "items.settings", comingSoon: true },
    ],
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const t = useTranslations("navigation");
  const tCommon = useTranslations("common");

  return (
    <div className="flex h-screen">
      <aside className="flex w-60 shrink-0 flex-col border-r border-secondary-active bg-secondary text-white/80">
        <div className="border-b border-white/10 px-4 py-4 font-semibold text-white">{tCommon("appName")}</div>
        <nav className="flex-1 overflow-y-auto py-2">
          {SECTIONS.map((section) => (
            <div key={section.titleKey} className="px-2 py-2">
              <h6 className="px-2 pb-1 text-caption font-semibold tracking-wide text-white/50">
                {t(section.titleKey)}
              </h6>
              {section.entries.map((entry) => {
                const label = t(entry.labelKey);
                const content = (
                  <>
                    <span>{label}</span>
                    {entry.comingSoon && (
                      <Badge tone="idle" size="sm" className="bg-white/10 text-white/60">
                        {tCommon("states.comingSoon")}
                      </Badge>
                    )}
                  </>
                );
                const className = cn(
                  "flex w-full items-center justify-between rounded-button px-2 py-1.5 text-body-sm text-left transition-colors",
                  entry.comingSoon ? "cursor-not-allowed text-white/40" : "hover:bg-white/10"
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
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border-subtle px-4">
          <LocaleSwitcher />
          <div className="flex items-center gap-3">
            {user?.email && <Avatar name={user.email} size="sm" />}
            <span className="text-body-sm text-text-muted">{user?.email}</span>
            <Button variant="outline" size="sm" onClick={() => logout()}>
              {t("logout")}
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-surface-muted p-6">{children}</main>
      </div>
    </div>
  );
}
