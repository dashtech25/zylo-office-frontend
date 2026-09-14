"use client";

import { useQuery } from "@tanstack/react-query";

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

interface MaintenanceData {
  stations: Station[];
  equipment: Equipment[];
  interventions: Intervention[];
  technicians: Technician[];
}

async function fetchMaintenance(organizationId: string): Promise<MaintenanceData> {
  const [stationsPage, equipmentPage, interventionsPage, techniciansPage] = await Promise.all([
    listStations(organizationId),
    listEquipment(organizationId, { limit: 100 }),
    listInterventions(organizationId, { limit: 100 }),
    listTechnicians(organizationId, { limit: 100 }),
  ]);
  return {
    stations: stationsPage.data,
    equipment: equipmentPage.data,
    interventions: interventionsPage.data,
    technicians: techniciansPage.data,
  };
}

/** Équipements et interventions d'une station (Bloc 6 de la mission
 * « vente-maintenant-reglementation ») — hiérarchie Station -> Equipment ->
 * Intervention, réutilise le système d'alertes existant via
 * `linkedAlertId` (jamais un second mécanisme).
 *
 * Migré vers React Query (audit performance/cache, cf. `QueryProvider`) —
 * revenir sur cet écran affiche instantanément la dernière donnée connue
 * au lieu de tout recharger. */
export function useMaintenance(organizationId: string | null) {
  const query = useQuery({
    queryKey: ["zylo-liquid", "maintenance", organizationId],
    queryFn: () => fetchMaintenance(organizationId as string),
    enabled: !!organizationId,
  });

  const stations = query.data?.stations ?? [];
  const equipment = query.data?.equipment ?? [];
  const interventions = query.data?.interventions ?? [];
  const technicians = query.data?.technicians ?? [];
  const loading = !!organizationId && query.isPending;
  const error = query.error ? (query.error instanceof Error ? query.error.message : String(query.error)) : null;

  async function addEquipment(data: CreateEquipmentInput) {
    if (!organizationId) return;
    await createEquipment(organizationId, data);
    await query.refetch();
  }

  async function reportIntervention(data: CreateInterventionInput) {
    if (!organizationId) return;
    await createIntervention(organizationId, data);
    await query.refetch();
  }

  async function assign(interventionId: string, technicianId: string) {
    if (!organizationId) return;
    await assignIntervention(organizationId, interventionId, technicianId);
    await query.refetch();
  }

  async function close(interventionId: string, data: { diagnosis?: string; actionTaken?: string; cost?: number }) {
    if (!organizationId) return;
    await closeIntervention(organizationId, interventionId, data);
    await query.refetch();
  }

  async function addTechnician(name: string) {
    if (!organizationId) return;
    await createTechnician(organizationId, { name });
    await query.refetch();
  }

  return {
    loading,
    error,
    stations,
    equipment,
    interventions,
    technicians,
    addEquipment,
    reportIntervention,
    assign,
    close,
    addTechnician,
    reload: async () => {
      await query.refetch();
    },
  };
}
