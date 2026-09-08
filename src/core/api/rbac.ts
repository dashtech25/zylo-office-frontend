import { apiFetch } from "@/core/api/client";

export interface Permission {
  id: string;
  code: string;
  moduleCode: string;
  description: string | null;
}

export interface Role {
  id: string;
  organizationId: string;
  code: string;
  name: string;
}

export interface RoleDetail extends Role {
  permissionCodes: string[];
}

export interface UserRole {
  id: string;
  userId: string;
  organizationId: string;
  roleId: string;
  resourceType: string | null;
  resourceId: string | null;
}

/** Un rôle tel qu'attribué à UN utilisateur précis — porte l'id de CETTE
 * attribution (`assignmentId`, pour la retirer sans ambiguïté si le même
 * rôle est attribué deux fois à des stations différentes) et sa portée.
 * `resourceType`/`resourceId` null = organisation entière ; sinon la
 * ressource à laquelle ce rôle est restreint pour cet utilisateur (ex.
 * "station" + son id — un gérant qui ne doit voir que SA station). */
export interface UserRoleAssignment extends Role {
  assignmentId: string;
  resourceType: string | null;
  resourceId: string | null;
}

export interface OrganizationMember {
  userId: string;
  email: string;
  fullName: string;
  status: string;
  roles: UserRoleAssignment[];
}

export interface PermissionGrant {
  id: string;
  organizationId: string;
  userId: string;
  permissionId: string;
  effect: "allow" | "deny";
  resourceType: string | null;
  resourceId: string | null;
  origin: "direct" | "delegation";
  delegatedFromGrantId: string | null;
  grantedByUserId: string;
  validFrom: string;
  validUntil: string | null;
  revokedAt: string | null;
  auditNote: string | null;
}

/** Point d'entrée unique du module rbac — chaque appel passe l'organisation
 * courante via le header X-Organization-Id (apiFetch), jamais dans le corps
 * de la requête (convention déjà en place pour zylo-liquid). */

export function listPermissionsCatalog(organizationId: string): Promise<Permission[]> {
  return apiFetch<Permission[]>(`/rbac/organizations/${organizationId}/permissions`, { organizationId });
}

export function listRoles(organizationId: string): Promise<Role[]> {
  return apiFetch<Role[]>(`/rbac/organizations/${organizationId}/roles`, { organizationId });
}

export function getRole(organizationId: string, roleId: string): Promise<RoleDetail> {
  return apiFetch<RoleDetail>(`/rbac/organizations/${organizationId}/roles/${roleId}`, { organizationId });
}

export function createRole(
  organizationId: string,
  data: { code: string; name: string; permissionCodes: string[] }
): Promise<Role> {
  return apiFetch<Role>(`/rbac/organizations/${organizationId}/roles`, {
    method: "POST",
    organizationId,
    body: JSON.stringify(data),
  });
}

export function updateRolePermissions(organizationId: string, roleId: string, permissionCodes: string[]): Promise<RoleDetail> {
  return apiFetch<RoleDetail>(`/rbac/organizations/${organizationId}/roles/${roleId}/permissions`, {
    method: "PUT",
    organizationId,
    body: JSON.stringify({ permissionCodes }),
  });
}

export function assignRole(
  organizationId: string,
  userId: string,
  roleId: string,
  scope?: { resourceType: string; resourceId: string } | null
): Promise<UserRole> {
  return apiFetch<UserRole>(`/rbac/organizations/${organizationId}/user-roles`, {
    method: "POST",
    organizationId,
    body: JSON.stringify({ userId, roleId, resourceType: scope?.resourceType ?? null, resourceId: scope?.resourceId ?? null }),
  });
}

export function unassignRole(organizationId: string, assignmentId: string): Promise<void> {
  return apiFetch<void>(`/rbac/organizations/${organizationId}/user-roles/${assignmentId}`, {
    method: "DELETE",
    organizationId,
  });
}

export function listMembers(organizationId: string): Promise<OrganizationMember[]> {
  return apiFetch<OrganizationMember[]>(`/rbac/organizations/${organizationId}/members`, { organizationId });
}

export function listUserGrants(organizationId: string, userId: string): Promise<PermissionGrant[]> {
  return apiFetch<PermissionGrant[]>(`/rbac/organizations/${organizationId}/users/${userId}/grants`, { organizationId });
}

export function createGrant(
  organizationId: string,
  data: {
    userId: string;
    permissionCode: string;
    effect: "allow" | "deny";
    resourceType?: string | null;
    resourceId?: string | null;
    validUntil?: string | null;
    auditNote?: string | null;
    delegatedFromGrantId?: string | null;
  }
): Promise<PermissionGrant> {
  return apiFetch<PermissionGrant>(`/rbac/organizations/${organizationId}/grants`, {
    method: "POST",
    organizationId,
    body: JSON.stringify(data),
  });
}

export function revokeGrant(organizationId: string, grantId: string): Promise<void> {
  return apiFetch<void>(`/rbac/organizations/${organizationId}/grants/${grantId}`, {
    method: "DELETE",
    organizationId,
  });
}

export function myEffectivePermissions(organizationId: string): Promise<string[]> {
  return apiFetch<string[]>(`/rbac/organizations/${organizationId}/me/permissions`, { organizationId });
}
