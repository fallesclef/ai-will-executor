"use client";

import { NavButton } from "@/components/ChoiceButton";
import type { PlayerState, Story } from "@/types/story";
import {
  canAccessContradictions,
  getNextCrossroadNode,
  hasCompletedCrossroads,
  isNodeChoicePending,
} from "@/lib/engine";
import { personalizeNarrative } from "@/lib/executor-identity";
import { useLocale } from "@/lib/i18n/context";

interface CaseDashboardProps {
  story: Story;
  state: PlayerState;
  onNavigate: (nodeId: string) => void;
  onVerdict: () => void;
  canVerdict: boolean;
}

export function CaseDashboard({
  story,
  state,
  onNavigate,
  onVerdict,
  canVerdict,
}: CaseDashboardProps) {
  const { t } = useLocale();
  const { flow } = story;
  const contradictionsReady = canAccessContradictions(state, story);
  const nextCrossroad = getNextCrossroadNode(state, story);
  const crossroadsDone = hasCompletedCrossroads(state, story);

  return (
    <div className="dashboard">
      <div className="dashboard__intro">
        {(flow.dashboardIntro ?? []).map((line, i) => (
          <p key={i} className={i > 0 ? "dashboard__hint" : undefined}>
            {personalizeNarrative(line)}
          </p>
        ))}
      </div>

      {flow.consoleSections.map((section) => {
        const isContradiction = section.id === "contradiction";
        const requiresLocked = section.requiresViewed?.length
          ? !section.requiresViewed.every((id) =>
              state.viewedNodes.includes(id)
            )
          : false;
        const locked =
          (isContradiction && !contradictionsReady) || requiresLocked;

        return (
          <section key={section.id} className="dashboard__section">
            <h3 className="dashboard__section-title">
              <span className="dashboard__section-tag">
                {flow.categoryLabels[section.id] ?? section.label}
              </span>
              {locked && (
                <span className="dashboard__lock-tag">
                  {t("dashboard.prereqLock")}
                </span>
              )}
            </h3>
            <div className="dashboard__grid">
              {section.nodes.map((nodeId) => {
                const viewed = state.viewedNodes.includes(nodeId);
                const pendingChoice = isNodeChoicePending(state, story, nodeId);
                const info = flow.nodeLabels[nodeId] ?? {
                  label: nodeId,
                  sub: "",
                };
                return (
                  <NavButton
                    key={nodeId}
                    label={personalizeNarrative(info.label)}
                    subtitle={personalizeNarrative(info.sub)}
                    viewed={viewed}
                    pendingChoice={pendingChoice}
                    disabled={locked}
                    onClick={() => onNavigate(nodeId)}
                  />
                );
              })}
            </div>
          </section>
        );
      })}

      <section className="dashboard__section">
        <h3 className="dashboard__section-title">
          <span className="dashboard__section-tag dashboard__section-tag--crossroad">
            {t("dashboard.crossroadTitle")}
          </span>
        </h3>
        <button
          type="button"
          className={`verdict-gate${nextCrossroad ? " verdict-gate--ready" : ""}`}
          onClick={() => nextCrossroad && onNavigate(nextCrossroad)}
          disabled={!nextCrossroad}
        >
          {crossroadsDone ? (
            <>
              <span className="verdict-gate__icon">✓</span>
              <span>{t("dashboard.crossroadDone")}</span>
            </>
          ) : nextCrossroad ? (
            <>
              <span className="verdict-gate__icon">◆</span>
              <span>{t("dashboard.enterCrossroad")}</span>
            </>
          ) : (
            <>
              <span className="verdict-gate__icon">🔒</span>
              <span>{t("dashboard.needContradictions")}</span>
            </>
          )}
        </button>
      </section>

      <section className="dashboard__verdict-section">
        <h3 className="dashboard__section-title">
          <span className="dashboard__section-tag dashboard__section-tag--verdict">
            {t("dashboard.finalVerdict")}
          </span>
        </h3>
        <button
          type="button"
          className={`verdict-gate${canVerdict ? " verdict-gate--ready" : ""}`}
          onClick={onVerdict}
          disabled={!canVerdict}
        >
          {canVerdict ? (
            <>
              <span className="verdict-gate__icon">⚖</span>
              <span>{t("dashboard.submitVerdict")}</span>
            </>
          ) : (
            <>
              <span className="verdict-gate__icon">🔒</span>
              <span>{t("dashboard.needCrossroads")}</span>
            </>
          )}
        </button>
      </section>
    </div>
  );
}
