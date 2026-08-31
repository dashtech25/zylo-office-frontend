"use client";

import { useAuth } from "@/core/auth/AuthContext";

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div>
      <h1 className="mb-2 text-xl font-semibold">Tableau de bord</h1>
      <p className="text-sm text-neutral-600">
        Connecté en tant que <strong>{user?.fullName}</strong> ({user?.email}).
      </p>
      <p className="mt-4 text-sm text-neutral-500">
        Aucun module métier n&apos;est encore installé — le socle (auth, organisations, rôles,
        permissions, modules) est fonctionnel. Les modules apparaîtront ici une fois développés.
      </p>
    </div>
  );
}
