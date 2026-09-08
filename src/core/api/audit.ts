import { apiFetch } from "@/core/api/client";
import type { Page } from "@/core/api/types";

export interface AuditLogEntry {
  id: string;
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string | null;
  scopeResourceType: string | null;
  scopeResourceId: string | null;
  summary: string;
  changes: Record<string, unknown> | null;
  createdAt: string;
}

export function listAuditLogs(
  organizationId: string,
  params: { actionPrefix?: string; limit?: number; offset?: number } = {}
): Promise<Page<AuditLogEntry>> {
  const search = new URLSearchParams();
  if (params.actionPrefix) search.set("actionPrefix", params.actionPrefix);
  search.set("limit", String(params.limit ?? 20));
  search.set("offset", String(params.offset ?? 0));
  return apiFetch<Page<AuditLogEntry>>(`/audit/organizations/${organizationId}?${search.toString()}`, { organizationId });
}
