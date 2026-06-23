"use client";

import Link from "next/link";
import { useState } from "react";
import type { CaseMeta } from "@/types/story";
import {
  getLocalPlayerEmail,
  registerPlayer,
  setLocalPlayerEmail,
} from "@/lib/player/client";

interface CaseLobbyProps {
  cases: CaseMeta[];
}

export function CaseLobby({ cases }: CaseLobbyProps) {
  const [email, setEmail] = useState(getLocalPlayerEmail() ?? "");
  const [status, setStatus] = useState<string | null>(null);

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
      </section>

      <section className="lobby__cases">
        <h2 className="lobby__section-title">可審理案件</h2>
        <div className="lobby__grid">
          {cases.map((c) => (
            <article key={c.id} className="lobby__card">
              <div className="lobby__card-head">
                <span className="lobby__case-id">{c.caseNumber}</span>
                {c.status === "coming_soon" && (
                  <span className="lobby__badge">籌備中</span>
                )}
              </div>
              <h3 className="lobby__card-title">{c.subtitle}</h3>
              {c.description && (
                <p className="lobby__card-desc">{c.description}</p>
              )}
              {c.status === "available" ? (
                <Link href={`/case/${c.id}`} className="lobby__play-btn">
                  接手案件
                </Link>
              ) : (
                <span className="lobby__play-btn lobby__play-btn--disabled">
                  尚未開放
                </span>
              )}
            </article>
          ))}
        </div>
      </section>

      <footer className="lobby__footer">
        <span>AI WILL EXECUTOR · DIGITAL PROBATE DIVISION</span>
      </footer>
    </div>
  );
}
