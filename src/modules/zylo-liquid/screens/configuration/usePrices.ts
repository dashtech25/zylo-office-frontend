"use client";

import { useQuery } from "@tanstack/react-query";

import { listMembers, type OrganizationMember } from "@/core/api/rbac";
import {
  createPriceHistory,
  listCities,
  listCurrencies,
  listPrices,
  listStations,
  listTanks,
  updatePriceHistory,
  type City,
  type CreatePriceHistoryInput,
  type Currency,
  type PriceHistoryEntry,
  type Station,
  type Tank,
} from "@/modules/zylo-liquid/services/zyloLiquidApi";

/** Le référentiel `Currency` est global (~250 devises ISO préchargées,
 * Phase 1 §1.1 de refonte-configuration-zylo-liquid.md) et `GET /currencies`
 * n'expose aucun filtre par code ou par identifiant (confirmé : seule la
 * pagination existe) — se limiter à la première page (comportement observé
 * avant ce correctif, bug découvert par le test E2E réel de cette mission)
 * ferait silencieusement disparaître toute devise située après la fenêtre
 * chargée dans le tri alphabétique, y compris XAF/XOF (essentiels au cas
 * d'usage central de cette mission) dès qu'un réseau a plus de ~50 devises
 * antérieures dans l'ordre alphabétique. Parcourt donc toutes les pages —
 * borné à 10 (2 500 devises), largement au-dessus de tout référentiel ISO
 * réel, pour ne jamais boucler indéfiniment sur une réponse inattendue. */
async function loadAllCurrencies(organizationId: string): Promise<Currency[]> {
  const pageSize = 100;
  const all: Currency[] = [];
  for (let page = 0; page < 10; page += 1) {
    const result = await listCurrencies(organizationId, pageSize, page * pageSize);
    all.push(...result.data);
    if (all.length >= result.meta.total || result.data.length < pageSize) break;
  }
  return all;
}

interface PricesData {
  prices: PriceHistoryEntry[];
  stations: Station[];
  tanks: Tank[];
  cities: City[];
  currencies: Currency[];
  members: OrganizationMember[];
}

/** Charge tout ce dont l'onglet Prix (et le bandeau de configuration
 * manquante, cf. page_configuration.md §22) a besoin en une seule fois :
 * stations, cuves (pour savoir quels couples station×produit sont
 * réellement en service), villes (pour résoudre la devise d'une station
 * et détecter une géo incomplète), devises, historique des prix. Ces
 * données sont mutuellement nécessaires au calcul de `missingItems` et à
 * la grille de prix elle-même — gardées en une seule requête plutôt que
 * scindées (contrairement à `useNetworkDashboard`, ici rien n'est
 * indépendant : chaque calcul consomme plusieurs de ces listes à la fois). */
async function fetchPrices(organizationId: string): Promise<PricesData> {
  const [pricesPage, stationsPage, tanksPage, citiesPage, currenciesList, membersList] = await Promise.all([
    listPrices(organizationId, { limit: 100 }),
    listStations(organizationId),
    // Le backend plafonne `limit` à 100 (PaginationParams, `le=100`) —
    // une valeur supérieure renvoie systématiquement un 422, qui faisait
    // échouer tout le Promise.all et donc tout l'onglet Prix (bug
    // découvert par le test E2E réel de refonte-configuration-zylo-liquid.md,
    // jamais un problème introduit par cette mission mais bloquant pour
    // la vérifier).
    listTanks(organizationId, 100),
    listCities(organizationId, { limit: 100 }),
    loadAllCurrencies(organizationId),
    listMembers(organizationId).catch(() => [] as OrganizationMember[]),
  ]);
  return {
    prices: pricesPage.data,
    stations: stationsPage.data,
    tanks: tanksPage.data,
    cities: citiesPage.data,
    currencies: currenciesList,
    members: membersList,
  };
}

/** Migré vers React Query (audit performance/cache, cf. `QueryProvider`) —
 * requête indépendante des autres onglets de `ConfigurationScreen`
 * (catalogue carburants, associations produit×station) : son propre
 * chargement/skeleton n'attend jamais celui des autres sections. */
export function usePrices(organizationId: string | null) {
  const query = useQuery({
    queryKey: ["zylo-liquid", "configuration-prices", organizationId],
    queryFn: () => fetchPrices(organizationId as string),
    enabled: !!organizationId,
  });

  const prices = query.data?.prices ?? [];
  const stations = query.data?.stations ?? [];
  const tanks = query.data?.tanks ?? [];
  const cities = query.data?.cities ?? [];
  const currencies = query.data?.currencies ?? [];
  const members = query.data?.members ?? [];
  const loading = !!organizationId && query.isPending;
  const error = query.error ? (query.error instanceof Error ? query.error.message : String(query.error)) : null;

  async function create(data: CreatePriceHistoryInput) {
    if (!organizationId) return;
    await createPriceHistory(organizationId, data);
    await query.refetch();
  }

  async function update(priceId: string, data: { priceAmount?: number; costAmount?: number; changeReason?: string }) {
    if (!organizationId) return;
    await updatePriceHistory(organizationId, priceId, data);
    await query.refetch();
  }

  const cityById = new Map(cities.map((c) => [c.id, c]));
  const currencyByCode = new Map(currencies.map((c) => [c.code, c]));

  const currencyById = new Map(currencies.map((c) => [c.id, c]));

  /** Devise résolue pour une station : dérogation explicite
   * (`currencyOverrideId`, cf. audit Configuration carburant P1 §E.4)
   * prioritaire si fixée, sinon héritée via sa ville (page_configuration.md
   * §12) — retourne `null` si aucune des deux résolutions n'aboutit
   * (jamais une devise inventée par défaut). */
  function resolveStationCurrency(station: Station): Currency | null {
    if (station.currencyOverrideId) {
      const override = currencyById.get(station.currencyOverrideId);
      if (override) return override;
    }
    if (!station.cityId) return null;
    const city = cityById.get(station.cityId);
    if (!city) return null;
    // FK réelle en priorité (audit Configuration carburant P1 §E.5) —
    // repli sur le code texte uniquement si `currencyId` n'est pas encore
    // rattaché (référentiel géographique antérieur à ce rattachement).
    if (city.currencyId) {
      const byId = currencyById.get(city.currencyId);
      if (byId) return byId;
    }
    return currencyByCode.get(city.currencyCode) ?? null;
  }

  return {
    loading,
    error,
    prices,
    stations,
    tanks,
    cities,
    currencies,
    members,
    resolveStationCurrency,
    create,
    update,
    reload: async () => {
      await query.refetch();
    },
  };
}
