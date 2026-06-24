"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import type { CaseMeta } from "@/types/story";
import {
  getLocalPlayerEmail,
  registerPlayer,
  setLocalPlayerEmail,
} from "@/lib/player/client";
import {
  hasCompletedRequiredCases,
  computeResonanceLevel,
  getResonanceTierLevel,
} from "@/lib/resonance";
import {
  getExecutorName,
  hasExecutorName,
  personalizeNarrative,
} from "@/lib/executor-identity";
import { ExecutorNameForm } from "@/components/ExecutorNameForm";

interface CaseLobbyProps {
  cases: CaseMeta[];
}

export function CaseLobby({ cases }: CaseLobbyProps) {
  const [email, setEmail] = useState(getLocalPlayerEmail() ?? "");
  const [status, setStatus] = useState<string | null>(null);
  const [seasonReady, setSeasonReady] = useState(false);
  const [resonanceTier, setResonanceTier] = useState(0);
  const [, bumpName] = useState(0);

  useEffect(() => {
    setSeasonReady(
      hasCompletedRequiredCases([
        "case-d047",
        "case-d082",
        "case-d119",
        "case-d144",
        "case-d173",
        "case-d206",
        "case-d301",
      ])
    );
    setResonanceTier(getResonanceTierLevel());
  }, []);

  const handleRegister = async () => {
    const result = await registerPlayer(email || undefined);
    if (result.email) setLocalPlayerEmail(result.email);
    setStatus(
      result.email
        ? `已連結帳號：${result.email}`
        : "已建立匿名試玩身分（進度仍會同步至後台）"
    );
  };

  return (
    <div className="lobby">
      <header className="lobby__header">
        <span className="lobby__sys">AWE SYSTEM v3.1</span>
        <h1 className="lobby__title">AI遺囑執行人</h1>
        <p className="lobby__subtitle">數位遺囑執行署 · 案件大廳</p>
      </header>

      <section className="lobby__account">
        <h2 className="lobby__section-title">執行人身分</h2>
        <p className="lobby__hint">
          可不登入直接試玩。填寫 Email 可跨裝置找回進度（需後台已設定
          Upstash Redis）。
        </p>
        <div className="lobby__account-row">
          <input
            type="email"
            className="lobby__input"
            placeholder="email@example.com（選填）"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="button" className="choice-btn" onClick={handleRegister}>
            <span className="choice-btn__marker">{">"}</span>
            註冊 / 連結
          </button>
        </div>
        {status && <p className="lobby__status">{status}</p>}
        <ExecutorNameForm
          onSaved={() => {
            bumpName((n) => n + 1);
          }}
        />
      </section>

      <section className="lobby__cases">
        <h2 className="lobby__section-title">可審理案件</h2>
        {resonanceTier >= 1 && (() => {
          const level = computeResonanceLevel();
          return (
          <div className="lobby__resonance-banner">
            <span className="lobby__resonance-tag">RESONANCE</span>
            <span>
              系統共振 {level.percent}% · 階段 {level.tierLabel}
            </span>
          </div>
          );
        })()}
        <div className="lobby__grid">
          {cases.map((c) => {
            const locked =
              c.requiresCompletedCases?.length &&
              !hasCompletedRequiredCases(c.requiresCompletedCases);
            return (
            <article key={c.id} className="lobby__card">
              <div className="lobby__card-head">
                <span className="lobby__case-id">{c.caseNumber}</span>
                {c.status === "coming_soon" && (
                  <span className="lobby__badge">籌備中</span>
                )}
              </div>
              <h3 className="lobby__card-title">{c.subtitle}</h3>
              {c.description && (
                <p className="lobby__card-desc">
                  {personalizeNarrative(c.description)}
                </p>
              )}
              {c.id === "case-d399" && !seasonReady && (
                <p className="lobby__card-hint">
                  需先完成前七案裁決，第八案的玩家紀錄與鏡像 AI
                  預測才會完整生成。
                </p>
              )}
              {locked ? (
                <span className="lobby__play-btn lobby__play-btn--disabled">
                  需先完成前七案
                </span>
              ) : !hasExecutorName() ? (
                <span className="lobby__play-btn lobby__play-btn--disabled">
                  請先設定執行人姓名
                </span>
              ) : c.status === "available" ? (
                <Link href={`/case/${c.id}`} className="lobby__play-btn">
                  接手案件
                </Link>
              ) : (
                <span className="lobby__play-btn lobby__play-btn--disabled">
                  尚未開放
                </span>
              )}
            </article>
            );
          })}
        </div>
      </section>

      <footer className="lobby__footer">
        <span>AI WILL EXECUTOR · DIGITAL PROBATE DIVISION</span>
      </footer>
    </div>
  );
}
