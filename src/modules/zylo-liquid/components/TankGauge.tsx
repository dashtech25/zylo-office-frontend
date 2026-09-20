"use client";

import type { Tank, TankCurrentState } from "@/modules/zylo-liquid/services/zyloLiquidApi";

import { formatLiters } from "@/modules/zylo-liquid/utils/formatLiters";
import { formatPercent } from "@/modules/zylo-liquid/utils/formatPercent";

/** Cylindre horizontal — SOURCE UNIQUE pour toute l'app (remplace l'ancien
 * `TankCylinder.tsx` et la fonction `GaugeHorizontal` dupliquée dans
 * `TankVisual.tsx`). Composition physique, jamais inventée :
 *
 * - `state.heightMm` (capteur product_level) est la hauteur TOTALE du
 *   liquide depuis le fond de la cuve — elle inclut donc la couche d'eau.
 * - `state.waterHeightMm` (capteur water_level) est la hauteur de la seule
 *   couche d'eau au fond.
 * - Le carburant occupe donc la tranche entre waterHeightMm et heightMm
 *   (l'eau est toujours SOUS le carburant) — jamais deux valeurs
 *   indépendantes. C'est exactement ce que fait déjà le backend en volume
 *   (`volume_net = volume_brut(heightMm) - volume_brut(waterHeightMm)`,
 *   voir app/modules/zylo_liquid/service.py).
 * - Chaque zone est dessinée strictement proportionnelle à la hauteur
 *   réelle : une hauteur d'eau de 0mm ne montre aucune eau, une hauteur de
 *   4mm montre une fine tranche réelle — jamais de hauteur minimale forcée
 *   pour "faire joli" (bug corrigé : l'ancien GaugeHorizontal imposait
 *   `Math.max(3, ...)`). */
export interface TankGaugeProps {
  tank: Tank;
  state: TankCurrentState;
  fuelColor: string;
  size: "detailed" | "compact";
}

// Alignées sur les tokens sémantiques globaux (2026-09-20, refonte Centre
// d'alertes — même palette vive partout, jamais un hex local divergent) :
// water reprend WATER_COLOR de TankVisual.tsx (var(--color-info)), même
// bleu, pour ne pas afficher deux bleus différents pour l'eau selon la vue.
const COLORS = {
  high: "var(--color-error)",
  preAlarm: "var(--color-warning)",
  low: "var(--color-info)",
  water: "var(--color-info)",
} as const;

