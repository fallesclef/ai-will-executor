"use client";

import type { AnalyticsEvent, PlayerState } from "@/types/story";

let syncTimer: ReturnType<typeof setTimeout> | null = null;

export function queueSync(
  state: PlayerState,
  event?: Omit<AnalyticsEvent, "playerId" | "storyId" | "timestamp">
): void {
  if (typeof window === "undefined") return;

  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    void flushSync(state, event);
  }, 1200);
}

export async function flushSync(
  state: PlayerState,
  event?: Omit<AnalyticsEvent, "playerId" | "storyId" | "timestamp">
): Promise<void> {
  try {
    await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        state,
        event: event
          ? {
              ...event,
              storyId: state.storyId,
              playerId: state.playerId,
              timestamp: new Date().toISOString(),
            }
          : undefined,
      }),
    });
  } catch {
    // 分析後端可選，失敗不影響遊戲
  }
}
