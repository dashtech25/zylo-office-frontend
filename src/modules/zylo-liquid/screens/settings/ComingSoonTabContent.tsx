import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";

import { EmptyState } from "@/shared/ui";

/** Reprend le contenu (icône + libellé) de `ComingSoonPage` sans le
 * `PageHeader` propre à une page racine — utilisé ici à l'intérieur d'un
 * onglet qui a déjà son propre titre de page au-dessus. */
export function ComingSoonTabContent({ note }: { note: string }) {
  const tCommon = useTranslations("common");
  return <EmptyState icon={Lock} title={tCommon("states.comingSoon")} description={note} />;
}
