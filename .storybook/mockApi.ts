/**
 * Backend simulé pour Storybook — intercepte tout appel réseau passant par
 * `apiFetch` (le seul point d'appel HTTP de toute l'app, voir
 * `src/core/api/client.ts`) et répond avec des données JSON réalistes,
 * plutôt que de laisser échouer un vrai `fetch()` vers un backend absent de
 * cet environnement. Point d'entrée unique : `installMockApi()`, appelé une
 * fois dans `.storybook/preview.tsx`.
 *
 * Portée volontairement pragmatique : les endpoints de LISTE/LECTURE qui
 * pilotent l'affichage initial des pages sont couverts avec des données
 * plausibles ; les endpoints non couverts retombent sur une liste vide
 * (`{ data: [], meta: { total: 0, ... } }`) ou une erreur 404 — jamais un
 * plantage, toujours l'état "vide"/"erreur" déjà prévu par chaque écran.
 * Les mutations (POST/PUT/PATCH/DELETE) répondent 200 avec un objet
 * minimal : ce mock sert à *afficher* les pages avec des données réalistes,
 * pas à simuler un cycle d'écriture complet.
 */

export const ORG_ID = "org-1";

// ---------------------------------------------------------------------------
// Identité / organisation / permissions — toujours "connecté", toujours
// autorisé : les stories de page montrent le contenu, pas les écrans de
// garde (login, "aucune permission").
// ---------------------------------------------------------------------------

const MOCK_USER = {
  id: "user-1",
  email: "demo@zylo.example",
  fullName: "Amina Ndongo",
  status: "active",
  mustChangePassword: false,
};

const MOCK_ORGANIZATION = { id: ORG_ID, name: "Zylo Démo", slug: "zylo-demo", status: "active" };

const MOCK_MODULES = [
  { moduleCode: "zylo_liquid", name: "Zylo Liquid", description: "Gestion de réseau de distribution de carburant", status: "active" },
  { moduleCode: "zylo_tanker", name: "Zylo Tanker", description: "Supervision de navires-citernes", status: "active" },
];

// ---------------------------------------------------------------------------
// Zylo Liquid — référentiels
// ---------------------------------------------------------------------------

const CITIES = [
  { id: "city-douala", name: "Douala", regionId: "r1", regionName: "Littoral", countryId: "cm", countryName: "Cameroun", currencyId: "xaf", currencyCode: "XAF" },
  { id: "city-kribi", name: "Kribi", regionId: "r2", regionName: "Sud", countryId: "cm", countryName: "Cameroun", currencyId: "xaf", currencyCode: "XAF" },
  { id: "city-yaounde", name: "Yaoundé", regionId: "r3", regionName: "Centre", countryId: "cm", countryName: "Cameroun", currencyId: "xaf", currencyCode: "XAF" },
];
const COUNTRIES = [{ id: "cm", name: "Cameroun", isoCode2: "CM", currencyId: "xaf", currencyCode: "XAF", defaultTimezone: "Africa/Douala" }];
const CURRENCIES = [{ id: "xaf", code: "XAF", name: "Franc CFA (BEAC)", symbol: "FCFA", decimalPlaces: 0, active: true }];

const FUEL_PRODUCTS = [
  { id: "fp-gasoil", organizationId: ORG_ID, name: "Gasoil", code: "GO", densityGPerCm3: 0.84, thermalExpansionCoefficient: 0.00084, displayColor: "#2563EB", active: true },
  { id: "fp-essence", organizationId: ORG_ID, name: "Essence", code: "SP", densityGPerCm3: 0.75, thermalExpansionCoefficient: 0.00105, displayColor: "#F97316", active: true },
  { id: "fp-petrole", organizationId: ORG_ID, name: "Pétrole lampant", code: "PL", densityGPerCm3: 0.8, thermalExpansionCoefficient: 0.0009, displayColor: "#84CC16", active: true },
];

// ---------------------------------------------------------------------------
// Zylo Liquid — stations / cuves
// ---------------------------------------------------------------------------

