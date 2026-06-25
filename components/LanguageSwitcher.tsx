"use client";

import { useLocale } from "@/lib/i18n/context";
import type { Locale } from "@/lib/i18n/types";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { locale, setLocale, t } = useLocale();

  return (
    <div
      className={`lang-switcher ${className}`.trim()}
      role="group"
      aria-label={t("language.switchLabel")}
    >
      {(["zh-TW", "en"] as Locale[]).map((code) => (
        <button
          key={code}
          type="button"
          className={`lang-switcher__btn${locale === code ? " lang-switcher__btn--active" : ""}`}
          onClick={() => setLocale(code)}
          aria-pressed={locale === code}
        >
          {code === "zh-TW" ? t("language.zhTW") : t("language.en")}
        </button>
      ))}
    </div>
  );
}
