import { API_URL } from "@/core/api/client";
import { getAccessToken } from "@/core/auth/tokens";
import type { TruckCurrentPosition } from "@/modules/zylo-liquid/services/zyloLiquidApi";

/** Flux SSE des positions courantes (2026-09-14, revue d'architecture —
 * corrige l'absence totale de rafraîchissement automatique sur la carte
 * Camions, signalée en conditions réelles). Pas `EventSource` natif : cette
 * API navigateur ne permet pas d'ajouter l'en-tête `Authorization`, requis
 * par tout le reste de l'app (voir `apiFetch`) — lecture manuelle du flux
 * via `fetch` + `ReadableStream`, en réutilisant exactement la même
 * convention d'authentification.
 *
 * Retourne une fonction d'arrêt (`AbortController.abort`) — l'appelant DOIT
 * la garder et l'invoquer au démontage, sous peine de laisser une requête
 * ouverte indéfiniment côté navigateur. */
export function openTruckLivePositionsStream(
  organizationId: string,
  onPositions: (positions: TruckCurrentPosition[]) => void,
  onError?: (error: unknown) => void,
): () => void {
  const controller = new AbortController();

  (async () => {
    const token = getAccessToken();
    const headers = new Headers({ Accept: "text/event-stream", "X-Organization-Id": organizationId });
    if (token) headers.set("Authorization", `Bearer ${token}`);

    try {
      const response = await fetch(`${API_URL}/api/v1/zylo-liquid/trucks/live-positions`, {
        headers,
        signal: controller.signal,
      });
      if (!response.ok || !response.body) {
        onError?.(new Error(`live-positions ${response.status}`));
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // Format SSE : évènements séparés par une ligne vide, chaque ligne de
      // donnée préfixée par "data: " — jamais de bibliothèque tierce pour
      // un parsing aussi simple.
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const event of events) {
          const dataLines = event.split("\n").filter((line) => line.startsWith("data:"));
          if (dataLines.length === 0) continue;
          const payload = dataLines.map((line) => line.slice(5).trimStart()).join("\n");
          try {
            onPositions(JSON.parse(payload) as TruckCurrentPosition[]);
          } catch {
            // ligne "data:" non-JSON (keepalive/commentaire) — ignorée.
          }
        }
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      onError?.(error);
    }
  })();

  return () => controller.abort();
}