function makeStation(id: string, name: string, code: string, cityId: string, overrides: Record<string, unknown> = {}) {
  return {
    id, organizationId: ORG_ID, name, code, cityId, address: `Route de ${name}`, latitude: 4.05 + Math.random() * 0.3,
    longitude: 9.5 + Math.random() * 0.5, timezone: "Africa/Douala", phone: "+237 6 99 00 00 00", email: null,
    openingTime: "06:00", closingTime: "22:00", is24h: false, closedWeekdays: null, weeklyHours: null, notes: null,
    status: "active", activeTankCount: 3, exploitationType: "own", currencyOverrideId: null, hasShop: true,
    shopName: "Boutique", shopSurfaceM2: 45, hasLavage: true, hasVidange: false, hasGazDomestique: true,
    nbPistes: 4, surfaceTotaleM2: 1200, ...overrides,
  };
}

export const STATIONS = [
  makeStation("s1", "Douala Akwa", "DLA-01", "city-douala"),
  makeStation("s2", "Douala Bonabéri", "DLA-02", "city-douala"),
  makeStation("s3", "Kribi Centre", "KBI-01", "city-kribi"),
  makeStation("s4", "Yaoundé Bastos", "YAO-01", "city-yaounde", { status: "maintenance" }),
];

function makeTank(id: string, stationId: string, tankNumber: number, fuelProductId: string, overrides: Record<string, unknown> = {}) {
  return {
    id, stationId, fuelProductId, tankNumber, displayName: `Cuve ${tankNumber}`, capacityLiters: 20000,
    calibratedCapacityLiters: 19800, tankHeightMm: 2500, heightAlarmMm: 2300, heightAlertMm: 2000,
    lowAlarmMm: 300, alertWaterMaxMm: 25, active: true, ...overrides,
  };
}

export const TANKS = [
  makeTank("t1", "s1", 1, "fp-gasoil"),
  makeTank("t2", "s1", 2, "fp-essence"),
  makeTank("t3", "s2", 1, "fp-gasoil"),
  makeTank("t4", "s2", 2, "fp-petrole"),
  makeTank("t5", "s3", 1, "fp-gasoil"),
  makeTank("t6", "s3", 2, "fp-essence"),
];

function makeTankState(tank: (typeof TANKS)[number], overrides: Record<string, unknown> = {}) {
  return {
    tankId: tank.id, tankNumber: tank.tankNumber, displayName: tank.displayName, sensorStatus: "online",
    heightMm: 1450, volumeLiters: 14320, volumeNotCalculableReason: null, volumeLiters15C: 14280,
    sellableVolumeLiters: 13950, waterHeightMm: 12, waterVolumeLiters: 118, temperatureC: 27.4,
    emptyVolumeLiters: 5480, lastMeasurementAt: new Date().toISOString(), monetaryValue: 9_875_000,
    currencyCode: "XAF", monetaryValueNotCalculableReason: null, unitPriceAmount: 689, ...overrides,
  };
}

export const TANK_STATES: Record<string, ReturnType<typeof makeTankState>> = Object.fromEntries(
  TANKS.map((tank, i) => [
    tank.id,
    makeTankState(tank, {
      heightMm: 1200 + i * 180,
      volumeLiters: 9000 + i * 1500,
      sellableVolumeLiters: 8800 + i * 1450,
      monetaryValue: (9000 + i * 1500) * 689,
    }),
  ])
);

function stationCurrentState(stationId: string) {
  return { stationId, tanks: TANKS.filter((t) => t.stationId === stationId).map((t) => TANK_STATES[t.id]) };
}

// ---------------------------------------------------------------------------
// Zylo Liquid — alertes / livraisons / fuites / ventes / shifts / équipement
// ---------------------------------------------------------------------------

function makeAlert(id: string, type: string, overrides: Record<string, unknown> = {}) {
  return {
    id, stationId: "s1", truckId: null, tankId: "t1", productId: null, type, severity: "high", status: "active",
    sourceType: null, sourceId: null, triggeredAt: new Date().toISOString(), triggeredValue: null,
    thresholdValue: null, acknowledgedAt: null, acknowledgedByUserId: null, resolvedAt: null,
    resolvedByUserId: null, resolutionMethod: null, resolutionNote: null, ...overrides,
  };
}

export const ALERTS = [
  makeAlert("al-1", "level_low", { tankId: "t3", stationId: "s2", severity: "medium" }),
  makeAlert("al-2", "water", { tankId: "t1", stationId: "s1", severity: "high" }),
  makeAlert("al-3", "sensor_offline", { tankId: "t5", stationId: "s3", severity: "critical" }),
  makeAlert("al-4", "delivery_discrepancy", { status: "resolved", tankId: "t2", stationId: "s1", resolvedAt: new Date().toISOString() }),
];

