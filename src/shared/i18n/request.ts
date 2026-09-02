import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { defaultLocale, isLocale, localeCookieName } from "./config";

const namespaces = ["common", "navigation", "auth", "dashboard", "applications", "organizations", "zyloLiquid"] as const;

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(localeCookieName)?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : defaultLocale;

  const messages = Object.fromEntries(
    await Promise.all(
      namespaces.map(async (namespace) => [
        namespace,
        (await import(`../../locales/${locale}/${namespace}.json`)).default,
      ])
    )
  );

  return { locale, messages };
});
