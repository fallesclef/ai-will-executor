"use client";

import type { AnalyticsEvent, PlayerState } from "@/types/story";
import { getLocalPlayerEmail } from "@/lib/player/client";

let syncTimer: ReturnType<typeof setTimeout> | null = null;
let latestState: PlayerState | null = null;
let latestEvent:
  | Omit<AnalyticsEvent, "playerId" | "storyId" | "timestamp">
  | undefined;

function syncDelay(
  event?: Omit<AnalyticsEvent, "playerId" | "storyId" | "timestamp">
): number {
  if (event?.type === "complete" || event?.type === "choice") return 500;
  if (event?.type === "navigate") return 4000;
  return 3000;
}

/** Cloud sync only for linked-email players; anonymous play stays local-only. */
export function queueSync(
  state: PlayerState,
  event?: Omit<AnalyticsEvent, "playerId" | "storyId" | "timestamp">
): void {
  if (typeof window === "undefined") return;
  if (!getLocalPlayerEmail()) return;

  latestState = state;
  if (event) latestEvent = event;

  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    if (!latestState) return;
    void flushSync(latestState, latestEvent);
    latestEvent = undefined;
  }, syncDelay(event));
}

export async function flushSync(
  state: PlayerState,
  event?: Omit<AnalyticsEvent, "playerId" | "storyId" | "timestamp">
): Promise<void> {
  if (!getLocalPlayerEmail()) return;

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

/** Flush pending cloud save when leaving the tab (email players only). */
export function flushSyncPending(): void {
  if (!getLocalPlayerEmail() || !latestState) return;
  if (syncTimer) {
    clearTimeout(syncTimer);
    syncTimer = null;
  }
  void flushSync(latestState, latestEvent);
}
