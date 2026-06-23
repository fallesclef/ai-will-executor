"use client";

import { ChoiceButton } from "@/components/ChoiceButton";
import type { Choice } from "@/types/story";

interface NodeViewProps {
  title: string;
  subtitle?: string;
  category: string;
  categoryLabels: Record<string, string>;
  content: string[];
  choices?: Choice[];
  onChoice: (choice: Choice) => void;
  onBack?: () => void;
  showBack?: boolean;
  isVerdict?: boolean;
  isCrossroad?: boolean;
  predictionLabel?: string;
  interfaceGlowChoiceId?: string;
  verdictHint?: string;
}

export function NodeView({
  title,
  subtitle,
  category,
  categoryLabels,
  content,
  choices,
  onChoice,
  onBack,
  showBack = false,
  isVerdict = false,
  isCrossroad = false,
  predictionLabel,
  interfaceGlowChoiceId,
  verdictHint,
}: NodeViewProps) {
  const categoryLabel = categoryLabels[category] ?? category;

  return (
    <article className="node-view">
      <header className="node-view__header">
        <div className="node-view__meta">
          <span className="node-view__category">{categoryLabel}</span>
          {subtitle && (
            <span className="node-view__subtitle">{subtitle}</span>
          )}
        </div>
        <h2 className="node-view__title">{title}</h2>
        <div className="node-view__divider" />
      </header>

      <div className="node-view__body">
        {content.map((paragraph, i) => (
          <p
            key={i}
            className={
              paragraph === "" ? "node-view__spacer" : "node-view__paragraph"
            }
          >
            {paragraph}
          </p>
        ))}
      </div>

      {predictionLabel && (
        <p className="node-view__prediction">{predictionLabel}</p>
      )}
      {verdictHint && (
        <p className="node-view__verdict-hint">{verdictHint}</p>
      )}

      {choices && choices.length > 0 && (
        <footer className="node-view__footer">
          <p className="node-view__choice-prompt">
            {isVerdict
              ? "【提交裁決】"
              : isCrossroad
                ? "【關鍵抉擇】"
                : "【請選擇】"}
          </p>
          <div className="node-view__choices">
            {choices.map((choice) => (
              <ChoiceButton
                key={choice.id}
                label={choice.label}
                variant={isVerdict ? "primary" : "default"}
                highlighted={choice.id === interfaceGlowChoiceId}
                onClick={() => onChoice(choice)}
              />
            ))}
          </div>
        </footer>
      )}

      {showBack && onBack && (
        <div className="node-view__back">
          <ChoiceButton label="返回案件控制台" onClick={onBack} />
        </div>
      )}
    </article>
  );
}
