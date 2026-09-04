import { Card } from "@/shared/ui";

/** Bloc de section réutilisé sur tous les onglets de la page Paramètres —
 * titre en petites majuscules avec liseré, comme les autres pages
 * "configuration" de Zylo Office. */
export function SettingsSectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card padding="md" className="flex flex-col gap-4">
      <h4 className="border-b border-border-subtle pb-3 text-caption font-medium uppercase tracking-wide text-text-muted">{title}</h4>
      {children}
    </Card>
  );
}