export function TankGauge({ tank, state, fuelColor, size }: TankGaugeProps) {
  const detailed = size === "detailed";
  // Hauteur FIXE en pixels réels (pas 100%/none) : un vrai cylindre
  // horizontal a des bouts semi-circulaires nettement visibles, ce qui
  // n'existe que si le viewBox garde son ratio d'origine
  // (preserveAspectRatio="xMidYMid meet"). "none" étirait la forme de façon
  // non uniforme et transformait les bouts arrondis en une simple bordure
  // — plus aucune lecture "cylindre". Accepter un peu d'espace résiduel
  // au-dessus/en-dessous dans une colonne plus haute est un meilleur
  // compromis qu'une forme déformée.
  const W = 580;
  const H = detailed ? 170 : 60;
  const bx = 8;
  const by = 10;
  const bw = W - 16;
  const bh = H - (detailed ? 30 : 12);
  const r = bh / 2;

  const tankHeight = tank.tankHeightMm ?? 0;
  const heightMm = state.heightMm;
  const waterHeightMm = state.waterHeightMm ?? 0;

  const hasData = tankHeight > 0 && heightMm !== null;
  const totalLiquidFrac = hasData ? Math.max(0, Math.min(1, heightMm! / tankHeight)) : 0;
  const waterFrac = hasData ? Math.max(0, Math.min(1, waterHeightMm / tankHeight)) : 0;
  const fuelFrac = Math.max(0, totalLiquidFrac - waterFrac);

  // state.volumeLiters est DÉJÀ net (carburant seul, eau déjà soustraite
  // côté backend) — ne jamais re-soustraire waterVolumeLiters ici, sinon
  // l'eau est comptée en moins deux fois.
  const fuelVolume = state.volumeLiters;
  const waterVolume = state.waterVolumeLiters ?? 0;
  const emptyVolume = state.emptyVolumeLiters ?? (tank.calibratedCapacityLiters ?? tank.capacityLiters);
  const capacity = tank.calibratedCapacityLiters ?? tank.capacityLiters;

  const pct = (v: number) => (capacity > 0 ? (v / capacity) * 100 : 0);
  const nfL = formatLiters;
  const nfPct = formatPercent;

  const emptyZonePx = (1 - totalLiquidFrac) * bh;
  const fuelZonePx = fuelFrac * bh;
  const waterZonePx = waterFrac * bh;

  const yFor = (mm: number) => (tankHeight > 0 ? by + bh - Math.max(0, Math.min(1, mm / tankHeight)) * bh : by + bh);

  const thresholds = detailed
    ? [
        { key: "high", mm: tank.heightAlarmMm, color: COLORS.high, reached: heightMm !== null && heightMm >= tank.heightAlarmMm, badge: "SEUIL HAUT", badgeBg: "var(--color-error-muted)", badgeText: COLORS.high },
        { key: "preAlarm", mm: tank.heightAlertMm, color: COLORS.preAlarm, reached: heightMm !== null && heightMm >= tank.heightAlertMm, badge: null, badgeBg: "", badgeText: "" },
        { key: "low", mm: tank.lowAlarmMm, color: COLORS.low, reached: heightMm !== null && heightMm <= tank.lowAlarmMm, badge: "NIVEAU BAS", badgeBg: "var(--color-info-muted)", badgeText: "var(--color-info)" },
        { key: "water", mm: tank.alertWaterMaxMm, color: COLORS.water, reached: waterHeightMm >= tank.alertWaterMaxMm, badge: "EAU DÉTECTÉE", badgeBg: "var(--color-info-muted)", badgeText: "var(--color-info)" },
      ]
    : [];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Cylindre de la cuve">
      <clipPath id={`tg-${tank.id}-${size}`}>
        <rect x={bx} y={by} width={bw} height={bh} rx={r} />
      </clipPath>
      <rect x={bx} y={by} width={bw} height={bh} rx={r} fill="#F4F6F8" stroke="rgba(255,255,255,0.3)" />
      <g clipPath={`url(#tg-${tank.id}-${size})`}>
        {hasData && (
          <>
            {fuelFrac > 0 && <rect x={bx} y={by + bh - totalLiquidFrac * bh} width={bw} height={fuelFrac * bh} fill={fuelColor} opacity={0.85} />}
            {waterFrac > 0 && <rect x={bx} y={by + bh - waterFrac * bh} width={bw} height={waterFrac * bh} fill="var(--color-info)" opacity={0.9} />}
          </>
        )}
      </g>
      {thresholds.map((th) => {
        const y = yFor(th.mm);
        return (
          <g key={th.key}>
            <line x1={bx} y1={y} x2={bx + bw} y2={y} stroke={th.color} strokeWidth={th.reached ? 2 : 1.5} strokeOpacity={th.reached ? 1 : 0.7} strokeDasharray={th.reached ? undefined : "4 4"} />
            {th.reached && th.badge && (
              <g>
                <rect x={bx + bw - 100} y={y - 19} width={98} height={16} rx={3} fill={th.badgeBg} />
                <text x={bx + bw - 51} y={y - 8} fontSize={9} fontWeight={700} textAnchor="middle" fill={th.badgeText}>
                  {th.badge}
                </text>
              </g>
            )}
          </g>
        );
      })}
      {/* Capuchons 3D aux deux extrémités — de vraies ellipses, sûres
          maintenant que le ratio du viewBox n'est plus déformé. */}
      <ellipse cx={bx + r} cy={by + r} rx={r * 0.35} ry={r * 0.92} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={1.5} />
      <ellipse cx={bx + bw - r} cy={by + r} rx={r * 0.35} ry={r * 0.92} fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth={1.5} />
      {detailed && emptyZonePx >= 20 && (
        <text x={bx + bw / 2} y={by + Math.max(15, emptyZonePx / 2)} fontSize={14} textAnchor="middle" fill="#687280" fontWeight={600}>
          {hasData ? `VIDE ${nfL(emptyVolume)} L (${nfPct(pct(emptyVolume))}%)` : "n/d"}
        </text>
      )}
      {detailed && hasData && fuelVolume !== null && fuelZonePx >= 24 && (
        <text
          x={bx + bw / 2}
          y={by + emptyZonePx + fuelZonePx / 2 + 5}
          fontSize={15}
          fontWeight={700}
          textAnchor="middle"
          fill="#fff"
          style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,.3))" }}
        >
          {`CARBURANT ${nfL(fuelVolume)} L (${nfPct(pct(fuelVolume))}%)`}
        </text>
      )}
      {detailed && waterZonePx >= 18 && (
        <text x={bx + bw / 2} y={by + bh - 5} fontSize={12} textAnchor="middle" fill="#fff" fontWeight={600}>
          {`EAU ${nfL(waterVolume)} L (${nfPct(pct(waterVolume))}%)`}
        </text>
      )}
    </svg>
  );
}
