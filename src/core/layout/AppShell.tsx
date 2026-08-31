"use client";

import { useAuth } from "@/core/auth/AuthContext";

interface SidebarEntry {
  label: string;
  href?: string;
  comingSoon?: boolean;
}

interface SidebarSection {
  title: string;
  entries: SidebarEntry[];
}

/** Sidebar catégorisée avec entrées actives/désactivées ("À venir") — même
 * principe que la sidebar déjà validée sur station-simulator, adapté aux
 * modules de Zylo Office. */
const SECTIONS: SidebarSection[] = [
  {
    title: "PRINCIPAL",
    entries: [
      { label: "Tableau de bord", href: "/" },
      { label: "Organisations", href: "/organizations" },
    ],
  },
  {
    title: "MODULES",
    entries: [
      { label: "Zylo Liquid", comingSoon: true },
      { label: "CRM", comingSoon: true },
      { label: "Stock", comingSoon: true },
      { label: "Comptabilité", comingSoon: true },
    ],
  },
  {
    title: "ADMINISTRATION",
    entries: [
      { label: "Utilisateurs", comingSoon: true },
      { label: "Rôles & permissions", comingSoon: true },
      { label: "Paramètres", comingSoon: true },
    ],
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <div className="flex h-screen">
      <aside className="w-60 shrink-0 border-r border-neutral-800 bg-neutral-950 text-neutral-200 flex flex-col">
        <div className="px-4 py-4 font-semibold text-white border-b border-neutral-800">Zylo Office</div>
        <nav className="flex-1 overflow-y-auto py-2">
          {SECTIONS.map((section) => (
            <div key={section.title} className="px-2 py-2">
              <h6 className="px-2 pb-1 text-[11px] font-semibold tracking-wide text-neutral-500">{section.title}</h6>
              {section.entries.map((entry) => (
                <button
                  key={entry.label}
                  type="button"
                  disabled={entry.comingSoon}
                  className="w-full flex items-center justify-between rounded px-2 py-1.5 text-sm text-left disabled:text-neutral-600 disabled:cursor-not-allowed hover:not-disabled:bg-neutral-800"
                >
                  <span>{entry.label}</span>
                  {entry.comingSoon && (
                    <span className="text-[10px] rounded bg-neutral-800 px-1.5 py-0.5 text-neutral-500">À venir</span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </nav>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 shrink-0 border-b border-neutral-200 flex items-center justify-between px-4">
          <span className="text-sm text-neutral-500">{user?.email}</span>
          <button
            type="button"
            onClick={() => logout()}
            className="text-sm rounded border border-neutral-300 px-3 py-1 hover:bg-neutral-100"
          >
            Se déconnecter
          </button>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
