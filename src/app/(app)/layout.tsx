import { AppShell } from "@/core/layout/AppShell";
import { ProtectedRoute } from "@/core/auth/ProtectedRoute";

export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AppShell>{children}</AppShell>
    </ProtectedRoute>
  );
}
