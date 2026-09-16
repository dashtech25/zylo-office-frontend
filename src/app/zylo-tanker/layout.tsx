import { ProtectedRoute } from "@/core/auth/ProtectedRoute";
import { ZyloTankerShell } from "@/modules/zylo-tanker/components/ZyloTankerShell";

export default function ZyloTankerLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <ZyloTankerShell>{children}</ZyloTankerShell>
    </ProtectedRoute>
  );
}
