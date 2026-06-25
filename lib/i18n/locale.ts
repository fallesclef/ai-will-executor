import type { Locale } from "./types";
import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY } from "./types";

export function detectDeviceLocale(): Locale {
  if (typeof navigator === "undefined") return DEFAULT_LOCALE;

  const candidates = [
    ...navigator.languages,
    navigator.language,
  ].filter(Boolean) as string[];

  for (const raw of candidates) {
    const lang = raw.toLowerCase();
    if (lang.startsWith("zh")) return "zh-TW";
  }

  return "en";
}

export function readStoredLocale(): Locale | null {
  if (typeof window === "undefined") return null;
  const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
  if (saved === "zh-TW" || saved === "en") return saved;
  return null;
}

export function resolveInitialLocale(): Locale {
  return readStoredLocale() ?? detectDeviceLocale();
}

export function persistLocale(locale: Locale): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  document.documentElement.lang = locale;
}

/** Phase 1: narrative bundles ship per-case later; only zh-TW is complete. */
export function isStoryAvailableInLocale(
  _caseId: string,
  locale: Locale
): boolean {
  return locale === "zh-TW";
}
