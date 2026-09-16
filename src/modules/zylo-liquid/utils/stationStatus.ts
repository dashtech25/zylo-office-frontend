import type { TankCurrentState } from "@/modules/zylo-liquid/services/zyloLiquidApi";

export interface StationOnlineStatus {
  online: boolean;
  onlineTankCount: number;
  configuredTankCount: number;
}

// Source unique pour le statut "en ligne" d'une station — remplace 5 copies
// indépendantes de la même règle ("au moins une cuve en ligne"), qui
// produisait un badge "En ligne" contredit, sur le même écran, par une
// colonne de disponibilité ou des cartes de cuve individuelles montrant
// "Capteur déconnecté" (P0-5, audit module Stations 2026-09-16 — ex.
// Garoua Centre, 1 cuve en ligne sur 3 mais badge station vert). Une
// station n'est "en ligne" que si TOUTES ses cuves configurées le sont.
export function computeStationOnlineStatus(tankStates: Pick<TankCurrentState, "sensorStatus">[]): StationOnlineStatus {
  const configured = tankStates.filter((t) => t.sensorStatus !== "not_configured");
  const onlineTankCount = configured.filter((t) => t.sensorStatus === "online").length;
  return {
    online: configured.length > 0 && onlineTankCount === configured.length,
    onlineTankCount,
    configuredTankCount: configured.length,
  };
}
