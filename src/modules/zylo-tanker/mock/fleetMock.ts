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
  destinationLatitude: number | null;
  destinationLongitude: number | null;
  destinationLabel: string | null;
  etaMinutes: number | null;
}

/** Distance orthodromique (grand cercle) entre deux points, en kilomètres.
 * Utilisée pour calculer un ETA plausible à partir de la vitesse — jamais
 * d'ETA inventé indépendamment de position/destination/vitesse. */
export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const earthRadiusKm = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

const KNOTS_TO_KMH = 1.852;

/** ETA en minutes à partir d'une position, d'une destination et d'une
 * vitesse en nœuds. Retourne `null` si pas de destination ou vitesse nulle
 * (jamais de valeur inventée quand le calcul n'est pas possible). */
export function computeEtaMinutes(
  latitude: number,
  longitude: number,
  destinationLatitude: number | null,
  destinationLongitude: number | null,
  speedKnots: number,
): number | null {
  if (destinationLatitude === null || destinationLongitude === null) return null;
  if (speedKnots <= 0) return null;
  const distanceKm = haversineDistanceKm(latitude, longitude, destinationLatitude, destinationLongitude);
  const speedKmh = speedKnots * KNOTS_TO_KMH;
  return Math.round((distanceKm / speedKmh) * 60);
}

// Port de Douala — destination du MT Atlantique (v1), actuellement en route.
// NB : la position courante de v1 (4.0483, 9.6971) est déjà très proche des
// coordonnées du port lui-même (l'estuaire du Wouri) ; on cible ici un point
// un peu plus au large, dans le prolongement du cap 218° du navire, pour
// obtenir un ETA réaliste plutôt qu'un ETA quasi nul.
const DOUALA_PORT_LAT = 3.95;
const DOUALA_PORT_LON = 9.5;

