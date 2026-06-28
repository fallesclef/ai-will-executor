"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import type { CaseMeta } from "@/types/story";
import {
  getLocalPlayerEmail,
  registerPlayer,
  setLocalPlayerEmail,
} from "@/lib/player/client";
import {
  hasCompletedRequiredCases,
  computeResonanceLevel,
  getResonanceTierLevel,
} from "@/lib/resonance";
import {
  getExecutorName,
  hasExecutorName,
  personalizeNarrative,
} from "@/lib/executor-identity";
import { ExecutorNameForm } from "@/components/ExecutorNameForm";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { HowToPlay } from "@/components/HowToPlay";
import { ChangelogPanel } from "@/components/ChangelogPanel";
import { useLocale } from "@/lib/i18n/context";
import { listCases } from "@/data/cases";
import { isStoryAvailableInLocale } from "@/lib/i18n/locale";
import { resonanceTierLabel } from "@/lib/i18n/resonance-ui";
import { trackEmailRegister } from "@/lib/analytics/events";

export function CaseLobby() {
  const { locale, t } = useLocale();
  const cases = listCases(locale);
  const [email, setEmail] = useState(getLocalPlayerEmail() ?? "");
  const [status, setStatus] = useState<string | null>(null);
  const [seasonReady, setSeasonReady] = useState(false);
  const [resonanceTier, setResonanceTier] = useState(0);
  const [, bumpName] = useState(0);

  useEffect(() => {
    setSeasonReady(
      hasCompletedRequiredCases([
        "case-d047",
        "case-d082",
        "case-d119",
        "case-d144",
        "case-d173",
        "case-d206",
        "case-d301",
      ])
    );
    setResonanceTier(getResonanceTierLevel());
  }, []);

  const handleRegister = async () => {
    const result = await registerPlayer(
      email || undefined,
      hasExecutorName() ? getExecutorName() : undefined
    );
    if (result.email) setLocalPlayerEmail(result.email);
    trackEmailRegister(!!result.email);
    setStatus(
      result.email
        ? t("lobby.linkedAccount", { email: result.email })
        : t("lobby.anonymousIdentity")
    );
  };

  return (
    <div className="lobby">
      <header className="lobby__header">
        <div className="lobby__header-top">
          <span className="lobby__sys">{t("common.sys")}</span>
          <LanguageSwitcher />
        </div>
        <h1 className="lobby__title">{t("lobby.title")}</h1>
        <p className="lobby__subtitle">{t("lobby.subtitle")}</p>
      </header>

      <ChangelogPanel />
      <HowToPlay />

      <section className="lobby__account">
        <h2 className="lobby__section-title">{t("lobby.accountTitle")}</h2>
        <p className="lobby__hint">{t("lobby.accountHint")}</p>
        <div className="lobby__account-row">
          <input
            type="email"
            className="lobby__input"
            placeholder={t("lobby.emailPlaceholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="button" className="choice-btn" onClick={handleRegister}>
            <span className="choice-btn__marker">{">"}</span>
            {t("lobby.register")}
          </button>
        </div>
        {status && <p className="lobby__status">{status}</p>}
        <ExecutorNameForm
          onSaved={() => {
            bumpName((n) => n + 1);
          }}
        />
      </section>

      <section className="lobby__cases">
        <h2 className="lobby__section-title">{t("lobby.casesTitle")}</h2>
        {resonanceTier >= 1 && (() => {
          const level = computeResonanceLevel();
          return (
            <div className="lobby__resonance-banner">
              <span className="lobby__resonance-tag">RESONANCE</span>
              <span>
                {t("lobby.resonance", {
                  percent: level.percent,
                  tier: resonanceTierLabel(level.tierLevel, t),
                })}
              </span>
            </div>
          );
        })()}
        <div className="lobby__grid">
          {cases.map((c) => {
            const locked =
              c.requiresCompletedCases?.length &&
              !hasCompletedRequiredCases(c.requiresCompletedCases);
            const storyReady = isStoryAvailableInLocale(c.id, locale);
            return (
              <article key={c.id} className="lobby__card">
                <div className="lobby__card-head">
                  <span className="lobby__case-id">{c.caseNumber}</span>
                  {c.status === "coming_soon" && (
                    <span className="lobby__badge">{t("lobby.comingSoon")}</span>
                  )}
                  {!storyReady && c.status === "available" && (
                    <span className="lobby__badge lobby__badge--locale">
                      {t("lobby.storyEnSoon")}
                    </span>
                  )}
                </div>
                <h3 className="lobby__card-title">{c.subtitle}</h3>
                {c.description && (
                  <p className="lobby__card-desc">
                    {locale === "zh-TW"
                      ? personalizeNarrative(c.description)
                      : c.description}
                  </p>
                )}
                {c.id === "case-d399" && !seasonReady && (
                  <p className="lobby__card-hint">{t("lobby.d399Hint")}</p>
                )}
                {locked ? (
                  <span className="lobby__play-btn lobby__play-btn--disabled">
                    {t("lobby.lockedPrereq")}
                  </span>
                ) : !hasExecutorName() ? (
                  <span className="lobby__play-btn lobby__play-btn--disabled">
                    {t("lobby.needExecutorName")}
                  </span>
                ) : c.status === "available" ? (
                  <Link href={`/case/${c.id}`} className="lobby__play-btn">
                    {t("lobby.acceptCase")}
                  </Link>
                ) : (
                  <span className="lobby__play-btn lobby__play-btn--disabled">
                    {t("lobby.notAvailable")}
                  </span>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <footer className="lobby__footer">
        <span>{t("common.footer")}</span>
      </footer>
    </div>
  );
}
