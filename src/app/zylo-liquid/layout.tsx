import { ProtectedRoute } from "@/core/auth/ProtectedRoute";
import { OrganizationProvider } from "@/core/organization/OrganizationContext";
import { ZyloLiquidShell } from "./_components/ZyloLiquidShell";

export default function ZyloLiquidLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <OrganizationProvider>
        <ZyloLiquidShell>{children}</ZyloLiquidShell>
      </OrganizationProvider>
    </ProtectedRoute>
  );
}
