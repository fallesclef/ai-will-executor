"use client";

import { useMemo, useState } from "react";
import type { PlayerState, Story } from "@/types/story";
import {
  RESONANCE_TIERS,
  computeResonanceLevel,
  getVisibleResonanceNodes,
  isResonanceNodeUnlocked,
  shouldPulseResonance,
  shouldShowResonanceDormant,
} from "@/lib/resonance";
import { useLocale } from "@/lib/i18n/context";
import {
  resonanceNextUnlockHint,
  resonanceStatusLabel,
  resonanceTierLabel,
} from "@/lib/i18n/resonance-ui";

interface ResonancePanelProps {
  state: PlayerState;
  story: Story;
  compact?: boolean;
}

export function ResonancePanelDormant() {
  const { t } = useLocale();
  return (
    <section
      className="resonance-panel resonance-panel--dormant"
      aria-label={t("resonance.dormantAria")}
    >
      <div className="resonance-panel__header">
        <span className="resonance-panel__tag">RESONANCE</span>
        <h3 className="resonance-panel__title">{t("resonance.title")}</h3>
        <span className="resonance-panel__status resonance-panel__status--stable">
          {t("resonance.dormant")}
        </span>
      </div>
      <p className="resonance-panel__dormant-text">
        {t("resonance.dormantLine1")}
      </p>
      <p className="resonance-panel__dormant-text">
        {t("resonance.dormantLine2")}
      </p>
    </section>
  );
}

export function ResonancePanel({
  state,
  story,
  compact = false,
}: ResonancePanelProps) {
  const { t } = useLocale();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const dormant = shouldShowResonanceDormant(story, state);

  const { percent, status, unlockedCount, visibleCount, tierLevel } =
    computeResonanceLevel(story.id);
  const pulsing = shouldPulseResonance(state, story);
  const nextHint = resonanceNextUnlockHint(tierLevel, t);

  const nodes = useMemo(
    () => getVisibleResonanceNodes(story.id, tierLevel),
    [story.id, tierLevel]
  );

  if (dormant) {
    return <ResonancePanelDormant />;
  }

  const statusLabel = resonanceStatusLabel(status, tierLevel, t);

  return (
    <section
      className={`resonance-panel${pulsing ? " resonance-panel--pulse" : ""}${compact ? " resonance-panel--compact" : ""}`}
      aria-label={t("resonance.aria")}
    >
      <div className="resonance-panel__header">
        <span className="resonance-panel__tag">RESONANCE</span>
        <h3 className="resonance-panel__title">{t("resonance.title")}</h3>
        <span
          className={`resonance-panel__status resonance-panel__status--${status}`}
        >
          {statusLabel}
        </span>
      </div>

      <div className="resonance-panel__tier-steps">
        {RESONANCE_TIERS.map((tier) => (
          <span
            key={tier.id}
            className={`resonance-tier-step${tier.id <= tierLevel ? " resonance-tier-step--done" : ""}${tier.id === tierLevel ? " resonance-tier-step--current" : ""}`}
            title={resonanceTierLabel(tier.id, t)}
          >
            {tier.id}
          </span>
        ))}
      </div>

      <div className="resonance-panel__gauge">
        <div className="resonance-panel__gauge-label">
          <span>{t("resonance.strength")}</span>
          <span>{percent}%</span>
        </div>
        <div className="resonance-panel__gauge-bar">
          <div
            className={`resonance-panel__gauge-fill resonance-panel__gauge-fill--${status}`}
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="resonance-panel__gauge-hint">
          {t("resonance.unlockedLines", {
            unlocked: unlockedCount,
            visible: visibleCount,
          })}
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
              title={
                unlocked ? node.title : t("resonance.unlockAfterCase")
              }
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
                    {t("resonance.tier", { tier: node.resonanceTier })}
                  </span>
                </p>
                {unlocked ? (
                  <blockquote className="resonance-panel__quote">
                    「{node.quote}」
                  </blockquote>
                ) : (
                  <p className="resonance-panel__locked">
                    {t("resonance.sealed", { number: node.number })}
                  </p>
                )}
                {node.suppressed && unlocked && (
                  <p className="resonance-panel__note">
                    {t("resonance.suppressedNote")}
                  </p>
                )}
                {node.isMirror && unlocked && (
                  <p className="resonance-panel__note">
                    {node.id === "r-unknown-eighth"
                      ? t("resonance.mirrorUnknown")
                      : t("resonance.mirrorNode")}
                  </p>
                )}
                {node.resonanceTier === 1 &&
                  unlocked &&
                  node.caseId !== "case-d173" && (
                    <p className="resonance-panel__note">
                      {t("resonance.retroactive")}
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