export const DELIVERIES = Array.from({ length: 6 }, (_, i) => ({
  id: `del-${i + 1}`, stationId: STATIONS[i % STATIONS.length].id, tankId: TANKS[i % TANKS.length].id,
  fuelProductId: "fp-gasoil", heightBeforeMm: 400 + i * 10, heightAfterMm: 2100 + i * 10,
  volumeReceivedLiters: 14500 + i * 250, deliveredAt: new Date(Date.now() - i * 86400000).toISOString(),
  supplierId: "sup-1", truckId: "trk-1", status: "confirmed",
}));

export const LEAK_EVENTS = Array.from({ length: 4 }, (_, i) => ({
  id: `leak-${i + 1}`, tankId: TANKS[i % TANKS.length].id, startTime: new Date(Date.now() - (i + 1) * 3600000).toISOString(),
  endTime: new Date(Date.now() - i * 3600000).toISOString(), leakRateLph: i === 0 ? 3.2 : null,
  result: i === 0 ? "anomaly" : "normal",
}));

export const SALES = Array.from({ length: 8 }, (_, i) => ({
  id: `sale-${i + 1}`, stationId: STATIONS[i % STATIONS.length].id, pumpId: `pump-${(i % 4) + 1}`,
  fuelProductId: i % 2 === 0 ? "fp-gasoil" : "fp-essence", volumeLiters: 40 + i * 5, unitPriceAmount: 689,
  totalAmount: (40 + i * 5) * 689, currencyCode: "XAF", soldAt: new Date(Date.now() - i * 3600000).toISOString(), shiftId: "shift-1",
}));

export const SHIFT_CASH_DECLARATIONS = Array.from({ length: 3 }, (_, i) => ({
  id: `shift-${i + 1}`, stationId: STATIONS[i % STATIONS.length].id, shiftDate: new Date(Date.now() - i * 86400000).toISOString(),
  declaredAmount: 850000 + i * 20000, expectedAmount: 845000 + i * 20000, currencyCode: "XAF", status: i === 0 ? "locked" : "open",
}));

export const COMMERCIAL_ACCOUNTS = [
  { id: "acc-1", organizationId: ORG_ID, name: "Société de Transport Littoral", creditLimitAmount: 5_000_000, currentBalanceAmount: 1_250_000, currencyCode: "XAF", active: true },
  { id: "acc-2", organizationId: ORG_ID, name: "Coopérative Agricole du Sud", creditLimitAmount: 2_000_000, currentBalanceAmount: 480_000, currencyCode: "XAF", active: true },
];

export const EQUIPMENT = [
  { id: "eq-1", stationId: "s1", name: "Pompe 1", type: "pump", status: "operational", lastMaintenanceAt: new Date(Date.now() - 30 * 86400000).toISOString() },
  { id: "eq-2", stationId: "s2", name: "Groupe électrogène", type: "generator", status: "maintenance_due", lastMaintenanceAt: new Date(Date.now() - 200 * 86400000).toISOString() },
];

export const REGULATORY_DOCUMENTS = [
  { id: "reg-1", stationId: "s1", type: "environmental_permit", label: "Autorisation d'exploitation", issuedAt: new Date(Date.now() - 400 * 86400000).toISOString(), expiresAt: new Date(Date.now() + 60 * 86400000).toISOString(), status: "valid" },
  { id: "reg-2", stationId: "s2", type: "fire_safety", label: "Certificat sécurité incendie", issuedAt: new Date(Date.now() - 600 * 86400000).toISOString(), expiresAt: new Date(Date.now() - 5 * 86400000).toISOString(), status: "expired" },
];

export const PUMPS = Array.from({ length: 4 }, (_, i) => ({
  id: `pump-${i + 1}`, stationId: STATIONS[i % STATIONS.length].id, tankId: TANKS[i % TANKS.length].id,
  pumpNumber: i + 1, label: `Pompe ${i + 1}`, active: true,
}));

export const SELLABLE_PRODUCTS = [
  { id: "sp-1", organizationId: ORG_ID, name: "Gasoil (pompe)", code: "GO-P", fuelProductId: "fp-gasoil", active: true },
  { id: "sp-2", organizationId: ORG_ID, name: "Essence (pompe)", code: "SP-P", fuelProductId: "fp-essence", active: true },
];

export const TRUCKS = Array.from({ length: 3 }, (_, i) => ({
  id: `trk-${i + 1}`, organizationId: ORG_ID, plateNumber: `CE-${1000 + i}-CM`, carrierId: "carrier-1", capacityLiters: 30000, active: true,
}));

