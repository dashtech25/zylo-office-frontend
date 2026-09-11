import { KpiSkeleton, ListSkeleton, Skeleton, TableRowSkeleton } from "@/shared/ui/Skeleton";

/** Suspense boundary Next.js (App Router) affichée instantanément pendant la
 * transition de route, avant même que `DashboardScreen` (client component)
 * ne soit monté — cf. phase-1-audit.md §2.2 : aucun `loading.tsx` n'existait
 * sous `src/app/zylo-liquid/`. Reproduit approximativement la mise en page
 * réelle du tableau de bord (barre de statut, synthèse stock, graphique +
 * alertes, tableau des stations) pour éviter un flash de mise en page une
 * fois les données chargées. */
export default function ZyloLiquidDashboardLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-border-subtle bg-surface px-4 py-3">
        <Skeleton className="h-5 w-64" />
        <Skeleton className="h-8 w-72" />
      </div>

      <section>
        <Skeleton className="mb-3 h-6 w-48" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <KpiSkeleton key={i} />
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-card border border-border-subtle p-6 lg:col-span-2">
          <Skeleton className="mb-4 h-5 w-32" />
          <Skeleton className="h-48 w-full" />
        </div>
        <div className="rounded-card border border-border-subtle p-6">
          <Skeleton className="mb-3 h-5 w-24" />
          <ListSkeleton rows={4} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-card border border-border-subtle p-5 lg:col-span-2">
          <Skeleton className="mb-4 h-5 w-40" />
          <table className="w-full border-collapse text-body-sm">
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRowSkeleton key={i} columns={7} />
              ))}
            </tbody>
          </table>
        </div>
        <div className="rounded-card border border-border-subtle p-6">
          <Skeleton className="mb-3 h-5 w-32" />
          <ListSkeleton rows={5} />
        </div>
      </div>
    </div>
  );
}
