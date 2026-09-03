"use client";

import type { Tank, TankCurrentState } from "@/core/api/zyloLiquid";

/** Cylindre horizontal détaillé — zones Vide/Carburant/Eau proportionnelles
 * à la HAUTEUR physique réelle mesurée (heightMm/waterHeightMm/tankHeightMm
 * de Tank/TankCurrentState, jamais une valeur inventée), 4 traits de seuil
 * avec badge quand franchis. Si heightMm est null (capteur non configuré ou
 * hors ligne), le cylindre reste vide/grisé — c'est à l'appelant d'afficher
 * l'état "non calculable" à côté, ce composant ne fabrique jamais de repli. */
export function TankCylinder({ tank, state, fillColor }: { tank: Tank; state: TankCurrentState; fillColor: string }) {
  const W = 580;
  const H = 100;
  const bx = 8;
  const by = 6;
  const bw = W - 16;
  const bh = H - 30;
  const r = bh / 2;

  const tankHeight = tank.tankHeightMm ?? 0;
  const heightMm = state.heightMm;
  const waterHeightMm = state.waterHeightMm ?? 0;
  const capacity = tank.calibratedCapacityLiters ?? tank.capacityLiters;

  const hasData = tankHeight > 0 && heightMm !== null;
  const oilFrac = hasData ? Math.max(0, Math.min(1, heightMm! / tankHeight)) : 0;
  const waterFrac = hasData ? Math.max(0, Math.min(1, waterHeightMm / tankHeight)) : 0;
  const fuelFrac = Math.max(0, oilFrac - waterFrac);

  const waterVolume = state.waterVolumeLiters ?? 0;
  const fuelVolume = state.volumeLiters !== null ? Math.max(0, state.volumeLiters - waterVolume) : null;
  const emptyVolume = state.emptyVolumeLiters ?? capacity;

  const pct = (v: number) => (capacity > 0 ? (v / capacity) * 100 : 0);
  const nf = (v: number) => Math.round(v).toLocaleString("fr-FR");

  const emptyZonePx = (1 - oilFrac) * bh;
  const fuelZonePx = fuelFrac * bh;
  const waterZonePx = waterFrac * bh;

  const yFor = (mm: number) => (tankHeight > 0 ? by + bh - Math.max(0, Math.min(1, mm / tankHeight)) * bh : by + bh);

  // Ordre et couleurs exacts de la spécification : haut=rouge,
  // pré-alarme=orange, bas=bleu, eau=bleu clair (différent du jeu de
  // couleurs "seuils critiques en rouge" utilisé ailleurs dans l'app —
  // ce cylindre suit la palette propre à cette carte).
  const thresholds = [
    { key: "high", mm: tank.heightAlarmMm, color: "#E74C3C", reached: heightMm !== null && heightMm >= tank.heightAlarmMm, badge: "SEUIL HAUT", badgeBg: "#FDEDEC", badgeText: "#E74C3C" },
    { key: "preAlarm", mm: tank.heightAlertMm, color: "#E67E22", reached: heightMm !== null && heightMm >= tank.heightAlertMm, badge: null, badgeBg: "", badgeText: "" },
    { key: "low", mm: tank.lowAlarmMm, color: "#3498DB", reached: heightMm !== null && heightMm <= tank.lowAlarmMm, badge: "NIVEAU BAS", badgeBg: "#EBF5FB", badgeText: "#2980B9" },
    { key: "water", mm: tank.alertWaterMaxMm, color: "#85C1E9", reached: waterHeightMm >= tank.alertWaterMaxMm, badge: "EAU DÉTECTÉE", badgeBg: "#EBF5FB", badgeText: "#2980B9" },
  ];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Cylindre de la cuve">
      <clipPath id={`tc-${tank.id}`}>
        <rect x={bx} y={by} width={bw} height={bh} rx={r} />
      </clipPath>
      <rect x={bx} y={by} width={bw} height={bh} rx={r} fill="#F4F6F8" stroke="rgba(255,255,255,0.3)" />
      <g clipPath={`url(#tc-${tank.id})`}>
        {hasData && (
          <>
            <rect x={bx} y={by + bh - oilFrac * bh} width={bw} height={fuelFrac * bh} fill={fillColor} opacity={0.85} />
            {waterFrac > 0 && <rect x={bx} y={by + bh - waterFrac * bh} width={bw} height={waterFrac * bh} fill="#2980B9" opacity={0.9} />}
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
                <rect x={bx + bw - 92} y={y - 16} width={90} height={13} rx={3} fill={th.badgeBg} />
                <text x={bx + bw - 47} y={y - 6.5} fontSize={7.5} fontWeight={700} textAnchor="middle" fill={th.badgeText}>
                  {th.badge}
                </text>
              </g>
            )}
          </g>
        );
      })}
      <ellipse cx={bx + r} cy={by + r} rx={r * 0.35} ry={r * 0.92} fill="none" stroke="rgba(255,255,255,0.3)" />
      {emptyZonePx >= 20 && (
        <text x={bx + bw / 2} y={by + Math.max(11, emptyZonePx / 2) } fontSize={10} textAnchor="middle" fill="#687280" fontWeight={600}>
          {hasData ? `VIDE ${nf(emptyVolume)} L (${pct(emptyVolume).toFixed(0)}%)` : "n/d"}
        </text>
      )}
      {hasData && fuelVolume !== null && fuelZonePx >= 20 && (
        <text
          x={bx + bw / 2}
          y={by + emptyZonePx + fuelZonePx / 2 + 3}
          fontSize={11}
          fontWeight={700}
          textAnchor="middle"
          fill="#fff"
          style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,.3))" }}
        >
          {`CARBURANT ${nf(fuelVolume)} L (${pct(fuelVolume).toFixed(0)}%)`}
        </text>
      )}
      {waterZonePx >= 15 && (
        <text x={bx + bw / 2} y={by + bh - 3} fontSize={9} textAnchor="middle" fill="#fff" fontWeight={600}>
          {`EAU ${nf(waterVolume)} L (${pct(waterVolume).toFixed(1)}%)`}
        </text>
      )}
    </svg>
  );
}