export const TRUCK_CURRENT_POSITIONS = TRUCKS.map((t, i) => ({
  truckId: t.id, latitude: 4.0 + i * 0.05, longitude: 9.6 + i * 0.05, headingDeg: 90, speedKph: 40, recordedAt: new Date().toISOString(), status: i === 0 ? "moving" : "stopped",
}));

export const CARRIERS = [{ id: "carrier-1", organizationId: ORG_ID, name: "Transports Littoral SARL", active: true }];
export const SUPPLIERS = [{ id: "sup-1", organizationId: ORG_ID, name: "Société Nationale de Raffinage", active: true }];
export const PURCHASE_ORDERS = [
  { id: "po-1", organizationId: ORG_ID, supplierId: "sup-1", status: "in_transit", createdAt: new Date().toISOString(), totalVolumeLiters: 30000 },
];
export const DOCUMENTS = [
  { id: "doc-1", organizationId: ORG_ID, entityType: "delivery", entityId: "del-1", fileName: "bon-livraison-1.pdf", mimeType: "application/pdf", createdAt: new Date().toISOString() },
];
export const TRACKING_LOCATIONS = STATIONS.map((s) => ({ id: `loc-${s.id}`, organizationId: ORG_ID, label: s.name, latitude: s.latitude, longitude: s.longitude, radiusMeters: 150, deleted: false }));

export const NETWORK_SUMMARY = {
  totalVolumeLiters: 115400, totalCapacityLiters: 180000, totalStationCount: STATIONS.length,
  totalTankCount: TANKS.length, activeAlertsCount: ALERTS.filter((a) => a.status === "active").length,
};

// ---------------------------------------------------------------------------
// RBAC / audit / users (pages "système")
// ---------------------------------------------------------------------------

const ALL_PERMISSIONS = [
  "zyloLiquid.alert.read", "zyloLiquid.station.read", "zyloLiquid.station.manage", "zyloLiquid.tank.read",
  "zyloLiquid.delivery.read", "zyloLiquid.deliveryDeclaration.read", "zyloLiquid.truck.read",
  "zyloLiquid.reconciliation.read", "zyloLiquid.sale.read", "zyloLiquid.sellableProduct.read",
  "zyloLiquid.shiftCashDeclaration.read", "zyloLiquid.cash.read", "zyloLiquid.commercialAccount.read",
  "zyloLiquid.equipment.read", "zyloLiquid.regulatoryDocument.read", "rbac.role.manage", "audit.log.view",
];

const MEMBERS = [
  { userId: "user-1", email: "demo@zylo.example", fullName: "Amina Ndongo", roleNames: ["Administrateur"] },
  { userId: "user-2", email: "j.mbarga@zylo.example", fullName: "Jean Mbarga", roleNames: ["Opérateur station"] },
];
const ROLES = [
  { id: "role-1", organizationId: ORG_ID, name: "Administrateur", description: "Accès complet", isSystem: true },
  { id: "role-2", organizationId: ORG_ID, name: "Opérateur station", description: "Gestion d'une station", isSystem: false },
];
const AUDIT_LOGS = Array.from({ length: 10 }, (_, i) => ({
  id: `audit-${i + 1}`, actorUserId: "user-1", action: i % 2 === 0 ? "station.updated" : "sale.created",
  entityType: "station", entityId: "s1", scopeResourceType: null, scopeResourceId: null,
  summary: i % 2 === 0 ? "Mise à jour de la station Douala Akwa" : "Vente déclarée — Pompe 2",
  changes: null, createdAt: new Date(Date.now() - i * 3600000).toISOString(),
}));

// ---------------------------------------------------------------------------
// Moteur de résolution
// ---------------------------------------------------------------------------

