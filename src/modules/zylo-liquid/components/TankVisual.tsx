"use client";

import { useTranslations } from "next-intl";

import type { Tank, TankCurrentState } from "@/modules/zylo-liquid/services/zyloLiquidApi";

import { formatLiters } from "@/modules/zylo-liquid/utils/formatLiters";
import { formatPercent } from "@/modules/zylo-liquid/utils/formatPercent";
import { TankGauge } from "./TankGauge";

export type TankVisualMode = "vertical" | "horizontal" | "anneau" | "compact";

export const TANK_VISUAL_MODES: TankVisualMode[] = ["vertical", "horizontal", "anneau", "compact"];

const WATER_COLOR = "var(--color-info)";
const ULLAGE_COLOR = "var(--color-surface-muted)";
const ULLAGE_BORDER = "var(--color-border)";

export interface TankVisualData {
  capacityLiters: number;
  volumeLiters: number | null;
  waterVolumeLiters: number;
  emptyVolumeLiters: number;
  pct: number | null;
  heightMm: number | null;
  waterHeightMm: number;
  tankHeightMm: number;
  tone: "ok" | "warning" | "error" | "idle";
  toneColor: string;
}

/** Dérive toutes les grandeurs d'affichage à partir des seules données réelles
 * de `TankCurrentState` et des seuils réels de `Tank` — jamais une valeur
 * inventée. Le "ton" (couleur) reprend exactement les catégories de
 * `evaluate_threshold_alarms` (niveau haut, pré-alarme, niveau bas), sans
 * dupliquer d'algorithme métier : c'est une lecture directe des mêmes
 * seuils déjà stockés sur la cuve. */
export function computeTankVisualData(tank: Tank, state: TankCurrentState): TankVisualData {
  const capacityLiters = tank.calibratedCapacityLiters ?? tank.capacityLiters;
  const volumeLiters = state.volumeLiters;
  const waterVolumeLiters = state.waterVolumeLiters ?? 0;
  const emptyVolumeLiters = state.emptyVolumeLiters ?? (volumeLiters !== null ? Math.max(0, capacityLiters - volumeLiters) : capacityLiters);
  const pct = volumeLiters !== null && capacityLiters > 0 ? (volumeLiters / capacityLiters) * 100 : null;
  const heightMm = state.heightMm;
  const waterHeightMm = state.waterHeightMm ?? 0;
  const tankHeightMm = tank.tankHeightMm ?? 0;

  let tone: TankVisualData["tone"] = "idle";
  if (state.sensorStatus === "online" && heightMm !== null) {
    if (heightMm >= tank.heightAlarmMm || heightMm <= tank.lowAlarmMm) tone = "error";
    else if (heightMm >= tank.heightAlertMm) tone = "warning";
    else tone = "ok";
  }
  const toneColor = tone === "error" ? "var(--color-error)" : tone === "warning" ? "var(--color-warning)" : tone === "ok" ? "var(--color-success)" : "var(--color-text-disabled)";

  return { capacityLiters, volumeLiters, waterVolumeLiters, emptyVolumeLiters, pct, heightMm, waterHeightMm, tankHeightMm, tone, toneColor };
}

function clampPct(v: number) {
  return Math.max(0, Math.min(100, v));
}

export function ModeSwitcher({ mode, onChange }: { mode: TankVisualMode; onChange: (m: TankVisualMode) => void }) {
  const t = useTranslations("zyloLiquid.tankVisual.modes");
  return (
    <div role="group" aria-label={t("switcherLabel")} className="inline-flex overflow-hidden rounded-button border border-border">
      {TANK_VISUAL_MODES.map((m) => (
        <button
          key={m}
          type="button"
          title={t(`${m}.desc`)}
          onClick={() => onChange(m)}
          className={`px-2.5 py-1 text-caption font-medium transition-colors ${
            mode === m ? "bg-primary text-white" : "bg-surface text-text-muted hover:bg-surface-muted"
          }`}
        >
          {t(`${m}.label`)}
        </button>
      ))}
    </div>
  );
}

