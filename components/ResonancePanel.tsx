"use client";

import { useMemo, useState } from "react";
import type { PlayerState, Story } from "@/types/story";
import {
  RESONANCE_TIERS,
  computeResonanceLevel,
  getNextResonanceUnlockHint,
  getResonanceStatusLabel,
  getVisibleResonanceNodes,
  isResonanceNodeUnlocked,
  shouldPulseResonance,
  shouldShowResonanceDormant,
} from "@/lib/resonance";

interface ResonancePanelProps {
  state: PlayerState;
  story: Story;
  compact?: boolean;
}

export function ResonancePanelDormant() {
  return (
    <section
      className="resonance-panel resonance-panel--dormant"
      aria-label="系統共振待啟用"
    >
      <div className="resonance-panel__header">
        <span className="resonance-panel__tag">RESONANCE</span>
        <h3 className="resonance-panel__title">系統共振</h3>
        <span className="resonance-panel__status resonance-panel__status--stable">
          待啟用
        </span>
      </div>
      <p className="resonance-panel__dormant-text">
        跨案件語義監測模組尚未寫入你的裁決者檔案。
      </p>
      <p className="resonance-panel__dormant-text">
        完成本案裁決後，系統將首次比對前案封存語句。
      </p>
    </section>
  );
}

export function ResonancePanel({
  state,
  story,
  compact = false,
}: ResonancePanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const dormant = shouldShowResonanceDormant(story, state);

  const {
    percent,
    status,
    unlockedCount,
    visibleCount,
    tierLevel,
    tierLabel,
  } = computeResonanceLevel(story.id);
  const pulsing = shouldPulseResonance(state, story);
  const nextHint = getNextResonanceUnlockHint();

  const nodes = useMemo(
    () => getVisibleResonanceNodes(story.id, tierLevel),
    [story.id, tierLevel]
  );

  if (dormant) {
    return <ResonancePanelDormant />;
  }

  const statusLabel = getResonanceStatusLabel(status, tierLabel);

  return (
    <section
      className={`resonance-panel${pulsing ? " resonance-panel--pulse" : ""}${compact ? " resonance-panel--compact" : ""}`}
      aria-label="跨案件語義共振"
    >
      <div className="resonance-panel__header">
        <span className="resonance-panel__tag">RESONANCE</span>
        <h3 className="resonance-panel__title">系統共振</h3>
        <span
          className={`resonance-panel__status resonance-panel__status--${status}`}
        >
          {statusLabel}
        </span>
      </div>

      <div className="resonance-panel__tier-steps">
        {RESONANCE_TIERS.map((t) => (
          <span
            key={t.id}
            className={`resonance-tier-step${t.id <= tierLevel ? " resonance-tier-step--done" : ""}${t.id === tierLevel ? " resonance-tier-step--current" : ""}`}
            title={t.label}
          >
            {t.id}
          </span>
        ))}
      </div>

      <div className="resonance-panel__gauge">
        <div className="resonance-panel__gauge-label">
          <span>共振強度</span>
          <span>{percent}%</span>
        </div>
        <div className="resonance-panel__gauge-bar">
          <div
            className={`resonance-panel__gauge-fill resonance-panel__gauge-fill--${status}`}
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="resonance-panel__gauge-hint">
          已解鎖語句 {unlockedCount}/{visibleCount}
          {tierLevel < 4 && nextHint && !compact && (
            <>
              <br />
              <span className="resonance-panel__next-hint">{nextHint}</span>
            </>
          )}
        </p>
      </div>

      <div className="resonance-panel__graph">
        {nodes.map((node) => {
          const unlocked = isResonanceNodeUnlocked(node);
          const active =
            expandedId === node.id ||
            (node.caseId === story.id && pulsing);

          return (
            <button
              key={node.id}
              type="button"
              className={`resonance-node${unlocked ? " resonance-node--unlocked" : " resonance-node--locked"}${active ? " resonance-node--active" : ""}${node.suppressed ? " resonance-node--suppressed" : ""}${node.isMirror ? " resonance-node--mirror" : ""}`}
              onClick={() =>
                setExpandedId((id) => (id === node.id ? null : node.id))
              }
              disabled={!unlocked}
              title={unlocked ? node.title : "完成對應案件後解鎖"}
            >
              <span className="resonance-node__id">{node.number}</span>
              <span className="resonance-node__dot" aria-hidden />
              {!compact && (
                <span className="resonance-node__title">{node.title}</span>
              )}
            </button>
          );
        })}
      </div>

      {expandedId && (
        <div className="resonance-panel__detail">
          {(() => {
            const node = nodes.find((n) => n.id === expandedId);
            if (!node) return null;
            const unlocked = isResonanceNodeUnlocked(node);
            return (
              <>
                <p className="resonance-panel__detail-case">
                  {node.number} · {node.title}
                  <span className="resonance-panel__detail-tier">
                    階段 {node.resonanceTier}
                  </span>
                </p>
                {unlocked ? (
                  <blockquote className="resonance-panel__quote">
                    「{node.quote}」
                  </blockquote>
                ) : (
                  <p className="resonance-panel__locked">
                    【封存中】完成 {node.number} 裁決後，語句將寫入共振圖譜。
                  </p>
                )}
                {node.suppressed && unlocked && (
                  <p className="resonance-panel__note">
                    系統紀錄：該句曾被 AI 主動刪除，未納入正式輸出。
                  </p>
                )}
                {node.isMirror && unlocked && (
                  <p className="resonance-panel__note">
                    {node.id === "r-unknown-eighth"
                      ? "異常節點：圖譜節點數與已結案件不一致。"
                      : "鏡像節點：非死者資料，源自裁決者行為模式。"}
                  </p>
                )}
                {node.resonanceTier === 1 &&
                  unlocked &&
                  node.caseId !== "case-d173" && (
                    <p className="resonance-panel__note">
                      回溯封存：第五案結束後，系統才首次比對前案異常語句。
                    </p>
                  )}
              </>
            );
          })()}
        </div>
      )}
    </section>
  );
}
