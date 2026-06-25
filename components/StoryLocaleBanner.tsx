"use client";

import { useLocale } from "@/lib/i18n/context";
import { isStoryAvailableInLocale } from "@/lib/i18n/locale";

export function StoryLocaleBanner({ caseId }: { caseId: string }) {
  const { locale, t } = useLocale();

  if (isStoryAvailableInLocale(caseId, locale)) return null;

  return (
    <div className="story-locale-banner" role="status">
      {t("common.storyLocaleBanner")}
    </div>
  );
}
