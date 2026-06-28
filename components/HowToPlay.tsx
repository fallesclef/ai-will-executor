"use client";

import { useLocale } from "@/lib/i18n/context";

const STEP_KEYS = [
  "howToPlay.step1",
  "howToPlay.step2",
  "howToPlay.step3",
  "howToPlay.step4",
  "howToPlay.step5",
  "howToPlay.step6",
  "howToPlay.step7",
] as const;

export function HowToPlay() {
  const { t } = useLocale();

  return (
    <section className="how-to-play" aria-labelledby="how-to-play-title">
      <div className="how-to-play__head">
        <span className="how-to-play__tag">{t("howToPlay.tag")}</span>
        <h2 id="how-to-play-title" className="how-to-play__title">
          {t("howToPlay.title")}
        </h2>
        <p className="how-to-play__intro">{t("howToPlay.intro")}</p>
      </div>
      <ol className="how-to-play__steps">
        {STEP_KEYS.map((key, i) => (
          <li key={key} className="how-to-play__step">
            <span className="how-to-play__step-num">{i + 1}</span>
            <span className="how-to-play__step-text">{t(key)}</span>
          </li>
        ))}
      </ol>
      <p className="how-to-play__tip">{t("howToPlay.tip")}</p>
    </section>
  );
}
