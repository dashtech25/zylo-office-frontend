import { apiFetch } from "@/core/api/client";
import type { Organization } from "@/core/auth/types";

export function listMyOrganizations(): Promise<Organization[]> {
  return apiFetch<Organization[]>("/organizations");
}

export function updateOrganization(organizationId: string, data: { name: string }): Promise<Organization> {
  return apiFetch<Organization>(`/organizations/${organizationId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}
