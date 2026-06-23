"use client";

import type { PlayerState, Story } from "@/types/story";
import { STAT_LABELS } from "@/types/story";
import { getFlowStepStatus } from "@/lib/engine";

interface StatusPanelProps {
  state: PlayerState;
  story: Story;
}

export function StatusPanel({ state, story }: StatusPanelProps) {
  const { flow } = story;
  const stepStatus = getFlowStepStatus(state, story);
  const completedSteps = flow.flowSteps.filter((s) => stepStatus[s.id]).length;
  const verdictReady = stepStatus.verdict || state.phase === "verdict";

  return (
    <aside className="status-panel">
      <div className="status-panel__header">
        <span className="status-panel__tag">SYS</span>
        <h2 className="status-panel__title">審查狀態</h2>
      </div>

      <div className="status-panel__case">
        <span className="status-panel__case-id">{story.caseNumber}</span>
        <span className="status-panel__case-name">{story.subtitle}</span>
      </div>

      <div className="status-panel__progress">
        <div className="status-panel__progress-label">
          <span>主流程進度</span>
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
          <span className="status-panel__ready">✓ 可提交裁決</span>
        ) : (
          <span className="status-panel__pending">依主流程逐步推進</span>
        )}
      </div>

      <div className="status-panel__flow">
        <h3 className="status-panel__flow-title">流程節點</h3>
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

      {flow.electionCountdown && (
        <div className="status-panel__countdown">
          <h3 className="status-panel__flow-title">
            {flow.electionCountdown.label}
          </h3>
          <p className="status-panel__countdown-value">
            剩餘 {flow.electionCountdown.hoursRemaining} 小時
          </p>
        </div>
      )}

      <div className="status-panel__stats">
        <h3 className="status-panel__stats-title">隱性評估（不公開）</h3>
        {(["legal", "empathy", "suspicion"] as const).map((key) => (
          <div key={key} className="stat-row">
            <span className="stat-row__label">{STAT_LABELS[key]}</span>
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
              鏡像完整度
            </h3>
            <div className="stat-row">
              <span className="stat-row__label">
                {STAT_LABELS.mirror_integrity}
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
              公共壓力指標
            </h3>
            {(["public_trust", "social_stability", "truth_pressure"] as const).map(
              (key) => (
                <div key={key} className="stat-row">
                  <span className="stat-row__label">{STAT_LABELS[key]}</span>
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
              )
            )}
          </>
        )}
        <p className="status-panel__stats-note">
          * 數值由您的審查選擇累積，影響最終結局
        </p>
      </div>

      <div className="status-panel__log">
        <h3 className="status-panel__log-title">選擇紀錄</h3>
        {state.choiceHistory.length === 0 ? (
          <p className="status-panel__log-empty">尚無紀錄</p>
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
