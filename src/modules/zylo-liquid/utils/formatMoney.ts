import type { useFormatter } from "next-intl";

/** Formatte un montant dans sa devise native, avec repli si `Intl` ne
 * connaît pas le code devise (ex. devise interne créée par l'organisation,
 * absente de la norme ISO 4217 supportée par le navigateur). */
export function formatMoney(format: ReturnType<typeof useFormatter>, value: number, currencyCode: string): string {
  try {
    return format.number(value, { style: "currency", currency: currencyCode, maximumFractionDigits: 0 });
  } catch {
    return `${format.number(Math.round(value))} ${currencyCode}`;
  }
}
