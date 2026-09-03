"use client";

import { Check, Plus } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";

import { useOrganization } from "@/core/organization/OrganizationContext";
import { PageSpinner } from "@/shared/ui/Spinner";

import { useFuelCatalog } from "./_lib/useFuelCatalog";
import { usePrices } from "./_lib/usePrices";

const TABS = ["prix", "carburants", "seuils", "systeme", "orga", "roles"] as const;
const REAL_TABS: (typeof TABS)[number][] = ["prix", "carburants"];

/** Reproduit fidèlement les onglets "Catalogue carburants" et "Prix
 * carburant" de pageConfiguration() du prototype validé (prototype.html
 * ~L6107) — les seuls dont les champs correspondent à des données réelles
 * (endpoints 1 et 15, déjà en production). Différence assumée pour "Prix" :
 * le prototype montre un prix unique par produit, appliqué au réseau
 * entier ; le modèle réel (`PriceHistory`) est par station + produit +
 * période, avec devise résolue par station — reproduire un prix "global"
 * inventerait une donnée qui n'existe pas. Le formulaire demande donc
 * explicitement la station, conforme au modèle réel.
 *
 * Les 4 autres onglets restent désactivés : "Seuils d'alerte"/
 * "Configuration réseau" du prototype sont des réglages globaux en
 * pourcentage qui n'existent pas au Niveau 1 (seuils réels en mm, par
 * cuve, saisis à la création — endpoint 3) ; "Organisation"/"Rôles &
 * permissions" relèvent du Core Zylo Office, pas de ce module. Voir
 * docs/modules/zylo-liquid/phase-3-prototype-compatibility-matrix.md. */
