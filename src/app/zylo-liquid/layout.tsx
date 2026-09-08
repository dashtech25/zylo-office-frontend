import { ProtectedRoute } from "@/core/auth/ProtectedRoute";
import { OrganizationProvider } from "@/core/organization/OrganizationContext";
import { PermissionProvider } from "@/core/rbac/PermissionContext";
import { ZyloLiquidShell } from "@/modules/zylo-liquid/components/ZyloLiquidShell";

export default function ZyloLiquidLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <OrganizationProvider>
        <PermissionProvider>
          <ZyloLiquidShell>{children}</ZyloLiquidShell>
        </PermissionProvider>
      </OrganizationProvider>
    </ProtectedRoute>
  );
}