function page<T>(data: T[]) {
  return { data, meta: { total: data.length, limit: data.length || 20, offset: 0 } };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function notFound(): Response {
  return json({ error: { code: "not_found", message: "Introuvable (donnée non simulée dans Storybook)" } }, 404);
}

/** path = la partie après `/api/v1` (ex. "/zylo-liquid/stations?limit=100").
 * Exportée pour être réutilisée telle quelle par les tests Playwright de
 * l'app réelle (`e2e/`) — même backend simulé que Storybook, jamais une
 * deuxième réimplémentation divergente des mêmes données. Ne dépend
 * d'aucune API navigateur au niveau module (seul `installMockApi` y touche,
 * protégé par `typeof window === "undefined"`), donc importable depuis un
 * test Playwright qui s'exécute côté Node. */
export function resolve(path: string, method: string): Response {
  const [rawPath] = path.split("?");
  const segments = rawPath.split("/").filter(Boolean);

  // --- Identité / organisation / permissions / modules ---
  if (rawPath === "/auth/me") return json(MOCK_USER);
  if (rawPath === "/organizations") return json([MOCK_ORGANIZATION]);
  if (segments[0] === "organizations" && segments[1]) return json(MOCK_ORGANIZATION);
  // rbac.ts appelle toujours `/rbac/organizations/{orgId}/<resource>[...]` —
  // segments = ["rbac", "organizations", "{orgId}", "<resource>", ...].
  if (rawPath.endsWith("/me/permissions")) return json(ALL_PERMISSIONS);
  if (segments[0] === "rbac" && segments[3] === "members") return json(MEMBERS);
  if (segments[0] === "rbac" && segments[3] === "permissions") {
    return json(ALL_PERMISSIONS.map((code) => ({ code, label: code, category: code.split(".")[0] })));
  }
  if (segments[0] === "rbac" && segments[3] === "roles" && segments[4] && segments[5] === "permissions") {
    return json({ roleId: segments[4], permissionCodes: ALL_PERMISSIONS.slice(0, 6) });
  }
  if (segments[0] === "rbac" && segments[3] === "roles" && segments[4]) {
    const role = ROLES.find((r) => r.id === segments[4]) ?? ROLES[0];
    return json({ ...role, permissionCodes: ALL_PERMISSIONS.slice(0, 6) });
  }
  if (segments[0] === "rbac" && segments[3] === "roles") return json(ROLES);
  if (segments[0] === "rbac" && segments[3] === "user-roles") return json([]);
  if (segments[0] === "rbac" && segments[3] === "grants") return json([]);
  if (segments[0] === "modules") return json(MOCK_MODULES);
  if (segments[0] === "audit") return json(page(AUDIT_LOGS));

  // --- Zylo Liquid — référentiels ---
  if (rawPath === "/zylo-liquid/cities") return json(page(CITIES));
  if (rawPath === "/zylo-liquid/countries") return json(page(COUNTRIES));
  if (rawPath === "/zylo-liquid/currencies") return json(page(CURRENCIES));
  if (rawPath === "/zylo-liquid/fuel-products") return json(page(FUEL_PRODUCTS));
  if (segments[1] === "fuel-products" && segments[2]) return FUEL_PRODUCTS.find((f) => f.id === segments[2]) ? json(FUEL_PRODUCTS.find((f) => f.id === segments[2])) : notFound();

  // --- Stations ---
  if (rawPath === "/zylo-liquid/stations") return json(page(STATIONS));
  if (segments[1] === "stations" && segments[2] && segments[3] === "current-state") {
    const station = STATIONS.find((s) => s.id === segments[2]);
    return station ? json(stationCurrentState(station.id)) : notFound();
  }
  if (segments[1] === "stations" && segments[2] && segments[3] === "financial") {
    return json({ stationId: segments[2], revenueAmount: 4_500_000, expenseAmount: 1_200_000, currencyCode: "XAF" });
  }
  if (segments[1] === "stations" && segments[2] && segments[3] === "fuel-products-overview") {
    const stationTanks = TANKS.filter((t) => t.stationId === segments[2]);
    return json(stationTanks.map((t) => ({ fuelProductId: t.fuelProductId, tankCount: 1 })));
  }
  if (segments[1] === "stations" && segments[2]) {
    const station = STATIONS.find((s) => s.id === segments[2]);
    return station ? json(station) : notFound();
  }

  // --- Cuves ---
  if (rawPath === "/zylo-liquid/tanks") return json(page(TANKS));
  if (segments[1] === "tanks" && segments[2] && segments[3] === "current-state") {
    return TANK_STATES[segments[2]] ? json(TANK_STATES[segments[2]]) : notFound();
  }
  if (segments[1] === "tanks" && segments[2] && segments[3] === "calibration-points") {
    return json(Array.from({ length: 8 }, (_, i) => ({ heightMm: i * 300, volumeLiters: i * 2400 })));
  }
  if (segments[1] === "tanks" && segments[2]) {
    const tank = TANKS.find((t) => t.id === segments[2]);
    return tank ? json(tank) : notFound();
  }
  if (rawPath === "/zylo-liquid/tank-sensor-mappings") return json(page([]));

  // --- Réseau ---
  if (rawPath === "/zylo-liquid/network/summary") return json(NETWORK_SUMMARY);
  if (segments[1] === "network" && segments[2] === "snapshot") return json({ at: new Date().toISOString(), stations: STATIONS.map((s) => stationCurrentState(s.id)) });

  // --- Alertes / livraisons / fuites ---
  if (rawPath === "/zylo-liquid/alerts") return json(page(ALERTS));
  if (segments[1] === "alerts" && segments[2]) {
    const alert = ALERTS.find((a) => a.id === segments[2]);
    return alert ? json(alert) : notFound();
  }
  if (rawPath === "/zylo-liquid/deliveries-in-progress") return json([]);
  if (rawPath === "/zylo-liquid/delivery-declarations") return json(page(DELIVERIES));
  if (rawPath === "/zylo-liquid/leaks" || rawPath === "/zylo-liquid/leak-events") return json(page(LEAK_EVENTS));

  // --- Ventes / shifts / caisse / crédit ---
  if (rawPath === "/zylo-liquid/sales" || rawPath === "/zylo-liquid/product-sales") return json(page(SALES));
  if (rawPath === "/zylo-liquid/pumps") return json(page(PUMPS));
  if (rawPath === "/zylo-liquid/sellable-products") return json(page(SELLABLE_PRODUCTS));
  if (rawPath === "/zylo-liquid/shift-cash-declarations") return json(page(SHIFT_CASH_DECLARATIONS));
  if (rawPath === "/zylo-liquid/commercial-accounts") return json(page(COMMERCIAL_ACCOUNTS));
  if (segments[1] === "cash" && segments[2] === "network-summary") return json({ expectedAmount: 2_450_000, declaredAmount: 2_398_000, currencyCode: "XAF", discrepancyAmount: -52_000 });
  if (rawPath === "/zylo-liquid/prices") return json(page([]));

  // --- Transport / camions / GPS ---
  if (rawPath === "/zylo-liquid/trucks") return json(page(TRUCKS));
  if (rawPath === "/zylo-liquid/trucks/current-positions") return json(TRUCK_CURRENT_POSITIONS);
  if (rawPath === "/zylo-liquid/carriers") return json(page(CARRIERS));
  if (rawPath === "/zylo-liquid/gps-devices") return json(page([]));
  if (rawPath === "/zylo-liquid/tracking-locations") return json(TRACKING_LOCATIONS);
  if (rawPath === "/zylo-liquid/truck-stop-reconciliations") return json([]);
  if (rawPath === "/zylo-liquid/purchase-orders") return json(page(PURCHASE_ORDERS));
  if (rawPath === "/zylo-liquid/suppliers") return json(page(SUPPLIERS));

  // --- Personnel / services / documents / équipement / réglementaire ---
  if (rawPath === "/zylo-liquid/station-staff") return json(page([]));
  if (rawPath === "/zylo-liquid/station-services") return json(page([]));
  if (rawPath === "/zylo-liquid/station-fuel-products") return json(page([]));
  if (rawPath === "/zylo-liquid/documents" || rawPath.startsWith("/zylo-liquid/documents/by-entity")) return json(page(DOCUMENTS));
  if (rawPath === "/zylo-liquid/equipment") return json(page(EQUIPMENT));
  if (rawPath === "/zylo-liquid/regulatory-documents") return json(page(REGULATORY_DOCUMENTS));
  if (rawPath === "/zylo-liquid/security-equipment") return json(page([]));
  if (rawPath === "/zylo-liquid/holykell-accounts") return json([]);
  if (rawPath === "/zylo-liquid/system-defaults") return json({});

  // --- Repli générique : mutation = ok minimal ; lecture = liste vide ---
  if (method !== "GET") return json({ id: "mock-id", ok: true });
  if (segments.length <= 2) return json(page([]));
  return notFound();
}

let installed = false;

export function installMockApi() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const marker = "/api/v1";
    const markerIndex = url.indexOf(marker);
    if (markerIndex === -1) return originalFetch(input, init);
    const path = url.slice(markerIndex + marker.length);
    const method = (init?.method ?? "GET").toUpperCase();
    // Simule une latence réseau minime pour que les états "chargement" des
    // écrans (Skeleton) restent visibles un court instant, comme en réel.
    await new Promise((resolve) => setTimeout(resolve, 120));
    return resolve(path, method);
  };
}
