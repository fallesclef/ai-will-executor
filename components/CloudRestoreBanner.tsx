"use client";

import { useLocale } from "@/lib/i18n/context";
import type { RestoreCandidate } from "@/lib/progress/restore";

interface CloudRestoreBannerProps {
  candidates: RestoreCandidate[];
  onRestore: () => void;
  onDismiss: () => void;
}

export function CloudRestoreBanner({
  candidates,
  onRestore,
  onDismiss,
}: CloudRestoreBannerProps) {
  const { t } = useLocale();

  const completed = candidates.filter(
    (c) => c.cloud.verdictChoiceId || c.cloud.phase === "ending"
  ).length;
  const inProgress = candidates.length - completed;

  return (
    <aside className="cloud-restore" role="dialog" aria-labelledby="cloud-restore-title">
      <div className="cloud-restore__body">
        <span className="cloud-restore__tag">{t("cloudRestore.tag")}</span>
        <h2 id="cloud-restore-title" className="cloud-restore__title">
          {t("cloudRestore.title")}
        </h2>
        <p className="cloud-restore__summary">
          {t("cloudRestore.summary", {
            total: candidates.length,
            completed,
            inProgress,
          })}
        </p>
        <ul className="cloud-restore__list">
          {candidates.slice(0, 4).map((c) => (
            <li key={c.storyId}>
              {t(
                c.cloud.verdictChoiceId || c.cloud.phase === "ending"
                  ? "cloudRestore.itemCompleted"
                  : "cloudRestore.itemInProgress",
                { caseId: c.storyId.replace("case-", "").toUpperCase() }
              )}
            </li>
          ))}
          {candidates.length > 4 && (
            <li>{t("cloudRestore.more", { count: candidates.length - 4 })}</li>
          )}
        </ul>
      </div>
      <div className="cloud-restore__actions">
        <button
          type="button"
          className="cloud-restore__btn cloud-restore__btn--primary"
          onClick={onRestore}
        >
          {t("cloudRestore.confirm")}
        </button>
        <button
          type="button"
          className="cloud-restore__btn"
          onClick={onDismiss}
        >
          {t("cloudRestore.dismiss")}
        </button>
      </div>
    </aside>
  );
}
