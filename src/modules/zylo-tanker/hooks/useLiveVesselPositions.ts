"use client";

import { useEffect, useState } from "react";

import { computeEtaMinutes, type MockVessel } from "@/modules/zylo-tanker/mock/fleetMock";

const TICK_INTERVAL_MS = 4000;
const KNOTS_TO_KMH = 1.852;
const EARTH_RADIUS_KM = 6371;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/** Projette une position de `distanceKm` km le long du cap `headingDeg`
 * (formule de navigation à grand cercle — même principe que la haversine
 * utilisée pour la distance, mais dans l'autre sens : position + cap +
 * distance => nouvelle position). */
function advancePosition(
  latitude: number,
  longitude: number,
  headingDeg: number,
  distanceKm: number,
): { latitude: number; longitude: number } {
  if (distanceKm <= 0) return { latitude, longitude };

  const lat1 = toRad(latitude);
  const lon1 = toRad(longitude);
  const brng = toRad(headingDeg);
  const angularDistance = distanceKm / EARTH_RADIUS_KM;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) +
      Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(brng),
  );
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(angularDistance) * Math.cos(lat1),
      Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2),
    );

  return { latitude: toDeg(lat2), longitude: toDeg(lon2) };
}

/** Simule un flux de position "temps réel" côté frontend, sans aucun appel
 * réseau : fait progressivement avancer les navires `status === "underway"`
 * le long de leur cap (`headingDeg`) à intervalle régulier, recalcule
 * `etaMinutes` à chaque tick avec la même formule haversine que
 * `fleetMock.ts`, et laisse les navires `moored`/`anchored` immobiles.
 *
 * Objectif : donner l'impression d'un flux temps réel pendant que le vrai
 * SSE backend n'est pas encore branché côté UI Zylo Tanker (cf.
 * `src/modules/zylo-liquid/services/liveTruckPositions.ts` pour le patron
 * SSE réel qui remplacera ce hook plus tard — même signature de retour
 * `MockVessel[]` pour faciliter le remplacement). */
export function useLiveVesselPositions(initialVessels: MockVessel[]): MockVessel[] {
  const [vessels, setVessels] = useState<MockVessel[]>(initialVessels);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setVessels((current) =>
        current.map((vessel) => {
          if (vessel.status !== "underway" || vessel.speedKnots <= 0) return vessel;

          const distanceKm = (vessel.speedKnots * KNOTS_TO_KMH * TICK_INTERVAL_MS) / 3_600_000;
          const { latitude, longitude } = advancePosition(
            vessel.latitude,
            vessel.longitude,
            vessel.headingDeg,
            distanceKm,
          );

          const etaMinutes = computeEtaMinutes(
            latitude,
            longitude,
            vessel.destinationLatitude,
            vessel.destinationLongitude,
            vessel.speedKnots,
          );

          return { ...vessel, latitude, longitude, etaMinutes };
        }),
      );
    }, TICK_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, []);

  return vessels;
}
