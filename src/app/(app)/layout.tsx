import { AppShell } from "@/core/layout/AppShell";
import { ProtectedRoute } from "@/core/auth/ProtectedRoute";
import { OrganizationProvider } from "@/core/organization/OrganizationContext";

export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <OrganizationProvider>
        <AppShell>{children}</AppShell>
      </OrganizationProvider>
    </ProtectedRoute>
  );
}
