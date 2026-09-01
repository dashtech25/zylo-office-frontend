import { apiFetch } from "@/core/api/client";

export interface InstalledModule {
  moduleCode: string;
  name: string;
  description: string | null;
  version: string;
  status: "active" | "inactive" | "trial";
  activatedAt: string | null;
}

export function listOrganizationModules(organizationId: string): Promise<InstalledModule[]> {
  return apiFetch<InstalledModule[]>(`/modules/organizations/${organizationId}`, { organizationId });
}

export function activateModule(organizationId: string, moduleCode: string): Promise<unknown> {
  return apiFetch(`/modules/organizations/${organizationId}/activate`, {
    method: "POST",
    organizationId,
    body: JSON.stringify({ moduleCode }),
  });
}

export function deactivateModule(organizationId: string, moduleCode: string): Promise<unknown> {
  return apiFetch(`/modules/organizations/${organizationId}/deactivate`, {
    method: "POST",
    organizationId,
    body: JSON.stringify({ moduleCode }),
  });
}
