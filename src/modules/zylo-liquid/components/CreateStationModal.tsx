"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { ApiError } from "@/core/api/client";
import {
  createStation,
  createTank,
  createTankSensorMapping,
  listCities,
  listCountries,
  listCurrencies,
  listFuelProducts,
  replaceTankCalibrationPoints,
  updateStation,
  type City,
  type Country,
  type Currency,
  type FuelProduct,
  type Station,
} from "@/modules/zylo-liquid/services/zyloLiquidApi";
import { cn } from "@/shared/lib/cn";
import { Alert, Button, Checkbox, FormField, Input, Modal, Select } from "@/shared/ui";

import { listIanaTimezones } from "@/modules/zylo-liquid/utils/timezones";

import { createEmptyTankFieldsState, isTankFieldsStateValid, TankFieldsSection, type TankFieldsState } from "./TankFieldsSection";

export interface CreateStationModalProps {
  organizationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  /** Présent = mode édition (PATCH), absent = mode création (POST). Le code
   * n'est jamais modifiable une fois la station créée (absent de
   * UpdateStationRequest côté backend) — champ masqué en édition. La
   * section "Cuves" n'a également de sens qu'à la création : une cuve a
   * besoin d'un stationId qui n'existe pas encore en édition. */
  station?: Station;
}

