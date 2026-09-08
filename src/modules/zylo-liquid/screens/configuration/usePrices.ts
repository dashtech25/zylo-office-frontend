"use client";

import { useCallback, useEffect, useState } from "react";

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

/** Charge tout ce dont l'onglet Prix (et le bandeau de configuration
 * manquante, cf. page_configuration.md §22) a besoin en une seule fois :
 * stations, cuves (pour savoir quels couples station×produit sont
 * réellement en service), villes (pour résoudre la devise d'une station
 * et détecter une géo incomplète), devises, historique des prix. */
export function usePrices(organizationId: string | null) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prices, setPrices] = useState<PriceHistoryEntry[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [members, setMembers] = useState<OrganizationMember[]>([]);

  const load = useCallback(async () => {
    if (!organizationId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
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
      setPrices(pricesPage.data);
      setStations(stationsPage.data);
      setTanks(tanksPage.data);
      setCities(citiesPage.data);
      setCurrencies(currenciesList);
      setMembers(membersList);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    load();
  }, [load]);

  async function create(data: CreatePriceHistoryInput) {
    if (!organizationId) return;
    await createPriceHistory(organizationId, data);
    await load();
  }

  async function update(priceId: string, data: { priceAmount?: number; costAmount?: number; changeReason?: string }) {
    if (!organizationId) return;
    await updatePriceHistory(organizationId, priceId, data);
    await load();
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

  return { loading, error, prices, stations, tanks, cities, currencies, members, resolveStationCurrency, create, update, reload: load };
}
