"use client";

import { useEffect, useState } from "react";
import type { AdminStats } from "@/lib/store/redis";

export default function AdminPage() {
  const [secret, setSecret] = useState("");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStats = async () => {
    if (!secret) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/stats", {
        headers: { "x-admin-secret": secret },
      });
      if (!res.ok) {
        setError("驗證失敗或後台未設定");
        setStats(null);
        return;
      }
      setStats(await res.json());
    } catch {
      setError("無法連線至後台");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const saved = sessionStorage.getItem("awe-admin-secret");
    if (saved) setSecret(saved);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sessionStorage.setItem("awe-admin-secret", secret);
    void fetchStats();
  };

  const topChoices = stats
    ? Object.entries(stats.choices)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
    : [];

  return (
    <div className="admin">
      <header className="admin__header">
        <h1>AWE 分析後台</h1>
        <p>試玩進度與選項分布（需設定 Upstash Redis + ADMIN_SECRET）</p>
      </header>

      <form className="admin__login" onSubmit={handleSubmit}>
        <input
          type="password"
          className="lobby__input"
          placeholder="ADMIN_SECRET"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
        />
        <button type="submit" className="choice-btn" disabled={loading}>
          {loading ? "載入中…" : "進入"}
        </button>
      </form>

      {error && <p className="admin__error">{error}</p>}

      {stats && (
        <div className="admin__grid">
          <section className="admin__card">
            <h2>總覽</h2>
            <ul>
              <li>資料庫：{stats.enabled ? "已連線" : "未設定（僅本地試玩）"}</li>
              <li>註冊玩家：{stats.players}</li>
              <li>已填 Email：{stats.registeredPlayers.length}</li>
            </ul>
          </section>

          {Object.entries(stats.byStory).map(([storyId, s]) => (
            <section key={storyId} className="admin__card">
              <h2>{storyId}</h2>
              <ul>
                <li>玩家數：{s.players}</li>
                <li>進行中：{s.inProgress}</li>
                <li>已完成：{s.completions}</li>
              </ul>
            </section>
          ))}

          <section className="admin__card admin__card--wide">
            <h2>
              已註冊玩家（Email）
              {stats.registeredPlayers.length > 0 &&
                ` · ${stats.registeredPlayers.length} 人`}
            </h2>
            {stats.registeredPlayers.length === 0 ? (
              <p>尚無填寫 Email 的玩家</p>
            ) : (
              <div className="admin__table-wrap">
                <table className="admin__table">
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>執行人姓名</th>
                      <th>最後活動</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.registeredPlayers.map((player) => (
                      <tr key={player.id}>
                        <td>{player.email}</td>
                        <td>{player.executorName ?? "—"}</td>
                        <td>
                          {new Date(player.lastSeenAt).toLocaleString("zh-TW")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="admin__card admin__card--wide">
            <h2>結局分布</h2>
            {Object.keys(stats.verdicts).length === 0 ? (
              <p>尚無資料</p>
            ) : (
              <ul>
                {Object.entries(stats.verdicts).map(([id, count]) => (
                  <li key={id}>
                    {id}：{count}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="admin__card admin__card--wide">
            <h2>熱門選項（Top 12）</h2>
            {topChoices.length === 0 ? (
              <p>尚無資料</p>
            ) : (
              <ul>
                {topChoices.map(([key, count]) => (
                  <li key={key}>
                    {key}：{count}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
