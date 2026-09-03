"use client";

import { Check, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { useOrganization } from "@/core/organization/OrganizationContext";
import { PageSpinner } from "@/shared/ui/Spinner";

import { useFuelCatalog } from "./_lib/useFuelCatalog";

const TABS = ["prix", "carburants", "seuils", "systeme", "orga", "roles"] as const;

/** Reproduit fidèlement l'onglet "Catalogue carburants" de pageConfiguration()
 * du prototype validé (prototype.html ~L6107) — le seul onglet dont les
 * champs correspondent tous à des colonnes réelles du modèle FuelProduct
 * (endpoint 1, déjà en production). Les 5 autres onglets restent
 * désactivés : "Prix carburant" nécessite le câblage frontend des
 * endpoints 14/15/16 (prochaine étape) ; "Seuils d'alerte"/"Configuration
 * réseau" du prototype sont des réglages globaux en pourcentage qui
 * n'existent pas au Niveau 1 (les seuils réels sont en mm, par cuve,
 * saisis à la création — endpoint 3) ; "Organisation"/"Rôles &
 * permissions" relèvent du Core Zylo Office, pas de ce module. Voir
 * docs/modules/zylo-liquid/phase-3-prototype-compatibility-matrix.md. */
export default function ConfigurationPage() {
  const t = useTranslations("zyloLiquid.configuration");
  const tCommon = useTranslations("common");
  const { currentOrganization } = useOrganization();
  const data = useFuelCatalog(currentOrganization?.id ?? null);
  const [tab, setTab] = useState<(typeof TABS)[number]>("carburants");
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

      {tab !== "carburants" ? (
        <div className="empty">
          <div className="e-t">{tCommon("states.comingSoon")}</div>
        </div>
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