function GaugeVertical({ data, big, fuelColor }: { data: TankVisualData; big?: boolean; fuelColor: string }) {
  const w = big ? 92 : 76;
  const h = big ? 190 : 158;
  const bx = 10,
    by = 8,
    bw = w - 32,
    bh = h - 26;
  const pct = data.pct ?? 0;
  const fillH = (bh * clampPct(pct)) / 100;
  const waterPct = data.capacityLiters > 0 ? (data.waterVolumeLiters / data.capacityLiters) * 100 : 0;
  const waterH = Math.max(data.waterVolumeLiters > 0 ? 3 : 0, (bh * clampPct(waterPct)) / 100);
  const col = data.pct === null ? "var(--color-text-disabled)" : data.toneColor === "var(--color-success)" ? fuelColor : data.toneColor;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} role="img" aria-label={`Jauge, remplissage ${formatPercent(pct)}%`}>
      <rect x={bx} y={by} width={bw} height={bh} rx={7} fill={ULLAGE_COLOR} stroke={ULLAGE_BORDER} />
      <clipPath id={`cv-${w}-${h}`}>
        <rect x={bx} y={by} width={bw} height={bh} rx={7} />
      </clipPath>
      <g clipPath={`url(#cv-${w}-${h})`}>
        {data.pct !== null && (
          <>
            <rect x={bx} y={by + bh - fillH} width={bw} height={fillH} fill={col} opacity={0.88} />
            {data.waterVolumeLiters > 0 && <rect x={bx} y={by + bh - waterH} width={bw} height={waterH} fill={WATER_COLOR} />}
          </>
        )}
      </g>
      {data.pct === null && (
        <text x={bx + bw / 2} y={by + bh / 2} fontSize={10} textAnchor="middle" fill="var(--color-text-muted)">
          n/d
        </text>
      )}
      <text x={bx + bw / 2} y={h - 4} fontSize={10} textAnchor="middle" fontWeight={700} fill="var(--color-text)" fontFamily="ui-monospace,monospace">
        {data.pct === null ? "—" : `${formatPercent(pct)} %`}
      </text>
    </svg>
  );
}

/** Délègue à `TankGauge`, la SOURCE UNIQUE du cylindre horizontal (voir
 * TankGauge.tsx) — évite de dupliquer la composition eau/carburant/vide
 * une deuxième fois ici. `computeTankVisualData` reste utilisée par les
 * autres modes (vertical/anneau/compact), donc `tank`/`state` bruts sont
 * repassés tels quels plutôt que le `TankVisualData` déjà dérivé. */
function GaugeHorizontal({ tank, state, big, fuelColor }: { tank: Tank; state: TankCurrentState; big?: boolean; fuelColor: string }) {
  return <TankGauge tank={tank} state={state} fuelColor={fuelColor} size={big ? "detailed" : "compact"} />;
}

function GaugeAnneau({ data, big, fuelColor }: { data: TankVisualData; big?: boolean; fuelColor: string }) {
  const size = big ? 190 : 150;
  const cx = size / 2,
    cy = size / 2,
    r = size / 2 - 16,
    sw = 19;
  const cap = data.capacityLiters;
  const water = data.waterVolumeLiters;
  const carb = data.volumeLiters === null ? 0 : Math.max(0, data.volumeLiters - water);
  const ullage = Math.max(0, cap - (data.volumeLiters === null ? cap : data.volumeLiters));
  const circ = 2 * Math.PI * r;
  const col = data.pct === null ? "var(--color-text-disabled)" : data.toneColor === "var(--color-success)" ? fuelColor : data.toneColor;
  const segs = [
    { v: carb, c: col },
    { v: water, c: WATER_COLOR },
    { v: ullage, c: ULLAGE_COLOR },
  ];
  let off = 0;

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label="Composition volumétrique de la cuve">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={ULLAGE_COLOR} strokeWidth={sw} />
      {segs.map((sg, i) => {
        if (sg.v <= 0 || cap <= 0) return null;
        const len = circ * (sg.v / cap);
        const el = (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={sg.c}
            strokeWidth={sw}
            strokeDasharray={`${len} ${circ - len}`}
            strokeDashoffset={-off}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        );
        off += len;
        return el;
      })}
      <text x={cx} y={cy - 1} textAnchor="middle" fontSize={19} fontWeight={700} fill="var(--color-text)" fontFamily="ui-monospace,monospace">
        {data.pct === null ? "—" : `${formatPercent(data.pct)}%`}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize={9.5} fill="var(--color-text-muted)">
        rempli
      </text>
    </svg>
  );
}

function GaugeCompact({ data, fuelColor }: { data: TankVisualData; fuelColor: string }) {
  const pct = data.pct ?? 0;
  const waterPct = data.capacityLiters > 0 ? (data.waterVolumeLiters / data.capacityLiters) * 100 : 0;
  const col = data.pct === null ? "var(--color-text-disabled)" : data.toneColor === "var(--color-success)" ? fuelColor : data.toneColor;
  return (
    <div className="relative h-4 overflow-hidden rounded-button border" style={{ background: ULLAGE_COLOR, borderColor: ULLAGE_BORDER }}>
      <div className="absolute inset-y-0 left-0 opacity-90" style={{ width: `${clampPct(pct)}%`, background: col }} />
      {data.waterVolumeLiters > 0 && <div className="absolute inset-y-0 left-0" style={{ width: `${Math.max(2, waterPct)}%`, background: WATER_COLOR }} />}
    </div>
  );
}