export default function ConfigurationPage() {
  const t = useTranslations("zyloLiquid.configuration");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const { currentOrganization } = useOrganization();
  const data = useFuelCatalog(currentOrganization?.id ?? null);
  const prices = usePrices(currentOrganization?.id ?? null);
  const [tab, setTab] = useState<(typeof TABS)[number]>("carburants");

  const [priceStationId, setPriceStationId] = useState("");
  const [priceProductId, setPriceProductId] = useState("");
  const [priceCurrencyId, setPriceCurrencyId] = useState("");
  const [priceAmount, setPriceAmount] = useState("");
  const [costAmount, setCostAmount] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(() => new Date().toISOString().slice(0, 16));
  const [priceReason, setPriceReason] = useState("");
  const [creatingPrice, setCreatingPrice] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);

  function formatMoney(value: number, currencyCode: string): string {
    try {
      return format.number(value, { style: "currency", currency: currencyCode, maximumFractionDigits: 2 });
    } catch {
      return `${format.number(value, { maximumFractionDigits: 2 })} ${currencyCode}`;
    }
  }

  async function handleCreatePrice() {
    if (!priceStationId || !priceProductId || !priceAmount) {
      setPriceError(t("fuelCatalog.codeRequired"));
      return;
    }
    setCreatingPrice(true);
    setPriceError(null);
    try {
      await prices.create({
        stationId: priceStationId,
        fuelProductId: priceProductId,
        priceAmount: Number(priceAmount),
        costAmount: costAmount ? Number(costAmount) : undefined,
        currencyId: priceCurrencyId || undefined,
        effectiveFrom: new Date(effectiveFrom).toISOString(),
        changeReason: priceReason.trim() || undefined,
      });
      setPriceAmount("");
      setCostAmount("");
      setPriceReason("");
    } catch (err) {
      setPriceError(err instanceof Error ? err.message : tCommon("states.error"));
    } finally {
      setCreatingPrice(false);
    }
  }
  const [savingId, setSavingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newDensity, setNewDensity] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newCost, setNewCost] = useState("");
  const [newColor, setNewColor] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleSave(id: string, form: HTMLFormElement) {
    setSavingId(id);
    setFormError(null);
    try {
      const fd = new FormData(form);
      await data.update(id, {
        name: String(fd.get("name") ?? ""),
        densityGPerCm3: fd.get("density") ? Number(fd.get("density")) : undefined,
        displayColor: String(fd.get("color") ?? "") || undefined,
      });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : tCommon("states.error"));
    } finally {
      setSavingId(null);
    }
  }

  async function handleToggleActive(id: string, active: boolean) {
    setSavingId(id);
    setFormError(null);
    try {
      await data.update(id, { active: !active });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : tCommon("states.error"));
    } finally {
      setSavingId(null);
    }
  }

  async function handleCreate() {
    if (!newName.trim() || !newCode.trim()) {
      setFormError(t("fuelCatalog.codeRequired"));
      return;
    }
    setCreating(true);
    setFormError(null);
    try {
      await data.create({
        name: newName.trim(),
        code: newCode.trim(),
        densityGPerCm3: newDensity ? Number(newDensity) : undefined,
        currentPriceFcfa: newPrice ? Number(newPrice) : undefined,
        currentCostFcfa: newCost ? Number(newCost) : undefined,
        displayColor: newColor.trim() || undefined,
      });
      setNewName("");
      setNewCode("");
      setNewDensity("");
      setNewPrice("");
      setNewCost("");
      setNewColor("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : tCommon("states.error"));
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <div className="page-head">
        <div className="ph-text">
          <h1>{t("pageTitle")}</h1>
          <div className="ph-sub">{t("pageSubtitle")}</div>
        </div>
      </div>

      <div className="tabs">
        {TABS.map((value) => (
          <button key={value} type="button" className={tab === value ? "on" : ""} onClick={() => setTab(value)}>
            {t(`tabs.${value}`)}
          </button>
        ))}
      </div>

      {!REAL_TABS.includes(tab) ? (
        <div className="empty">
          <div className="e-t">{tCommon("states.comingSoon")}</div>
        </div>
      ) : tab === "prix" ? (
        <>
          <div className="banner info">
            <div>{t("prices.banner")}</div>
          </div>

          {priceError && (
            <div className="banner crit">
              <div>{priceError}</div>
            </div>
          )}
          {prices.error && (
            <div className="banner crit">
              <div>{prices.error}</div>
            </div>
          )}

          <div className="card" style={{ marginBottom: 16 }}>
            <h2>{t("prices.addTitle")}</h2>
            <div className="ch-sub">{t("prices.addSubtitle")}</div>
            <div className="sep" />
            <div className="grid g3">
              <div className="field">
                <label className="f">{t("prices.station")}</label>
                <select className="f" value={priceStationId} onChange={(e) => setPriceStationId(e.target.value)}>
                  <option value="">{t("prices.selectStation")}</option>
                  {prices.stations.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="f">{t("prices.product")}</label>
                <select className="f" value={priceProductId} onChange={(e) => setPriceProductId(e.target.value)}>
                  <option value="">{t("prices.selectProduct")}</option>
                  {data.products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="f">{t("prices.currency")}</label>
                <select className="f" value={priceCurrencyId} onChange={(e) => setPriceCurrencyId(e.target.value)}>
                  <option value="">—</option>
                  {prices.currencies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="f">{t("prices.sellPrice")}</label>
                <input className="f" type="number" step="1" value={priceAmount} onChange={(e) => setPriceAmount(e.target.value)} />
              </div>
              <div className="field">
                <label className="f">{t("prices.costPrice")}</label>
                <input className="f" type="number" step="1" value={costAmount} onChange={(e) => setCostAmount(e.target.value)} />
              </div>
              <div className="field">
                <label className="f">{t("prices.effectiveFrom")}</label>
                <input className="f" type="datetime-local" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
              </div>
            </div>
            <div className="field">
              <label className="f">{t("prices.reason")}</label>
              <input className="f" value={priceReason} onChange={(e) => setPriceReason(e.target.value)} />
            </div>
            <button type="button" className="btn primary" onClick={handleCreatePrice} disabled={creatingPrice}>
              <Plus width={16} height={16} strokeWidth={1.8} aria-hidden />
              {t("prices.create")}
            </button>
          </div>

          {prices.loading ? (
            <PageSpinner label={tCommon("states.loading")} />
          ) : (
            <div className="card" style={{ padding: 0 }}>
              <div style={{ padding: 16 }} className="card-head">
                <div style={{ flex: 1 }}>
                  <h2>{t("prices.historyTitle")}</h2>
                  <div className="ch-sub">{t("prices.historySubtitle")}</div>
                </div>
              </div>
              {prices.prices.length === 0 ? (
                <div className="empty" style={{ margin: 16 }}>
                  <div className="e-t">{t("prices.empty")}</div>
                </div>
              ) : (
                <div className="tw" style={{ border: "none" }}>
                  <table className="t">
                    <thead>
                      <tr>
                        <th>{t("prices.columns.station")}</th>
                        <th>{t("prices.columns.product")}</th>
                        <th className="r">{t("prices.columns.price")}</th>
                        <th className="r">{t("prices.columns.cost")}</th>
                        <th className="r">{t("prices.columns.margin")}</th>
                        <th>{t("prices.columns.effectiveFrom")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prices.prices.map((entry) => {
                        const station = prices.stations.find((s) => s.id === entry.stationId);
                        const product = data.products.find((p) => p.id === entry.fuelProductId);
                        const currency = prices.currencies.find((c) => c.id === entry.currencyId);
                        const code = currency?.code ?? "";
                        return (
                          <tr key={entry.id}>
                            <td>{station?.name ?? "—"}</td>
                            <td>{product?.name ?? "—"}</td>
                            <td className="r mono">{formatMoney(entry.priceAmount, code)}</td>
                            <td className="r mono">{entry.costAmount === null ? "—" : formatMoney(entry.costAmount, code)}</td>
                            <td className="r mono">{entry.costAmount === null ? "—" : formatMoney(entry.priceAmount - entry.costAmount, code)}</td>
                            <td>
                              {format.dateTime(new Date(entry.effectiveFrom), { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                              {entry.isFuture && (
                                <span className="badge b-pending" style={{ marginLeft: 6 }}>
                                  <span className="dot" />
                                  {t("prices.columns.future")}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="banner info">
            <div>{t("fuelCatalog.banner")}</div>
          </div>

          {formError && (
            <div className="banner crit">
              <div>{formError}</div>
            </div>
          )}

          {data.error && (
            <div className="banner crit">
              <div>{data.error}</div>
            </div>
          )}

          {data.loading ? (
            <PageSpinner label={tCommon("states.loading")} />
          ) : (
            <div className="card" style={{ marginBottom: 16 }}>
              <h2>{t("fuelCatalog.title")}</h2>
              <div className="sep" />
              <div className="grid g3">
                {data.products.map((product) => (
                  <form
                    key={product.id}
                    className="card"
                    style={{ background: "var(--surface-2)" }}
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSave(product.id, e.currentTarget);
                    }}
                  >
                    <div className="row" style={{ justifyContent: "space-between" }}>
                      <span className="strong">{product.name}</span>
                      <span className={`badge ${product.active ? "b-ok" : "b-idle"}`}>
                        <span className="dot" />
                        {product.active ? t("fuelCatalog.statusActive") : t("fuelCatalog.statusInactive")}
                      </span>
                    </div>
                    <div className="field" style={{ marginTop: 10 }}>
                      <label className="f">{t("fuelCatalog.name")}</label>
                      <input className="f" name="name" defaultValue={product.name} />
                    </div>
                    <div className="field">
                      <label className="f">{t("fuelCatalog.code")}</label>
                      <input className="f" value={product.code} disabled />
                      <div className="hint">{t("fuelCatalog.codeHint")}</div>
                    </div>
                    <div className="field">
                      <label className="f">{t("fuelCatalog.density")}</label>
                      <input className="f" name="density" type="number" step="0.0001" defaultValue={product.densityGPerCm3 ?? ""} />
                    </div>
                    <div className="field">
                      <label className="f">{t("fuelCatalog.color")}</label>
                      <input className="f" name="color" defaultValue={product.displayColor ?? ""} maxLength={7} />
                    </div>
                    <dl className="kv2">
                      <dt>{t("fuelCatalog.currentPrice")}</dt>
                      <dd className="mono">{product.currentPriceFcfa === null ? "—" : `${product.currentPriceFcfa} FCFA/L`}</dd>
                    </dl>
                    <button type="submit" className="btn sm" style={{ width: "100%" }} disabled={savingId === product.id}>
                      <Check width={14} height={14} strokeWidth={1.8} aria-hidden />
                      {t("fuelCatalog.save")}
                    </button>
                    <button
                      type="button"
                      className="btn sm"
                      style={{ width: "100%", marginTop: 6 }}
                      disabled={savingId === product.id}
                      onClick={() => handleToggleActive(product.id, product.active)}
                    >
                      {product.active ? t("fuelCatalog.deactivate") : t("fuelCatalog.reactivate")}
                    </button>
                  </form>
                ))}
              </div>
            </div>
          )}

          <div className="card">
            <h2>{t("fuelCatalog.addTitle")}</h2>
            <div className="ch-sub">{t("fuelCatalog.addSubtitle")}</div>
            <div className="sep" />
            <div className="grid g3">
              <div className="field">
                <label className="f">{t("fuelCatalog.name")}</label>
                <input className="f" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={t("fuelCatalog.namePlaceholder")} />
              </div>
              <div className="field">
                <label className="f">{t("fuelCatalog.code")}</label>
                <input className="f" value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder={t("fuelCatalog.codePlaceholder")} maxLength={10} />
              </div>
              <div className="field">
                <label className="f">{t("fuelCatalog.density")}</label>
                <input className="f" type="number" step="0.0001" value={newDensity} onChange={(e) => setNewDensity(e.target.value)} placeholder="0.8400" />
              </div>
              <div className="field">
                <label className="f">{t("fuelCatalog.sellPrice")}</label>
                <input className="f" type="number" step="1" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} />
              </div>
              <div className="field">
                <label className="f">{t("fuelCatalog.costPrice")}</label>
                <input className="f" type="number" step="1" value={newCost} onChange={(e) => setNewCost(e.target.value)} />
              </div>
              <div className="field">
                <label className="f">{t("fuelCatalog.color")}</label>
                <input className="f" value={newColor} onChange={(e) => setNewColor(e.target.value)} placeholder="#1D4ED8" maxLength={7} />
              </div>
            </div>
            <button type="button" className="btn primary" onClick={handleCreate} disabled={creating}>
              <Plus width={16} height={16} strokeWidth={1.8} aria-hidden />
              {t("fuelCatalog.create")}
            </button>
          </div>
        </>
      )}
    </>
  );
}