export const MOCK_VESSELS: MockVessel[] = [
  {
    id: "v1",
    code: "DEMO-MV1",
    name: "MT Atlantique",
    latitude: 4.0483,
    longitude: 9.6971,
    headingDeg: 218,
    speedKnots: 11.4,
    status: "underway",
    destinationLatitude: DOUALA_PORT_LAT,
    destinationLongitude: DOUALA_PORT_LON,
    destinationLabel: "Port de Douala",
    etaMinutes: computeEtaMinutes(4.0483, 9.6971, DOUALA_PORT_LAT, DOUALA_PORT_LON, 11.4),
  },
  {
    id: "v2",
    code: "DEMO-MV2",
    name: "MT Littoral",
    latitude: 2.9401,
    longitude: 9.905,
    headingDeg: 0,
    speedKnots: 0,
    status: "moored",
    destinationLatitude: null,
    destinationLongitude: null,
    destinationLabel: null,
    etaMinutes: null,
  },
  // v3-v10 : flotte étendue à 10 navires, positions plausibles le long du
  // golfe de Guinée — soit à quai dans un vrai port, soit au large sur une
  // route commerciale entre deux ports réels (jamais en plein océan ni sur
  // la terre ferme). Ports (coordonnées approximatives, domaine public) :
  // Limbe (4.02, 9.21), Douala (4.05, 9.70), Libreville (0.39, 9.45),
  // Pointe-Noire (-4.77, 11.85), Luanda (-8.81, 13.23), Abidjan
  // (5.25, -4.02), Lagos/Apapa (6.45, 3.38), Cotonou (6.35, 2.43),
  // Lomé (6.13, 1.27).
  {
    id: "v3",
    code: "DEMO-MV3",
    name: "MT Estuaire",
    latitude: 4.02,
    longitude: 9.21,
    headingDeg: 0,
    speedKnots: 0,
    status: "moored",
    destinationLatitude: null,
    destinationLongitude: null,
    destinationLabel: null,
    etaMinutes: null,
  },
  {
    id: "v4",
    code: "DEMO-MV4",
    name: "MT Bonny",
    latitude: 6.25,
    longitude: 2.95,
    headingDeg: 250,
    speedKnots: 10.5,
    status: "underway",
    destinationLatitude: 6.35,
    destinationLongitude: 2.43,
    destinationLabel: "Port de Cotonou",
    etaMinutes: computeEtaMinutes(6.25, 2.95, 6.35, 2.43, 10.5),
  },
  {
    id: "v5",
    code: "DEMO-MV5",
    name: "MT Sanaga",
    latitude: 4.05,
    longitude: 9.7,
    headingDeg: 0,
    speedKnots: 0,
    status: "moored",
    destinationLatitude: null,
    destinationLongitude: null,
    destinationLabel: null,
    etaMinutes: null,
  },
  {
    id: "v6",
    code: "DEMO-MV6",
    name: "MT Ogooué",
    latitude: -2.3,
    longitude: 10.4,
    headingDeg: 160,
    speedKnots: 9.8,
    status: "underway",
    destinationLatitude: -4.77,
    destinationLongitude: 11.85,
    destinationLabel: "Port de Pointe-Noire",
    etaMinutes: computeEtaMinutes(-2.3, 10.4, -4.77, 11.85, 9.8),
  },
  {
    id: "v7",
    code: "DEMO-MV7",
    name: "MT Kwanza",
    latitude: -8.81,
    longitude: 13.23,
    headingDeg: 0,
    speedKnots: 0,
    status: "moored",
    destinationLatitude: null,
    destinationLongitude: null,
    destinationLabel: null,
    etaMinutes: null,
  },
  {
    id: "v8",
    code: "DEMO-MV8",
    name: "MT Congo",
    latitude: -6.9,
    longitude: 12.3,
    headingDeg: 150,
    speedKnots: 12.1,
    status: "underway",
    destinationLatitude: -8.81,
    destinationLongitude: 13.23,
    destinationLabel: "Port de Luanda",
    etaMinutes: computeEtaMinutes(-6.9, 12.3, -8.81, 13.23, 12.1),
  },
  {
    id: "v9",
    code: "DEMO-MV9",
    name: "MT Volta",
    latitude: 5.25,
    longitude: -4.02,
    headingDeg: 0,
    speedKnots: 0,
    status: "moored",
    destinationLatitude: null,
    destinationLongitude: null,
    destinationLabel: null,
    etaMinutes: null,
  },
  {
    id: "v10",
    code: "DEMO-MV10",
    name: "MT Niger",
    latitude: 6.05,
    longitude: 2.3,
    headingDeg: 260,
    speedKnots: 10.9,
    status: "underway",
    destinationLatitude: 6.13,
    destinationLongitude: 1.27,
    destinationLabel: "Port de Lomé",
    etaMinutes: computeEtaMinutes(6.05, 2.3, 6.13, 1.27, 10.9),
  },
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

export interface MockVesselRoutePoint {
  at: string;
  latitude: number;
  longitude: number;
}

/** Historique de trajet (~6h, points espacés de 25min) pour les navires
 * "underway". Trajectoire non rectiligne (légères variations lat/lon) pour
 * rester plausible — le dernier point correspond à la position courante du
 * navire dans MOCK_VESSELS. Navires à quai/au mouillage : pas d'historique
 * (tableau vide), leur position ne bouge pas. */
export const MOCK_VESSEL_ROUTES: Record<string, MockVesselRoutePoint[]> = {
  v1: [
    { at: "2026-09-17T03:50:00Z", latitude: 4.35, longitude: 10.05 },
    { at: "2026-09-17T04:15:00Z", latitude: 4.3305, longitude: 10.0233 },
    { at: "2026-09-17T04:40:00Z", latitude: 4.3051, longitude: 10.0018 },
    { at: "2026-09-17T05:05:00Z", latitude: 4.2879, longitude: 9.9733 },
    { at: "2026-09-17T05:30:00Z", latitude: 4.2624, longitude: 9.9511 },
    { at: "2026-09-17T05:55:00Z", latitude: 4.2444, longitude: 9.9216 },
    { at: "2026-09-17T06:20:00Z", latitude: 4.2187, longitude: 9.9003 },
    { at: "2026-09-17T06:45:00Z", latitude: 4.2008, longitude: 9.8716 },
    { at: "2026-09-17T07:10:00Z", latitude: 4.1753, longitude: 9.8497 },
    { at: "2026-09-17T07:35:00Z", latitude: 4.1579, longitude: 9.8215 },
    { at: "2026-09-17T08:00:00Z", latitude: 4.1329, longitude: 9.8004 },
    { at: "2026-09-17T08:25:00Z", latitude: 4.1153, longitude: 9.7716 },
    { at: "2026-09-17T08:50:00Z", latitude: 4.0895, longitude: 9.7497 },
    { at: "2026-09-17T09:15:00Z", latitude: 4.0713, longitude: 9.7206 },
    { at: "2026-09-17T09:40:00Z", latitude: 4.0483, longitude: 9.6971 },
  ],
  v2: [],
};

/** Retourne le trajet d'un navire au format [longitude, latitude][] trié
 * chronologiquement — le format attendu par la prop `route` de TrucksMap
 * (src/modules/zylo-liquid/components/TrucksMap.tsx). */
export function mockVesselRoute(vesselId: string): [number, number][] {
  const points = MOCK_VESSEL_ROUTES[vesselId] ?? [];
  return [...points]
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
    .map((point) => [point.longitude, point.latitude]);
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
