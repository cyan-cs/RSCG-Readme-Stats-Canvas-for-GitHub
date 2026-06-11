import { en, type TranslationKey } from "./en";
import { ja } from "./ja";
import { ko } from "./ko";
import { zh } from "./zh";

export type { TranslationKey } from "./en";

export type Locale = "en" | "ja" | "ko" | "zh";
export type SvgLocale = Locale | "zh-TW";

const dictionaries: Record<Locale, Record<TranslationKey, string>> = {
  en,
  ja,
  ko,
  zh,
};

export function resolveLocale(locale: string | null | undefined): Locale {
  const l = locale?.toLowerCase() || "";
  if (l.startsWith("ja")) return "ja";
  if (l.startsWith("ko")) return "ko";
  if (l.startsWith("zh")) return "zh";
  return "en";
}

export function resolveSvgLocale(locale: string | null | undefined): SvgLocale {
  const primaryLocale = locale?.split(",")[0]?.trim().toLowerCase() || "";
  if (
    primaryLocale.startsWith("zh-tw") ||
    primaryLocale.startsWith("zh-hk") ||
    primaryLocale.startsWith("zh-mo") ||
    primaryLocale.includes("hant")
  ) {
    return "zh-TW";
  }
  return resolveLocale(primaryLocale);
}

export function translate(locale: string, key: TranslationKey): string {
  const dictionary = dictionaries[resolveLocale(locale)];
  return dictionary[key];
}

export function formatTranslation(
  locale: string,
  key: TranslationKey,
  values: Record<string, string | number>,
): string {
  return translate(locale, key).replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(values, name)
      ? String(values[name])
      : match,
  );
}
