import type { PlayerState } from "@/types/story";
import { hydratePlayerState } from "@/lib/engine";
import type { StoredProgress } from "@/lib/store/redis";

export function isFullCloudSave(
  data: StoredProgress | PlayerState | null | undefined
): data is PlayerState {
  return (
    !!data &&
    Array.isArray((data as PlayerState).viewedNodes) &&
    typeof (data as PlayerState).nodeChoices === "object"
  );
}

export function normalizeCloudSave(
  storyId: string,
  raw: StoredProgress | PlayerState
): PlayerState | null {
  if (!isFullCloudSave(raw)) return null;
  const state = hydratePlayerState(raw, storyId);
  if (!state || state.storyId !== storyId) return null;
  return state;
}
