"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { locales, localeCookieName, type Locale } from "./config";
import { cn } from "@/shared/lib/cn";

/** Sélecteur de langue minimal — sert aussi de vérification manuelle que
 * l'i18n s'applique réellement (pas de routing par préfixe de locale, la
 * langue est stockée en cookie et relue au prochain rendu serveur). */
export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function setLocale(next: Locale) {
    document.cookie = `${localeCookieName}=${next}; path=/; max-age=31536000`;
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-1 text-body-sm" aria-label="Langue">
      {locales.map((value) => (
        <button
          key={value}
          type="button"
          disabled={isPending}
          onClick={() => setLocale(value)}
          aria-pressed={locale === value}
          className={cn(
            "rounded-button px-2 py-1 uppercase transition-colors",
            locale === value
              ? "bg-primary-muted text-primary font-semibold"
              : "text-text-muted hover:bg-surface-muted"
          )}
        >
          {value}
        </button>
      ))}
    </div>
  );
}
