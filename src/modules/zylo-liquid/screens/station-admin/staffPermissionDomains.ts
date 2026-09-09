/** Regroupement des codes de permission RBAC (`zyloLiquid.<ressource>.<action>`)
 * par domaine, pour la grille « Accès & permissions » de la fiche membre
 * (mockup emalioration/personnel/). Calculé côté frontend à partir de
 * `RoleDetail.permissionCodes` déjà retourné par l'API — jamais un second
 * endroit où stocker un doublon de la vérité RBAC. */
const DOMAIN_RESOURCES: Record<string, string[]> = {
  exploitation: [
    "fuelProduct", "stationFuelProduct", "priceHistory", "sale", "productSale", "sellableProduct",
    "commercialAccount", "receivable", "payment", "cash",
  ],
  stocks: ["tank", "tankSensorMapping", "tankCalibration", "delivery", "leakEvent", "holykellAccount"],
  maintenance: ["equipment", "intervention", "technician", "securityEquipment"],
  documents: ["document"],
  reglementation: [
    "regulatoryDocument", "regulatoryDeclaration", "incidentDeclaration", "leakTestDeclaration",
    "qualityCheckDeclaration", "manualGaugingDeclaration", "deliveryDeclaration", "shiftCashDeclaration",
    "declaration", "alert", "reconciliation", "reconciliationSettings",
  ],
  personnel: ["stationStaff", "stationSupplier", "stationFinancial", "station", "supplier", "carrier", "truck", "purchaseOrder"],
};

export const STAFF_PERMISSION_DOMAINS = Object.keys(DOMAIN_RESOURCES) as (keyof typeof DOMAIN_RESOURCES)[];

/** `permissionCode` = "zyloLiquid.equipment.manage" -> resource = "equipment". */
function resourceOf(permissionCode: string): string | null {
  const parts = permissionCode.split(".");
  return parts.length >= 2 ? parts[1] : null;
}

export function domainsGrantedByPermissions(permissionCodes: string[]): Set<string> {
  const resources = new Set(permissionCodes.map(resourceOf).filter((r): r is string => r !== null));
  const granted = new Set<string>();
  for (const [domain, domainResources] of Object.entries(DOMAIN_RESOURCES)) {
    if (domainResources.some((r) => resources.has(r))) granted.add(domain);
  }
  return granted;
}
