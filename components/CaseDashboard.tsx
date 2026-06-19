"use client";

import { CONSOLE_SECTIONS, CATEGORY_LABELS, NODE_LABELS } from "@/data/story";
import { NavButton } from "@/components/ChoiceButton";
import type { GameState } from "@/types/story";
import {
  canAccessContradictions,
  canAccessVerdict,
  getNextCrossroadNode,
  hasCompletedCrossroads,
} from "@/lib/engine";

interface CaseDashboardProps {
  state: GameState;
  onNavigate: (nodeId: string) => void;
  onVerdict: () => void;
  canVerdict: boolean;
}

export function CaseDashboard({
  state,
  onNavigate,
  onVerdict,
  canVerdict,
}: CaseDashboardProps) {
  const contradictionsReady = canAccessContradictions(state);
  const nextCrossroad = getNextCrossroadNode(state);
  const crossroadsDone = hasCompletedCrossroads(state);

  return (
    <div className="dashboard">
      <div className="dashboard__intro">
        <p>
          請依序完成各審查項目：簡報 → 角色檔案 → 七份證據 → 三位家屬訪談 →
          AI 詢問。
        </p>
        <p className="dashboard__hint">
          完成後可整理矛盾點，進入三個關鍵抉擇，最後提交裁決。
        </p>
      </div>

      {CONSOLE_SECTIONS.map((section) => {
        const isContradiction = section.id === "contradiction";
        const locked = isContradiction && !contradictionsReady;

        return (
          <section key={section.id} className="dashboard__section">
            <h3 className="dashboard__section-title">
              <span className="dashboard__section-tag">
                {CATEGORY_LABELS[section.id]}
              </span>
              {locked && (
                <span className="dashboard__lock-tag">需完成前置審閱</span>
              )}
            </h3>
            <div className="dashboard__grid">
              {section.nodes.map((nodeId) => {
                const viewed = state.viewedNodes.includes(nodeId);
                const info = NODE_LABELS[nodeId] ?? { label: nodeId, sub: "" };
                return (
                  <NavButton
                    key={nodeId}
                    label={info.label}
                    subtitle={info.sub}
                    viewed={viewed}
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
            關鍵抉擇
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
              <span>三項關鍵抉擇已完成</span>
            </>
          ) : nextCrossroad ? (
            <>
              <span className="verdict-gate__icon">◆</span>
              <span>進入關鍵抉擇</span>
            </>
          ) : (
            <>
              <span className="verdict-gate__icon">🔒</span>
              <span>需先完成矛盾整理</span>
            </>
          )}
        </button>
      </section>

      <section className="dashboard__verdict-section">
        <h3 className="dashboard__section-title">
          <span className="dashboard__section-tag dashboard__section-tag--verdict">
            最終裁決
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
              <span>提交裁決</span>
            </>
          ) : (
            <>
              <span className="verdict-gate__icon">🔒</span>
              <span>需先完成三項關鍵抉擇</span>
            </>
          )}
        </button>
      </section>
    </div>
  );
}
