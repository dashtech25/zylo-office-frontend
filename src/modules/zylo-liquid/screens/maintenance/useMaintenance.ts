"use client";

import { useCallback, useEffect, useState } from "react";

import {
  assignIntervention,
  closeIntervention,
  createEquipment,
  createIntervention,
  createTechnician,
  listEquipment,
  listInterventions,
  listStations,
  listTechnicians,
  type CreateEquipmentInput,
  type CreateInterventionInput,
  type Equipment,
  type Intervention,
  type Station,
  type Technician,
} from "@/modules/zylo-liquid/services/zyloLiquidApi";

/** Équipements et interventions d'une station (Bloc 6 de la mission
 * « vente-maintenant-reglementation ») — hiérarchie Station -> Equipment ->
 * Intervention, réutilise le système d'alertes existant via
 * `linkedAlertId` (jamais un second mécanisme). */
export function useMaintenance(organizationId: string | null) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);

  const load = useCallback(async () => {
    if (!organizationId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [stationsPage, equipmentPage, interventionsPage, techniciansPage] = await Promise.all([
        listStations(organizationId),
        listEquipment(organizationId, { limit: 100 }),
        listInterventions(organizationId, { limit: 100 }),
        listTechnicians(organizationId, { limit: 100 }),
      ]);
      setStations(stationsPage.data);
      setEquipment(equipmentPage.data);
      setInterventions(interventionsPage.data);
      setTechnicians(techniciansPage.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    load();
  }, [load]);

  async function addEquipment(data: CreateEquipmentInput) {
    if (!organizationId) return;
    await createEquipment(organizationId, data);
    await load();
  }

  async function reportIntervention(data: CreateInterventionInput) {
    if (!organizationId) return;
    await createIntervention(organizationId, data);
    await load();
  }

  async function assign(interventionId: string, technicianId: string) {
    if (!organizationId) return;
    await assignIntervention(organizationId, interventionId, technicianId);
    await load();
  }

  async function close(interventionId: string, data: { diagnosis?: string; actionTaken?: string; cost?: number }) {
    if (!organizationId) return;
    await closeIntervention(organizationId, interventionId, data);
    await load();
  }

  async function addTechnician(name: string) {
    if (!organizationId) return;
    await createTechnician(organizationId, { name });
    await load();
  }

  return { loading, error, stations, equipment, interventions, technicians, addEquipment, reportIntervention, assign, close, addTechnician, reload: load };
}
