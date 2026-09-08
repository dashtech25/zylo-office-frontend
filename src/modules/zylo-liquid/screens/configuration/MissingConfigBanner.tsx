"use client";

import { AlertTriangle, MapPinOff } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button, Card } from "@/shared/ui";

export interface MissingConfigItem {
  key: "sellPrice" | "costPrice" | "geo";
  count: number;
  onFix: () => void;
}

/** Bandeau de configuration manquante (page_configuration.md §22) —
 * purement présentationnel : le calcul des stations concernées reste dans
 * l'écran, ce composant ne fait qu'afficher des compteurs déjà calculés et
 * déclencher l'action fournie par l'appelant. N'apparaît pas du tout si
 * tout est configuré (aucun panneau vide affiché "pour rassurer"). */
export function MissingConfigBanner({ items }: { items: MissingConfigItem[] }) {
  const t = useTranslations("zyloLiquid.configuration.summary");
  const visible = items.filter((i) => i.count > 0);
  if (visible.length === 0) return null;

  return (
    <Card className="border-l-4 border-l-warning">
      <div className="flex flex-col gap-3">
        {visible.map((item) => (
          <div key={item.key} className="flex flex-wrap items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-body-sm text-text">
              {item.key === "geo" ? <MapPinOff className="size-4 shrink-0 text-warning" aria-hidden /> : <AlertTriangle className="size-4 shrink-0 text-warning" aria-hidden />}
              {t(`${item.key}Message`, { count: item.count })}
            </span>
            <Button variant="outline" size="sm" onClick={item.onFix}>
              {t("fix")}
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}
