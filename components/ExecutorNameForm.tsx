"use client";

import { useState } from "react";
import {
  EXECUTOR_NAME_MAX,
  getExecutorName,
  isValidExecutorName,
  sanitizeExecutorName,
  setExecutorName,
} from "@/lib/executor-identity";
import {
  getLocalPlayerEmail,
  registerPlayer,
} from "@/lib/player/client";
import { useLocale } from "@/lib/i18n/context";
import { trackExecutorNameSet } from "@/lib/analytics/events";

interface ExecutorNameFormProps {
  variant?: "lobby" | "gate";
  onSaved?: (name: string) => void;
}

export function ExecutorNameForm({
  variant = "lobby",
  onSaved,
}: ExecutorNameFormProps) {
  const { t } = useLocale();
  const [name, setName] = useState(getExecutorName());
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    const trimmed = sanitizeExecutorName(name);
    if (!isValidExecutorName(trimmed)) {
      setError(
        t("executor.nameError", { min: 1, max: EXECUTOR_NAME_MAX })
      );
      return;
    }
    const saved = setExecutorName(trimmed);
    setName(saved);
    setError(null);
    trackExecutorNameSet();
    void registerPlayer(getLocalPlayerEmail() ?? undefined, saved);
    onSaved?.(saved);
  };

  if (variant === "gate") {
    return (
      <div className="executor-gate">
        <div className="executor-gate__card">
          <span className="executor-gate__sys">{t("common.sys")}</span>
          <h1 className="executor-gate__title">{t("executor.gateTitle")}</h1>
          <p className="executor-gate__hint">{t("executor.gateHint1")}</p>
          <p className="executor-gate__hint">{t("executor.gateHint2")}</p>
          <label className="executor-gate__label" htmlFor="executor-name-gate">
            {t("executor.nameLabel")}
          </label>
          <input
            id="executor-name-gate"
            type="text"
            className="executor-gate__input"
            placeholder={t("executor.gatePlaceholder")}
            value={name}
            maxLength={EXECUTOR_NAME_MAX}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            autoFocus
          />
          {error && <p className="executor-gate__error">{error}</p>}
          <button
            type="button"
            className="choice-btn choice-btn--primary"
            onClick={handleSave}
          >
            <span className="choice-btn__marker">{">"}</span>
            {t("executor.gateConfirm")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="lobby__name-block">
      <label className="lobby__name-label" htmlFor="executor-name-lobby">
        {t("executor.nameLabel")}{" "}
        <span className="lobby__required">{t("executor.required")}</span>
      </label>
      <p className="lobby__hint">{t("executor.lobbyHint")}</p>
      <div className="lobby__account-row">
        <input
          id="executor-name-lobby"
          type="text"
          className="lobby__input"
          placeholder={t("executor.namePlaceholder")}
          value={name}
          maxLength={EXECUTOR_NAME_MAX}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
        />
        <button type="button" className="choice-btn" onClick={handleSave}>
          <span className="choice-btn__marker">{">"}</span>
          {t("executor.saveName")}
        </button>
      </div>
      {error && <p className="lobby__status lobby__status--error">{error}</p>}
      {hasValidSavedName(name) && (
        <p className="lobby__status">
          {t("executor.mirrorPreview", { name: sanitizeExecutorName(name) })}
        </p>
      )}
    </div>
  );
}

function hasValidSavedName(draft: string): boolean {
  return isValidExecutorName(draft) && draft.trim() === getExecutorName();
}
