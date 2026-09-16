/** Données mockées Zylo Tanker (SMART TANKER) — aucun backend branché pour
 * ce chantier frontend-only. Deux navires de démo, cohérents avec les
 * navires DEMO-MV1/DEMO-MV2 seedés côté backend (app/modules/zylo_tanker),
 * pour que le vocabulaire reste identique le jour où l'API réelle
 * remplacera ce mock. Ne jamais appeler d'API ici — chaque écran importe
 * ces fonctions directement. */

export interface MockVessel {
  id: string;
  code: string;
  name: string;
  latitude: number;
  longitude: number;
  headingDeg: number;
  speedKnots: number;
  status: "underway" | "moored" | "anchored";
}

export const MOCK_VESSELS: MockVessel[] = [
  { id: "v1", code: "DEMO-MV1", name: "MT Atlantique", latitude: 4.0483, longitude: 9.6971, headingDeg: 218, speedKnots: 11.4, status: "underway" },
  { id: "v2", code: "DEMO-MV2", name: "MT Littoral", latitude: 2.9401, longitude: 9.905, headingDeg: 0, speedKnots: 0, status: "moored" },
];

export interface MockAlarm {
  id: string;
  vesselId: string;
  severity: "critical" | "warning" | "info";
  label: string;
  system: string;
  triggeredAt: string;
}

export const MOCK_ALARMS: MockAlarm[] = [
  { id: "a1", vesselId: "v1", severity: "warning", label: "Pression huile moteur basse", system: "Moteur principal", triggeredAt: "2026-09-16T08:12:00Z" },
  { id: "a2", vesselId: "v1", severity: "info", label: "Fenêtre de maintenance dans 48h", system: "Maintenance", triggeredAt: "2026-09-16T06:00:00Z" },
  { id: "a3", vesselId: "v2", severity: "critical", label: "Niveau cuve 2 sous le seuil bas", system: "Cuves", triggeredAt: "2026-09-16T09:40:00Z" },
];

export interface MockKpi {
  label: string;
  value: string;
  trend?: "up" | "down" | "flat";
}

export const MOCK_FLEET_KPIS: MockKpi[] = [
  { label: "Navires actifs", value: "2 / 2" },
  { label: "Consommation flotte (24h)", value: "18.4 t", trend: "down" },
  { label: "Alarmes actives", value: "3", trend: "up" },
  { label: "Disponibilité moyenne", value: "96.2 %", trend: "flat" },
];

export interface MockTank {
  id: string;
  vesselId: string;
  tankNumber: number;
  displayName: string;
  product: "Super" | "Gasoil" | "Pétrole" | "Eau de ballast";
  capacityLiters: number;
  currentLevelLiters: number;
  temperatureC: number;
  pressureBar: number;
  leakSuspected: boolean;
}

export const MOCK_TANKS: MockTank[] = [
  { id: "t1", vesselId: "v1", tankNumber: 1, displayName: "Citerne 1", product: "Super", capacityLiters: 20000, currentLevelLiters: 14200, temperatureC: 28.4, pressureBar: 1.02, leakSuspected: false },
  { id: "t2", vesselId: "v1", tankNumber: 2, displayName: "Citerne 2", product: "Gasoil", capacityLiters: 20000, currentLevelLiters: 9800, temperatureC: 27.9, pressureBar: 1.01, leakSuspected: false },
  { id: "t3", vesselId: "v1", tankNumber: 3, displayName: "Citerne 3", product: "Pétrole", capacityLiters: 15000, currentLevelLiters: 15000, temperatureC: 29.1, pressureBar: 1.03, leakSuspected: false },
  { id: "t4", vesselId: "v2", tankNumber: 1, displayName: "Citerne 1", product: "Super", capacityLiters: 15000, currentLevelLiters: 3100, temperatureC: 26.5, pressureBar: 0.98, leakSuspected: true },
  { id: "t5", vesselId: "v2", tankNumber: 2, displayName: "Citerne 2", product: "Gasoil", capacityLiters: 15000, currentLevelLiters: 11200, temperatureC: 26.8, pressureBar: 1.0, leakSuspected: false },
];

export interface MockPump {
  id: string;
  vesselId: string;
  label: string;
  flowRateM3h: number;
  pressureBar: number;
  temperatureC: number;
  status: "running" | "idle" | "fault";
}

export const MOCK_PUMPS: MockPump[] = [
  { id: "p1", vesselId: "v1", label: "Pompe cargo 1", flowRateM3h: 320, pressureBar: 4.2, temperatureC: 42, status: "running" },
  { id: "p2", vesselId: "v1", label: "Pompe cargo 2", flowRateM3h: 0, pressureBar: 0, temperatureC: 24, status: "idle" },
  { id: "p3", vesselId: "v2", label: "Pompe cargo 1", flowRateM3h: 0, pressureBar: 0.2, temperatureC: 25, status: "fault" },
];

export interface MockConsumptionPoint {
  timestamp: string;
  liters: number;
}

export function mockConsumptionSeries(vesselId: string): MockConsumptionPoint[] {
  const base = vesselId === "v1" ? 620 : 180;
  return Array.from({ length: 24 }, (_, hour) => ({
    timestamp: `${String(hour).padStart(2, "0")}:00`,
    liters: Math.round(base + Math.sin(hour / 3) * base * 0.25),
  }));
}

export interface MockDocument {
  id: string;
  vesselId: string;
  category: "plan" | "manuel" | "certificat";
  title: string;
  updatedAt: string;
  expiresAt: string | null;
}

export const MOCK_DOCUMENTS: MockDocument[] = [
  { id: "d1", vesselId: "v1", category: "certificat", title: "Certificat de navigabilité", updatedAt: "2026-01-10", expiresAt: "2027-01-10" },
  { id: "d2", vesselId: "v1", category: "plan", title: "Plan de disposition générale", updatedAt: "2025-06-02", expiresAt: null },
  { id: "d3", vesselId: "v1", category: "manuel", title: "Manuel moteur principal", updatedAt: "2024-11-20", expiresAt: null },
  { id: "d4", vesselId: "v2", category: "certificat", title: "Certificat de prévention de la pollution", updatedAt: "2025-03-15", expiresAt: "2026-10-01" },
];
