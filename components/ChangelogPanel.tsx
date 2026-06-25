"use client";

import { useEffect, useState } from "react";
import {
  CHANGELOG,
  getLatestChangelogVersion,
  type ChangelogItemType,
  type ChangelogRelease,
} from "@/data/changelog";
import {
  getSeenChangelogVersion,
  hasUnreadChangelog,
  markChangelogSeen,
} from "@/lib/changelog/client";
import { useLocale } from "@/lib/i18n/context";

function formatReleaseDate(date: string, locale: string): string {
  try {
    return new Date(date).toLocaleDateString(
      locale === "en" ? "en-US" : "zh-TW",
      { year: "numeric", month: "short", day: "numeric" }
    );
  } catch {
    return date;
  }
}

function ReleaseBlock({
  release,
  locale,
  typeLabel,
}: {
  release: ChangelogRelease;
  locale: string;
  typeLabel: (type: ChangelogItemType) => string;
}) {
  return (
    <article className="changelog-release">
      <header className="changelog-release__head">
        <span className="changelog-release__version">v{release.version}</span>
        <time className="changelog-release__date" dateTime={release.date}>
          {formatReleaseDate(release.date, locale)}
        </time>
      </header>
      <ul className="changelog-release__list">
        {release.items.map((item, i) => (
          <li key={i} className={`changelog-item changelog-item--${item.type}`}>
            <span className="changelog-item__type">{typeLabel(item.type)}</span>
            <span className="changelog-item__text">
              {locale === "en" ? item.en : item.zh}
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}

export function ChangelogPanel() {
  const { locale, t } = useLocale();
  const latestVersion = getLatestChangelogVersion();
  const [unread, setUnread] = useState(false);
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    setUnread(hasUnreadChangelog(latestVersion));
  }, [latestVersion]);

  const typeLabel = (type: ChangelogItemType) => {
    const map = {
      feature: t("changelog.typeFeature"),
      fix: t("changelog.typeFix"),
      improvement: t("changelog.typeImprovement"),
    };
    return map[type];
  };

  const handleOpen = () => {
    setOpen(true);
    markChangelogSeen(latestVersion);
    setUnread(false);
  };

  const handleDismiss = () => {
    markChangelogSeen(latestVersion);
    setUnread(false);
  };

  if (!hydrated) {
    return (
      <div className="changelog-toolbar">
        <button
          type="button"
          className="changelog-toolbar__btn"
          onClick={() => setOpen(true)}
        >
          <span className="changelog-toolbar__icon">▣</span>
          {t("changelog.title")}
        </button>
      </div>
    );
  }

  const latestRelease = CHANGELOG[0];

  return (
    <>
      {unread && latestRelease && (
        <aside className="changelog-announce" role="status">
          <div className="changelog-announce__body">
            <span className="changelog-announce__tag">
              {t("changelog.newUpdate")}
            </span>
            <p className="changelog-announce__summary">
              {t("changelog.announceSummary", { version: latestVersion })}
            </p>
            <ul className="changelog-announce__preview">
              {latestRelease.items.slice(0, 2).map((item, i) => (
                <li key={i}>
                  {locale === "en" ? item.en : item.zh}
                </li>
              ))}
            </ul>
          </div>
          <div className="changelog-announce__actions">
            <button
              type="button"
              className="changelog-announce__btn changelog-announce__btn--primary"
              onClick={handleOpen}
            >
              {t("changelog.viewAll")}
            </button>
            <button
              type="button"
              className="changelog-announce__btn"
              onClick={handleDismiss}
            >
              {t("changelog.dismiss")}
            </button>
          </div>
        </aside>
      )}

      <div className="changelog-toolbar">
        <button
          type="button"
          className={`changelog-toolbar__btn${unread ? " changelog-toolbar__btn--unread" : ""}`}
          onClick={handleOpen}
          aria-label={t("changelog.title")}
        >
          <span className="changelog-toolbar__icon">▣</span>
          {t("changelog.title")}
          {unread && <span className="changelog-toolbar__dot" aria-hidden />}
        </button>
        {getSeenChangelogVersion() && (
          <span className="changelog-toolbar__seen">
            {t("changelog.lastSeen", { version: getSeenChangelogVersion()! })}
          </span>
        )}
      </div>

      {open && (
        <div
          className="changelog-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="changelog-modal-title"
        >
          <div
            className="changelog-modal__backdrop"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="changelog-modal__panel">
            <header className="changelog-modal__header">
              <h2 id="changelog-modal-title" className="changelog-modal__title">
                {t("changelog.title")}
              </h2>
              <button
                type="button"
                className="changelog-modal__close"
                onClick={() => setOpen(false)}
                aria-label={t("changelog.close")}
              >
                ×
              </button>
            </header>
            <div className="changelog-modal__body">
              {CHANGELOG.map((release) => (
                <ReleaseBlock
                  key={release.version}
                  release={release}
                  locale={locale}
                  typeLabel={typeLabel}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