export function CreateStationModal({ organizationId, open, onOpenChange, onCreated, station }: CreateStationModalProps) {
  const t = useTranslations("zyloLiquid.stations");
  const tDetail = useTranslations("zyloLiquid.stationDetail");
  const tCommon = useTranslations("common");
  const isEdit = station !== undefined;

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [countryId, setCountryId] = useState("");
  const [cityId, setCityId] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [timezone, setTimezone] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [openingTime, setOpeningTime] = useState("06:00");
  const [closingTime, setClosingTime] = useState("22:00");
  const [is24h, setIs24h] = useState(false);
  const [closedWeekdays, setClosedWeekdays] = useState<number[]>([]);
  const [notes, setNotes] = useState("");
  const [currencyOverrideId, setCurrencyOverrideId] = useState("");
  const [tanks, setTanks] = useState<TankFieldsState[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Le pays n'est pré-rempli automatiquement (timezone, devise) que tant que
  // l'utilisateur ne l'a pas modifié lui-même — sinon changer de pays
  // écraserait systématiquement un fuseau déjà ajusté à la main (P1-1/P1-2,
  // audit module Stations 2026-09-16).
  const [timezoneTouched, setTimezoneTouched] = useState(false);

  useEffect(() => {
    if (open && station) {
      setName(station.name);
      setCode(station.code);
      setCityId(station.cityId ?? "");
      setTimezoneTouched(true);
      setAddress(station.address ?? "");
      setLatitude(station.latitude !== null ? String(station.latitude) : "");
      setLongitude(station.longitude !== null ? String(station.longitude) : "");
      setTimezone(station.timezone || "");
      setPhone(station.phone ?? "");
      setEmail(station.email ?? "");
      setOpeningTime(station.openingTime || "06:00");
      setClosingTime(station.closingTime || "22:00");
      setIs24h(station.is24h);
      setClosedWeekdays(station.closedWeekdays ? station.closedWeekdays.split(",").map(Number) : []);
      setNotes(station.notes ?? "");
      setCurrencyOverrideId(station.currencyOverrideId ?? "");
    }
  }, [open, station]);

  // Référentiels quasi statiques (villes/devises/produits) — le backend les
  // met déjà en cache 60s côté serveur (`currency_list_cache`,
  // `_city_list_cache`, `fuel_product_list_cache`), donc ce staleTime de 5
  // minutes côté client évite en plus de refaire l'aller-retour réseau à
  // chaque réouverture de la modale dans la même session, sans risquer de
  // données périmées au-delà d'une durée raisonnable. `enabled: open` :
  // inutile de fetcher tant que la modale n'est pas affichée.
  const citiesQuery = useQuery({
    queryKey: ["zylo-liquid", "cities", organizationId],
    queryFn: () => listCities(organizationId, { limit: 100 }),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });
  const countriesQuery = useQuery({
    queryKey: ["zylo-liquid", "countries", organizationId],
    queryFn: () => listCountries(organizationId, { limit: 300 }),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });
  const fuelProductsQuery = useQuery({
    queryKey: ["zylo-liquid", "fuel-products", organizationId],
    queryFn: () => listFuelProducts(organizationId),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });
  const currenciesQuery = useQuery({
    queryKey: ["zylo-liquid", "currencies", organizationId],
    queryFn: () => listCurrencies(organizationId, 100),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  const cities: City[] = citiesQuery.data?.data ?? [];
  const countries: Country[] = countriesQuery.data?.data ?? [];
  const fuelProducts: FuelProduct[] = (fuelProductsQuery.data?.data ?? []).filter((p) => p.active !== false);
  const currencies: Currency[] = currenciesQuery.data?.data ?? [];

  // Édition : `Station` n'a pas de `countryId` propre (seulement `cityId`),
  // le pays est donc dérivé de la ville une fois le référentiel villes
  // chargé — jamais avant, pour ne pas réinitialiser un pays déjà choisi
  // par l'utilisateur pendant la même session de la modale.
  useEffect(() => {
    if (open && station && station.cityId && cities.length > 0 && !countryId) {
      const city = cities.find((c) => c.id === station.cityId);
      if (city) setCountryId(city.countryId);
    }
  }, [open, station, cities, countryId]);

  function reset() {
    setName("");
    setCode("");
    setCountryId("");
    setCityId("");
    setAddress("");
    setLatitude("");
    setLongitude("");
    setTimezone("");
    setPhone("");
    setEmail("");
    setOpeningTime("06:00");
    setClosingTime("22:00");
    setIs24h(false);
    setClosedWeekdays([]);
    setNotes("");
    setCurrencyOverrideId("");
    setTimezoneTouched(false);
    setTanks([]);
    setError(null);
  }

  const timezoneOptions = useMemo(() => listIanaTimezones(), []);
  const selectedCity = cities.find((c) => c.id === cityId);
  const selectedCountry = countries.find((c) => c.id === countryId);
  // Ville filtrée par pays sélectionné (P1-1, audit module Stations
  // 2026-09-16 : le pays manquait alors que la ville en dépend directement).
  // Aucun pays choisi = toutes les villes, comme avant ce correctif.
  const citiesForCountry = countryId ? cities.filter((c) => c.countryId === countryId) : cities;

  function handleCountryChange(nextCountryId: string) {
    setCountryId(nextCountryId);
    if (cityId && !cities.some((c) => c.id === cityId && c.countryId === nextCountryId)) {
      setCityId("");
    }
    const nextCountry = countries.find((c) => c.id === nextCountryId);
    if (nextCountry && !timezoneTouched) {
      setTimezone(nextCountry.defaultTimezone);
    }
  }

  function tankNumbersExcept(index: number): number[] {
    return tanks.filter((_, i) => i !== index).map((tk) => Number(tk.tankNumber)).filter((n) => Number.isFinite(n));
  }

  const tanksValid = tanks.every((tk, i) => isTankFieldsStateValid(tk, tankNumbersExcept(i)));
  // Un contrôle de validation renforcé (Pays et Fuseau horaire désormais
  // obligatoires) : la création aboutissait auparavant même formulaire mal
  // ou incomplètement renseigné (P1-1, audit module Stations 2026-09-16).
  const canSubmit = !!name && (isEdit || !!code) && !!countryId && !!timezone && tanksValid;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        name,
        cityId: cityId || undefined,
        address: address || undefined,
        latitude: latitude ? Number(latitude) : undefined,
        longitude: longitude ? Number(longitude) : undefined,
        timezone: timezone || undefined,
        phone: phone || undefined,
        email: email || undefined,
        openingTime: is24h ? undefined : openingTime || undefined,
        closingTime: is24h ? undefined : closingTime || undefined,
        is24h,
        closedWeekdays: closedWeekdays.length > 0 ? [...closedWeekdays].sort((a, b) => a - b).join(",") : null,
        notes: notes || undefined,
        currencyOverrideId: currencyOverrideId || null,
      };

      if (isEdit && station) {
        await updateStation(organizationId, station.id, payload);
      } else {
        const created = await createStation(organizationId, { ...payload, code });

        for (const tk of tanks) {
          const tank = await createTank(organizationId, {
            stationId: created.id,
            tankNumber: Number(tk.tankNumber),
            displayName: `Cuve ${tk.tankNumber}`,
            capacityLiters: Number(tk.capacityLiters),
            tankHeightMm: Number(tk.tankHeightMm),
            ...(tk.fuelMode === "existing" ? { fuelProductId: tk.fuelProductId } : { newFuelProductName: tk.newProductName, newFuelProductCode: tk.newProductCode }),
            heightAlarmMm: Number(tk.heightAlarmMm),
            heightAlertMm: Number(tk.heightAlertMm),
            lowAlarmMm: Number(tk.lowAlarmMm),
            alertWaterMaxMm: Number(tk.alertWaterMaxMm),
          });

          for (const sensor of tk.sensors) {
            if (sensor.serial.trim()) {
              await createTankSensorMapping(organizationId, { tankId: tank.id, hkSerialNumber: sensor.serial.trim(), measurementType: sensor.measurementType });
            }
          }

          if (!tk.skipCalibration && tk.calibrationPoints && tk.calibrationPoints.length > 0) {
            await replaceTankCalibrationPoints(organizationId, tank.id, tk.calibrationPoints);
          }
        }
      }
      reset();
      onOpenChange(false);
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tCommon("states.error"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
      title={isEdit ? tDetail("editModal.title") : t("createModal.title")}
      size="full"
      closeLabel={tCommon("actions.close")}
      preventOutsideClose
      footer={
        <>
          <Button variant="outline" size="sm" type="button" onClick={() => onOpenChange(false)}>
            {tCommon("actions.cancel")}
          </Button>
          <Button size="sm" type="submit" form="create-station-form" loading={submitting} disabled={!canSubmit}>
            {isEdit ? tCommon("actions.save") : t("createModal.submit")}
          </Button>
        </>
      }
    >
      <form id="create-station-form" onSubmit={handleSubmit} className="flex flex-col gap-6">
        {error && <Alert tone="error">{error}</Alert>}

        {/* Mobile-first : une colonne empilée par défaut ; à partir de lg,
           bascule en 2 colonnes côte à côte (station | cuves) pour exploiter
           la largeur du modal size="full" au lieu de rester une colonne
           étroite perdue au milieu d'un grand écran. En édition il n'y a pas
           de section cuves, donc pas de 2e colonne à prévoir. */}
        <div className={cn("grid grid-cols-1 gap-6", !isEdit && "lg:grid-cols-2 lg:items-start")}>
          <section className="flex flex-col gap-3">
            <h4 className="text-body-md font-semibold text-text">{t("createModal.sections.station")}</h4>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField label={t("createModal.name")} required hint={t("createModal.nameHint")}>
                {(field) => <Input {...field} value={name} onChange={(e) => setName(e.target.value)} required maxLength={200} />}
              </FormField>
              {!isEdit && (
                <FormField label={t("createModal.code")} required hint={t("createModal.codeHint")}>
                  {(field) => <Input {...field} value={code} onChange={(e) => setCode(e.target.value)} required maxLength={20} />}
                </FormField>
              )}
            </div>

            <FormField label={t("createModal.country")} required hint={t("createModal.countryHint")}>
              {(field) => (
                <Select
                  {...field}
                  value={countryId}
                  onValueChange={handleCountryChange}
                  options={[{ value: "", label: t("createModal.countrySelectPlaceholder") }, ...countries.map((c) => ({ value: c.id, label: c.name }))]}
                />
              )}
            </FormField>

            <FormField label={t("createModal.city")} hint={t("createModal.cityHint")}>
              {(field) => (
                <Select
                  {...field}
                  value={cityId}
                  onValueChange={setCityId}
                  options={[{ value: "", label: t("createModal.citySelectPlaceholder") }, ...citiesForCountry.map((c) => ({ value: c.id, label: `${c.name} (${c.regionName}, ${c.countryName})` }))]}
                />
              )}
            </FormField>
            {selectedCity && !currencyOverrideId && (
              <p className="text-caption text-text-muted">{t("createModal.resolvedCurrency", { code: selectedCity.currencyCode })}</p>
            )}
            {!selectedCity && selectedCountry && !currencyOverrideId && (
              <p className="text-caption text-text-muted">{t("createModal.resolvedCurrency", { code: selectedCountry.currencyCode })}</p>
            )}

            <FormField label={t("createModal.currencyOverride")} hint={t("createModal.currencyOverrideHint")}>
              {(field) => (
                <Select
                  {...field}
                  value={currencyOverrideId}
                  onValueChange={setCurrencyOverrideId}
                  options={[{ value: "", label: t("createModal.currencyOverrideNone") }, ...currencies.map((c) => ({ value: c.id, label: c.code }))]}
                />
              )}
            </FormField>

            <FormField label={t("createModal.address")} hint={t("createModal.addressHint")}>
              {(field) => <Input {...field} value={address} onChange={(e) => setAddress(e.target.value)} maxLength={200} />}
            </FormField>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField label={t("createModal.latitude")} hint={t("createModal.coordinatesHint")}>
                {(field) => <Input {...field} type="number" step="any" value={latitude} onChange={(e) => setLatitude(e.target.value)} />}
              </FormField>
              <FormField label={t("createModal.longitude")}>
                {(field) => <Input {...field} type="number" step="any" value={longitude} onChange={(e) => setLongitude(e.target.value)} />}
              </FormField>
            </div>

            <FormField label={t("createModal.timezone")} required hint={t("createModal.timezoneHint")}>
              {(field) => (
                <Select
                  {...field}
                  value={timezone}
                  onValueChange={(next) => {
                    setTimezone(next);
                    setTimezoneTouched(true);
                  }}
                  options={[
                    { value: "", label: t("createModal.timezoneSelectPlaceholder") },
                    ...timezoneOptions.map((tz) => ({ value: tz, label: tz })),
                  ]}
                />
              )}
            </FormField>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField label={t("createModal.phone")}>
                {(field) => <Input {...field} value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} />}
              </FormField>
              <FormField label={t("createModal.email")}>
                {(field) => <Input {...field} type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={200} />}
              </FormField>
            </div>

            <Checkbox label={t("createModal.is24h")} checked={is24h} onChange={(e) => setIs24h(e.target.checked)} />
            {!is24h && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormField label={t("createModal.openingTime")}>
                  {(field) => <Input {...field} type="time" value={openingTime} onChange={(e) => setOpeningTime(e.target.value)} />}
                </FormField>
                <FormField label={t("createModal.closingTime")}>
                  {(field) => <Input {...field} type="time" value={closingTime} onChange={(e) => setClosingTime(e.target.value)} />}
                </FormField>
              </div>
            )}

            <FormField label={t("createModal.closedWeekdays")} hint={t("createModal.closedWeekdaysHint")}>
              {() => (
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                    <label
                      key={day}
                      className={cn(
                        "flex cursor-pointer items-center gap-1.5 rounded-pill border px-3 py-1.5 text-body-sm",
                        closedWeekdays.includes(day) ? "border-primary bg-primary/10 text-primary" : "border-border-subtle text-text-muted"
                      )}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={closedWeekdays.includes(day)}
                        onChange={(e) =>
                          setClosedWeekdays((days) => (e.target.checked ? [...days, day] : days.filter((d) => d !== day)))
                        }
                      />
                      {t(`createModal.weekdayShort.${day}`)}
                    </label>
                  ))}
                </div>
              )}
            </FormField>

            <FormField label={t("createModal.notes")} hint={t("createModal.notesHint")}>
              {(field) => <Input {...field} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} />}
            </FormField>
          </section>

          {!isEdit && (
            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-body-md font-semibold text-text">{t("createModal.sections.tanks")}</h4>
                  <p className="text-caption text-text-muted">{t("createModal.tanksHint")}</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => setTanks((rows) => [...rows, createEmptyTankFieldsState(fuelProducts)])}>
                  <Plus className="size-4" aria-hidden />
                  {t("createModal.addTank")}
                </Button>
              </div>

              {tanks.length === 0 && <p className="text-body-sm text-text-muted">{t("createModal.noTanks")}</p>}

              {tanks.map((tk, index) => (
                <div key={index} className="rounded-card border border-border p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h5 className="text-body-sm font-semibold text-text">{t("createModal.tankTitle", { number: index + 1 })}</h5>
                    <button type="button" aria-label={t("createModal.removeTank")} onClick={() => setTanks((rows) => rows.filter((_, i) => i !== index))}>
                      <X className="size-4 text-text-muted" aria-hidden />
                    </button>
                  </div>
                  <TankFieldsSection
                    state={tk}
                    onChange={(next) => setTanks((rows) => rows.map((r, i) => (i === index ? next : r)))}
                    fuelProducts={fuelProducts}
                    existingTankNumbers={tankNumbersExcept(index)}
                  />
                </div>
              ))}
            </section>
          )}
        </div>
      </form>
    </Modal>
  );
}
