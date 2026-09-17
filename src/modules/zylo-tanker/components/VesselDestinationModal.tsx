"use client";

import { LocateFixed } from "lucide-react";
import { useState } from "react";

import { Alert } from "@/shared/ui/Alert";
import { Button } from "@/shared/ui/Button";
import { FormField } from "@/shared/ui/FormField";
import { Input } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";

import type { MockVessel } from "@/modules/zylo-tanker/mock/fleetMock";

export interface VesselDestinationModalProps {
  vessel: MockVessel;
  open: boolean;
  onClose: () => void;
  onSave: (lat: number, lon: number, label: string) => void;
}

type InputMode = "manual" | "current";

/** Modale de définition de destination d'un navire — deux modes de saisie
 * (coordonnées manuelles, ou position actuelle du navigateur via
 * `navigator.geolocation`). Purement présentation/état local : aucune
 * requête réseau, `onSave` est branché par l'appelant (mock pour l'instant,
 * voir DashboardScreen). Jamais de coordonnée inventée en cas d'échec de
 * géolocalisation — un message d'erreur explicite remplace la valeur. */
export function VesselDestinationModal({ vessel, open, onClose, onSave }: VesselDestinationModalProps) {
  const [mode, setMode] = useState<InputMode>("manual");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [label, setLabel] = useState("");
  const [locating, setLocating] = useState(false);
  const [geolocationError, setGeolocationError] = useState<string | null>(null);

  function resetAndClose() {
    setMode("manual");
    setLatitude("");
    setLongitude("");
    setLabel("");
    setLocating(false);
    setGeolocationError(null);
    onClose();
  }

  function handleUseCurrentPosition() {
    setGeolocationError(null);
    if (!("geolocation" in navigator)) {
      setGeolocationError("La géolocalisation n'est pas disponible sur ce navigateur.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(String(position.coords.latitude));
        setLongitude(String(position.coords.longitude));
        setLocating(false);
      },
      (error) => {
        setGeolocationError(
          error.code === error.PERMISSION_DENIED
            ? "Accès à la position refusé — autorisez la géolocalisation ou saisissez les coordonnées manuellement."
            : "Position actuelle indisponible — saisissez les coordonnées manuellement."
        );
        setLocating(false);
      }
    );
  }

  const parsedLatitude = Number(latitude);
  const parsedLongitude = Number(longitude);
  const canSave =
    latitude.trim() !== "" &&
    longitude.trim() !== "" &&
    Number.isFinite(parsedLatitude) &&
    Number.isFinite(parsedLongitude);

  function handleSave() {
    if (!canSave) return;
    onSave(parsedLatitude, parsedLongitude, label.trim());
    resetAndClose();
  }

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) resetAndClose();
      }}
      title={`Définir la destination — ${vessel.name}`}
      closeLabel="Fermer"
      footer={
        <>
          <Button variant="outline" size="sm" type="button" onClick={resetAndClose}>
            Annuler
          </Button>
          <Button size="sm" type="button" disabled={!canSave} onClick={handleSave}>
            Enregistrer
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="inline-flex w-fit rounded-button border border-border-subtle p-1">
          <button
            type="button"
            onClick={() => setMode("manual")}
            className={`rounded-button px-3 py-1.5 text-body-sm font-medium transition-colors ${
              mode === "manual" ? "bg-primary text-white" : "text-text-muted hover:text-text"
            }`}
          >
            Saisie manuelle
          </button>
          <button
            type="button"
            onClick={() => setMode("current")}
            className={`rounded-button px-3 py-1.5 text-body-sm font-medium transition-colors ${
              mode === "current" ? "bg-primary text-white" : "text-text-muted hover:text-text"
            }`}
          >
            Position actuelle
          </button>
        </div>

        {mode === "current" && (
          <div className="flex flex-col gap-2">
            <Button variant="outline" size="sm" type="button" loading={locating} onClick={handleUseCurrentPosition}>
              <LocateFixed className="size-4" aria-hidden />
              Utiliser ma position actuelle
            </Button>
            {geolocationError && <Alert tone="error">{geolocationError}</Alert>}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Latitude" required>
            {(fieldProps) => (
              <Input
                {...fieldProps}
                type="number"
                step="any"
                placeholder="4.0500"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
              />
            )}
          </FormField>
          <FormField label="Longitude" required>
            {(fieldProps) => (
              <Input
                {...fieldProps}
                type="number"
                step="any"
                placeholder="9.7000"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
              />
            )}
          </FormField>
        </div>

        <FormField label="Libellé" hint="Ex. « Port de Douala »">
          {(fieldProps) => (
            <Input
              {...fieldProps}
              type="text"
              placeholder="Port de Douala"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          )}
        </FormField>
      </div>
    </Modal>
  );
}
