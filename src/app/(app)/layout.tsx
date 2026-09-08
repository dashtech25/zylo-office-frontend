import { AppShell } from "@/core/layout/AppShell";
import { ProtectedRoute } from "@/core/auth/ProtectedRoute";
import { OrganizationProvider } from "@/core/organization/OrganizationContext";
import { PermissionProvider } from "@/core/rbac/PermissionContext";

export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <OrganizationProvider>
        <PermissionProvider>
          <AppShell>{children}</AppShell>
        </PermissionProvider>
      </OrganizationProvider>
    </ProtectedRoute>
  );
}
