import { apiFetch } from "@/core/api/client";
import type { Organization } from "@/core/auth/types";

export function listMyOrganizations(): Promise<Organization[]> {
  return apiFetch<Organization[]>("/organizations");
}
