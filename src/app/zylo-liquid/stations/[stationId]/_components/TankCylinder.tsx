"use client";

import type { Tank, TankCurrentState } from "@/core/api/zyloLiquid";

/** Cylindre horizontal détaillé pour la carte cuve de la page station,
 * conforme à la spécification du commanditaire (zones Vide/Carburant/Eau
 * proportionnelles à la HAUTEUR physique mesurée, 4 traits de seuil avec
 * légende). Toutes les valeurs viennent de TankCurrentState/Tank réels —
 * aucune donnée inventée : si heightMm est null (capteur non configuré),
 * le cylindre reste vide/grisé et l'appelant doit afficher l'état "non
 * calculable" à côté, jamais ce composant qui ne fabrique pas de repli. */
export function TankCylinder({ tank, state, fuelColor }: { tank: Tank; state: TankCurrentState; fuelColor: string }) {
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

  const yFor = (mm: number) => (tankHeight > 0 ? by + bh - Math.max(0, Math.min(1, mm / tankHeight)) * bh : by + bh);

  const thresholds = [
    { mm: tank.heightAlarmMm, color: "#E67E22", reached: heightMm !== null && heightMm >= tank.heightAlarmMm, labelKey: "high" },
    { mm: tank.heightAlertMm, color: "#F39C12", reached: heightMm !== null && heightMm >= tank.heightAlertMm, labelKey: "preAlarm" },
    { mm: tank.lowAlarmMm, color: "#E74C3C", reached: heightMm !== null && heightMm <= tank.lowAlarmMm, labelKey: "low" },
    { mm: tank.alertWaterMaxMm, color: "#2980B9", reached: waterHeightMm >= tank.alertWaterMaxMm, labelKey: "water" },
  ];

  return (
    <div className="row" style={{ gap: 16, alignItems: "center" }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="70%" height={H} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Cylindre de la cuve">
        <clipPath id={`tc-${tank.id}`}>
          <rect x={bx} y={by} width={bw} height={bh} rx={r} />
        </clipPath>
        <rect x={bx} y={by} width={bw} height={bh} rx={r} fill="#F4F6F8" stroke="var(--border)" />
        <g clipPath={`url(#tc-${tank.id})`}>
          {hasData && (
            <>
              {/* Carburant */}
              <rect x={bx} y={by + bh - oilFrac * bh} width={bw} height={fuelFrac * bh} fill={fuelColor} opacity={0.85} />
              {/* Eau */}
              {waterFrac > 0 && <rect x={bx} y={by + bh - waterFrac * bh} width={bw} height={waterFrac * bh} fill="#2980B9" />}
            </>
          )}
        </g>
        {thresholds.map((th) => {
          const y = yFor(th.mm);
          return (
            <g key={th.labelKey}>
              <line x1={bx} y1={y} x2={bx + bw} y2={y} stroke={th.color} strokeWidth={th.reached ? 2 : 1.5} strokeDasharray={th.reached ? undefined : "4 3"} />
            </g>
          );
        })}
        <ellipse cx={bx + r} cy={by + r} rx={r * 0.4} ry={r * 0.92} fill="none" stroke="var(--border)" />
        <text x={bx + bw / 2} y={by + 12} fontSize={9} textAnchor="middle" fill="var(--ink-2)">
          {hasData ? `VIDE ${Math.round(emptyVolume).toLocaleString()} L (${pct(emptyVolume).toFixed(0)}%)` : "n/d"}
        </text>
        {hasData && fuelVolume !== null && (
          <text x={bx + bw / 2} y={by + bh - waterFrac * bh - fuelFrac * bh * 0.5 + 3} fontSize={9} textAnchor="middle" fill="#fff" fontWeight={700}>
            {`CARBURANT ${Math.round(fuelVolume).toLocaleString()} L (${pct(fuelVolume).toFixed(0)}%)`}
          </text>
        )}
        <text x={bx + bw / 2} y={by + bh - 4} fontSize={8.5} textAnchor="middle" fill={waterFrac > 0 ? "#fff" : "var(--ink-3)"}>
          {`EAU ${Math.round(waterVolume).toLocaleString()} L (${pct(waterVolume).toFixed(1)}%)`}
        </text>
      </svg>

      <div className="stack" style={{ gap: 8, minWidth: 130 }}>
        <div className="xsmall dim strong">Niveaux (mm)</div>
        {thresholds.map((th) => (
          <div key={th.labelKey} className="row" style={{ gap: 6, justifyContent: "space-between" }}>
            <span className="xsmall" style={{ color: th.color }}>
              — {th.labelKey === "high" ? "Seuil haut" : th.labelKey === "preAlarm" ? "Pré-alarme" : th.labelKey === "low" ? "Seuil bas" : "Seuil eau"}
            </span>
            <span className="xsmall mono">{Math.round(th.mm)}</span>
          </div>
        ))}
      </div>

      <div className="stack" style={{ gap: 6, minWidth: 100 }}>
        <div>
          <div className="xsmall dim">Carburant</div>
          <div className="mono strong">{fuelVolume === null ? "—" : `${Math.round(fuelVolume).toLocaleString()} L`}</div>
          <div className="xsmall dim">{hasData ? `${pct(fuelVolume ?? 0).toFixed(0)}%` : "—"}</div>
        </div>
        <div>
          <div className="xsmall dim">Eau</div>
          <div className="mono strong" style={{ color: thresholds[3].reached ? "var(--crit)" : undefined }}>
            {Math.round(waterVolume).toLocaleString()} L
          </div>
          <div className="xsmall dim">{pct(waterVolume).toFixed(2)}%</div>
        </div>
        <div>
          <div className="xsmall dim">Vide</div>
          <div className="mono strong">{Math.round(emptyVolume).toLocaleString()} L</div>
          <div className="xsmall dim">{pct(emptyVolume).toFixed(0)}%</div>
        </div>
      </div>
    </div>
  );
}
