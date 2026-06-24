"use client";

import { useState } from "react";
import {
  EXECUTOR_NAME_MAX,
  getExecutorName,
  isValidExecutorName,
  sanitizeExecutorName,
  setExecutorName,
} from "@/lib/executor-identity";

interface ExecutorNameFormProps {
  variant?: "lobby" | "gate";
  onSaved?: (name: string) => void;
}

export function ExecutorNameForm({
  variant = "lobby",
  onSaved,
}: ExecutorNameFormProps) {
  const [name, setName] = useState(getExecutorName());
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    const trimmed = sanitizeExecutorName(name);
    if (!isValidExecutorName(trimmed)) {
      setError(`請輸入 ${1}–${EXECUTOR_NAME_MAX} 字元（中文、英文或數字）`);
      return;
    }
    const saved = setExecutorName(trimmed);
    setName(saved);
    setError(null);
    onSaved?.(saved);
  };

  if (variant === "gate") {
    return (
      <div className="executor-gate">
        <div className="executor-gate__card">
          <span className="executor-gate__sys">AWE SYSTEM v3.1</span>
          <h1 className="executor-gate__title">執行人登記</h1>
          <p className="executor-gate__hint">
            數位遺囑執行署需要記錄你的裁決者身份。
          </p>
          <p className="executor-gate__hint">
            第八案起，系統可能依你的姓名建立鏡像備份檔案——請使用你願意在案件中看見的名字。
          </p>
          <label className="executor-gate__label" htmlFor="executor-name-gate">
            執行人姓名
          </label>
          <input
            id="executor-name-gate"
            type="text"
            className="executor-gate__input"
            placeholder="例如：陳以安、Lin、Alex…"
            value={name}
            maxLength={EXECUTOR_NAME_MAX}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            autoFocus
          />
          {error && <p className="executor-gate__error">{error}</p>}
          <button type="button" className="choice-btn choice-btn--primary" onClick={handleSave}>
            <span className="choice-btn__marker">{">"}</span>
            確認身份並進入
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="lobby__name-block">
      <label className="lobby__name-label" htmlFor="executor-name-lobby">
        執行人姓名 <span className="lobby__required">*</span>
      </label>
      <p className="lobby__hint">
        將顯示於案件登入與第八案鏡像 AI（AI
        ［你的姓名］）。可隨時修改，不影響已存進度。
      </p>
      <div className="lobby__account-row">
        <input
          id="executor-name-lobby"
          type="text"
          className="lobby__input"
          placeholder="輸入你的姓名"
          value={name}
          maxLength={EXECUTOR_NAME_MAX}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
        />
        <button type="button" className="choice-btn" onClick={handleSave}>
          <span className="choice-btn__marker">{">"}</span>
          儲存姓名
        </button>
      </div>
      {error && <p className="lobby__status lobby__status--error">{error}</p>}
      {hasValidSavedName(name) && (
        <p className="lobby__status">
          鏡像代號預覽：AI {sanitizeExecutorName(name)}
        </p>
      )}
    </div>
  );
}

function hasValidSavedName(draft: string): boolean {
  return isValidExecutorName(draft) && draft.trim() === getExecutorName();
}
