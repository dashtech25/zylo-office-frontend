import { KpiSkeleton, Skeleton } from "@/shared/ui/Skeleton";

/** Suspense boundary Next.js (App Router) affichée instantanément pendant la
 * transition de route, avant même que `StationsListScreen` (client
 * component) ne soit monté — cf. phase-1-audit.md §2.2. Reproduit
 * approximativement la mise en page réelle (en-tête, carte réseau, barre de
 * filtres, cartes de synthèse, liste des stations). */
export default function ZyloLiquidStationsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Skeleton className="mb-2 h-7 w-56" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>

      <div className="flex items-center gap-3 rounded-card border border-border-subtle p-5">
        <Skeleton variant="circular" className="size-11" />
        <div>
          <Skeleton className="mb-2 h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>

      <div className="rounded-card border border-border-subtle p-5">
        <div className="flex flex-wrap items-center gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-32" />
          ))}
        </div>
      </div>

      <section>
        <Skeleton className="mb-3 h-6 w-48" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <KpiSkeleton key={i} />
          ))}
        </div>
      </section>

      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-card" />
        ))}
      </div>
    </div>
  );
}
