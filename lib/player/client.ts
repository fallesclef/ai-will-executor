"use client";

import type { PlayerState } from "@/types/story";

const PLAYER_KEY = "ai-will-executor-player-id";
const PLAYER_EMAIL_KEY = "ai-will-executor-player-email";

function randomId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `p_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getLocalPlayerId(): string {
  if (typeof window === "undefined") return "server";
  let id = localStorage.getItem(PLAYER_KEY);
  if (!id) {
    id = randomId();
    localStorage.setItem(PLAYER_KEY, id);
  }
  return id;
}

export function getLocalPlayerEmail(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(PLAYER_EMAIL_KEY);
}

export function setLocalPlayerEmail(email: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PLAYER_EMAIL_KEY, email.trim().toLowerCase());
}

export async function registerPlayer(
  email?: string,
  executorName?: string
): Promise<{
  playerId: string;
  email: string | null;
}> {
  const playerId = getLocalPlayerId();
  const body: {
    playerId: string;
    email?: string;
    executorName?: string;
  } = { playerId };
  if (email) body.email = email;
  if (executorName) body.executorName = executorName;

  try {
    const res = await fetch("/api/player", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const data = (await res.json()) as { playerId: string; email?: string };
      if (data.email) setLocalPlayerEmail(data.email);
      return { playerId: data.playerId, email: data.email ?? null };
    }
  } catch {
    // 後端未設定時仍可在本地遊玩
  }

  return { playerId, email: email ?? getLocalPlayerEmail() };
}
