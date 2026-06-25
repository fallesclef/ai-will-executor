"use client";

import type { PlayerState, Story, StatKey } from "@/types/story";
import { getFlowStepStatus } from "@/lib/engine";
import { computeMirrorSyncPercent } from "@/lib/season-history";
import {
  computeElectionHoursRemaining,
  shouldShowResonanceDormant,
  shouldShowResonancePanel,
} from "@/lib/resonance";
import { ResonancePanel, ResonancePanelDormant } from "@/components/ResonancePanel";
import { useLocale } from "@/lib/i18n/context";

interface StatusPanelProps {
  state: PlayerState;
  story: Story;
}

const CORE_STATS: StatKey[] = ["legal", "empathy", "suspicion"];
const PUBLIC_STATS: StatKey[] = [
  "public_trust",
  "social_stability",
  "truth_pressure",
];

export function StatusPanel({ state, story }: StatusPanelProps) {
  const { t } = useLocale();
  const { flow } = story;
  const stepStatus = getFlowStepStatus(state, story);
  const completedSteps = flow.flowSteps.filter((s) => stepStatus[s.id]).length;
  const verdictReady = stepStatus.verdict || state.phase === "verdict";
  const mirrorSync = flow.mirrorStatsEnabled
    ? computeMirrorSyncPercent(state.stats.mirror_integrity)
    : null;
  const electionHours = flow.electionCountdown
    ? computeElectionHoursRemaining(state, story)
    : null;

  return (
    <aside className="status-panel">
      <div className="status-panel__header">
        <span className="status-panel__tag">SYS</span>
        <h2 className="status-panel__title">{t("status.title")}</h2>
      </div>

      <div className="status-panel__case">
        <span className="status-panel__case-id">{story.caseNumber}</span>
        <span className="status-panel__case-name">{story.subtitle}</span>
      </div>

      <div className="status-panel__progress">
        <div className="status-panel__progress-label">
          <span>{t("status.mainProgress")}</span>
          <span>
            {completedSteps} / {flow.flowSteps.length}
          </span>
        </div>
        <div className="status-panel__progress-bar">
          <div
            className="status-panel__progress-fill"
            style={{
              width: `${Math.min(100, (completedSteps / flow.flowSteps.length) * 100)}%`,
            }}
          />
        </div>
        {verdictReady ? (
          <span className="status-panel__ready">{t("status.verdictReady")}</span>
        ) : (
          <span className="status-panel__pending">
            {t("status.verdictPending")}
          </span>
        )}
      </div>

      <div className="status-panel__flow">
        <h3 className="status-panel__flow-title">{t("status.flowNodes")}</h3>
        <ul className="status-panel__flow-list">
          {flow.flowSteps.map((step) => (
            <li
              key={step.id}
              className={`status-panel__flow-item${stepStatus[step.id] ? " status-panel__flow-item--done" : ""}`}
            >
              <span className="status-panel__flow-marker">
                {stepStatus[step.id] ? "✓" : "·"}
              </span>
              {step.label}
            </li>
          ))}
        </ul>
      </div>

      {mirrorSync !== null && (
        <div className="status-panel__countdown">
          <h3 className="status-panel__flow-title">{t("status.mirrorSync")}</h3>
          <p className="status-panel__countdown-value">
            {t("status.syncRate", { percent: mirrorSync })}
          </p>
        </div>
      )}

      {flow.electionCountdown && electionHours !== null && (
        <div className="status-panel__countdown">
          <h3 className="status-panel__flow-title">
            {flow.electionCountdown.label}
          </h3>
          <p className="status-panel__countdown-value">
            {t("status.electionRemaining", { hours: electionHours })}
          </p>
          <p className="status-panel__countdown-hint">
            {t("status.electionHint")}
          </p>
        </div>
      )}

      {flow.resonanceEnabled && shouldShowResonancePanel(story, state) && (
        <ResonancePanel state={state} story={story} compact />
      )}

      {flow.resonanceEnabled && shouldShowResonanceDormant(story, state) && (
        <ResonancePanelDormant />
      )}

      <div className="status-panel__stats">
        <h3 className="status-panel__stats-title">{t("status.hiddenStats")}</h3>
        {CORE_STATS.map((key) => (
          <div key={key} className="stat-row">
            <span className="stat-row__label">{t(`stats.${key}`)}</span>
            <div className="stat-row__bar">
              <div
                className={`stat-row__fill stat-row__fill--${key}`}
                style={{
                  width: `${Math.min(100, Math.max(0, (state.stats[key] + 5) * 8))}%`,
                }}
              />
            </div>
            <span className="stat-row__hint">
              {state.stats[key] > 0 ? "+" : ""}
              {state.stats[key]}
            </span>
          </div>
        ))}
        {flow.mirrorStatsEnabled && (
          <>
            <h3 className="status-panel__stats-title status-panel__stats-title--mirror">
              {t("status.mirrorIntegrity")}
            </h3>
            <div className="stat-row">
              <span className="stat-row__label">
                {t("stats.mirror_integrity")}
              </span>
              <div className="stat-row__bar">
                <div
                  className="stat-row__fill stat-row__fill--mirror_integrity"
                  style={{
                    width: `${Math.min(100, Math.max(0, (state.stats.mirror_integrity + 5) * 8))}%`,
                  }}
                />
              </div>
              <span className="stat-row__hint">
                {state.stats.mirror_integrity > 0 ? "+" : ""}
                {state.stats.mirror_integrity}
              </span>
            </div>
          </>
        )}
        {flow.publicStatsEnabled && (
          <>
            <h3 className="status-panel__stats-title status-panel__stats-title--public">
              {t("status.publicPressure")}
            </h3>
            {PUBLIC_STATS.map((key) => (
              <div key={key} className="stat-row">
                <span className="stat-row__label">{t(`stats.${key}`)}</span>
                <div className="stat-row__bar">
                  <div
                    className={`stat-row__fill stat-row__fill--${key}`}
                    style={{
                      width: `${Math.min(100, Math.max(0, (state.stats[key] + 5) * 8))}%`,
                    }}
                  />
                </div>
                <span className="stat-row__hint">
                  {state.stats[key] > 0 ? "+" : ""}
                  {state.stats[key]}
                </span>
              </div>
            ))}
          </>
        )}
        <p className="status-panel__stats-note">{t("status.statsNote")}</p>
      </div>

      <div className="status-panel__log">
        <h3 className="status-panel__log-title">{t("status.choiceLog")}</h3>
        {state.choiceHistory.length === 0 ? (
          <p className="status-panel__log-empty">{t("status.noLog")}</p>
        ) : (
          <ul className="status-panel__log-list">
            {state.choiceHistory.map((id, i) => (
              <li key={`${id}-${i}`} className="status-panel__log-item">
                [{String(i + 1).padStart(2, "0")}] {id}
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