export function TankVisual({ tank, state, mode, big, fuelColor }: { tank: Tank; state: TankCurrentState; mode: TankVisualMode; big?: boolean; fuelColor?: string | null }) {
  const data = computeTankVisualData(tank, state);
  const color = fuelColor ?? "var(--color-primary)";
  if (mode === "horizontal") return <GaugeHorizontal tank={tank} state={state} big={big} fuelColor={color} />;
  if (mode === "anneau") return <GaugeAnneau data={data} big={big} fuelColor={color} />;
  if (mode === "compact") return <GaugeCompact data={data} fuelColor={color} />;
  return <GaugeVertical data={data} big={big} fuelColor={color} />;
}

export function TankFigures({ tank, state, showValue = true }: { tank: Tank; state: TankCurrentState; showValue?: boolean }) {
  const t = useTranslations("zyloLiquid.tankVisual.figures");
  const tReasons = useTranslations("zyloLiquid.caisse.reasons");
  const data = computeTankVisualData(tank, state);
  const fmt = (v: number) => `${formatLiters(v)} L`;
  const rows: [string, string][] = [
    // Niveau carburant et niveau eau sur deux lignes clairement distinctes,
    // chacune dans le même format (volume puis hauteur entre parenthèses)
    // — le format précédent mélangeait hauteur et volume dans une seule
    // chaîne pour l'eau ("0 mm · 0 L"), jamais pour le carburant, rendant
    // les deux incohérents à lire côte à côte (P2 §5.10, audit module
    // Stations 2026-09-16).
    [
      t("volume"),
      data.volumeLiters === null ? "—" : `${fmt(data.volumeLiters)}${data.heightMm !== null ? ` (${Math.round(data.heightMm)} mm)` : ""}`,
    ],
    [t("capacity"), fmt(data.capacityLiters)],
    [t("fillRate"), data.pct === null ? "—" : `${data.pct.toFixed(1)} %`],
    [t("sellable"), state.sellableVolumeLiters === null ? t("notCalculable") : fmt(state.sellableVolumeLiters)],
    [t("water"), state.waterHeightMm === null ? "—" : `${fmt(data.waterVolumeLiters)} (${Math.round(state.waterHeightMm)} mm)`],
    [t("available"), fmt(data.emptyVolumeLiters)],
    [t("temperature"), state.temperatureC === null ? "—" : `${state.temperatureC.toFixed(1)} °C`],
    // Nécessiterait un débit de vente (moyenne glissante 7j) qu'aucune
    // donnée réelle ne fournit aujourd'hui — jamais un chiffre inventé à
    // sa place (même principe que TanksNetworkScreen.tsx, colonne
    // "Couverture" déjà désactivée pour cette raison).
    [t("coverage"), t("notCalculable")],
  ];
  if (showValue) {
    if (state.monetaryValue !== null && state.currencyCode) {
      rows.push([t("value"), `${Math.round(state.monetaryValue).toLocaleString()} ${state.currencyCode}`]);
    } else if (state.monetaryValueNotCalculableReason !== null) {
      // Jamais "valeur non calculable" affichée sans raison (P0-7, audit
      // module Stations 2026-09-16) — la carte cuve omettait purement et
      // simplement la ligne, laissant croire à une cuve mal configurée
      // alors que la vraie cause (prix manquant, devise mal résolue,
      // volume non calculable) est déjà connue côté backend. Réutilise le
      // même dictionnaire de raisons que les écrans Caisse plutôt que d'en
      // dupliquer un.
      rows.push([t("value"), tReasons(state.monetaryValueNotCalculableReason)]);
    }
  }
  return (
    <div className="flex flex-col gap-1.5">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-center justify-between gap-4 text-body-sm">
          <span className="text-text-muted">{label}</span>
          <span className="tabular-nums font-medium text-text">{value}</span>
        </div>
      ))}
    </div>
  );
}

export function TankLegend() {
  const t = useTranslations("zyloLiquid.tankVisual.legend");
  const items: { color: string; label: string }[] = [
    { color: "var(--color-success)", label: t("normal") },
    { color: "var(--color-warning)", label: t("threshold") },
    { color: "var(--color-error)", label: t("critical") },
    { color: WATER_COLOR, label: t("water") },
    { color: ULLAGE_COLOR, label: t("available") },
  ];
  return (
    <div className="flex flex-wrap items-center gap-4 text-caption text-text-muted">
      {items.map((it) => (
        <span key={it.label} className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-full border border-border-subtle" style={{ background: it.color }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}
