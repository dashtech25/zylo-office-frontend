import { PublicFooter } from "@/core/layout/PublicFooter";
import { PublicHeader } from "@/core/layout/PublicHeader";

/** Groupe de routes du site public (vitrine) de Zylo Office — jamais
 * protégé par `ProtectedRoute`/`AppShell` (contrairement à `(app)/`).
 * Structure inspirée d'odoo.com (header + contenu + footer), contenu
 * propre à Zylo Office. */
export default function PublicGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <PublicHeader />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}
