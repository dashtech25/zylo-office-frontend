import { X } from "lucide-react";

import { Alert } from "@/shared/ui";

/** Toast de confirmation bas de page, réutilisé par tous les onglets de
 * Paramètres qui enregistrent réellement quelque chose (aujourd'hui :
 * Organisation). Le parent porte le minuteur d'auto-fermeture (3s) — ce
 * composant est purement présentation. */
export function SettingsToast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 60, maxWidth: 500 }}>
      <Alert tone="success" action={<button type="button" aria-label="close" onClick={onClose}><X className="size-4" aria-hidden /></button>}>
        {message}
      </Alert>
    </div>
  );
}
