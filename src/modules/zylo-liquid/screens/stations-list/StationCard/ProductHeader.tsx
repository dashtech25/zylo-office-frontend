/** Le nom du produit porte lui-même la couleur (pas un carré à côté) —
 * jamais rouge, cette couleur est réservée à l'indicateur de stock bas
 * (voir la validation backend sur FuelProduct.displayColor). */
export function ProductHeader({ color, name, tankLabel }: { color: string | null; name: string; tankLabel: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-body-sm font-semibold" style={{ color: color ?? "var(--color-text)" }}>
        {name.toUpperCase()}
      </span>
      <span className="text-caption text-text-muted">{tankLabel}</span>
    </div>
  );
}
