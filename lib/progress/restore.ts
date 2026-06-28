"use client";

import type { PlayerState } from "@/types/story";
import { loadGame, saveGame } from "@/lib/engine";
import { getLocalPlayerEmail, getLocalPlayerId } from "@/lib/player/client";
import { normalizeCloudSave } from "@/lib/progress/normalize";
import type { StoredProgress } from "@/lib/store/redis";

const RESTORE_OFFER_KEY = "awe-cloud-restore-offered-at";

export interface RestoreCandidate {
  storyId: string;
  cloud: PlayerState;
  local: PlayerState | null;
}

function hasMeaningfulProgress(state: PlayerState): boolean {
  return (
    !!state.verdictChoiceId ||
    state.phase === "ending" ||
    state.choiceHistory.length > 0 ||
    state.viewedNodes.length > 1 ||
    state.phase !== "intro"
  );
}

function parseUpdatedAt(state: PlayerState | null): number {
  if (!state?.updatedAt) return 0;
  const t = Date.parse(state.updatedAt);
  return Number.isNaN(t) ? 0 : t;
}

export function shouldRestoreCase(
  local: PlayerState | null,
  cloud: PlayerState
): boolean {
  if (!hasMeaningfulProgress(cloud)) return false;
  if (!local) return true;
  return parseUpdatedAt(cloud) > parseUpdatedAt(local);
}

export async function fetchCloudSaves(
  storyIds: string[]
): Promise<Record<string, PlayerState>> {
  const email = getLocalPlayerEmail();
  if (!email) return {};

  try {
    const res = await fetch("/api/progress/restore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerId: getLocalPlayerId(),
        email,
        storyIds,
      }),
    });

    if (!res.ok) return {};

    const data = (await res.json()) as {
      storeEnabled?: boolean;
      saves?: Record<string, PlayerState>;
    };

    if (!data.storeEnabled || !data.saves) return {};

    const out: Record<string, PlayerState> = {};
    for (const [storyId, raw] of Object.entries(data.saves)) {
      const normalized = normalizeCloudSave(storyId, raw as StoredProgress);
      if (normalized) out[storyId] = normalized;
    }
    return out;
  } catch {
    return {};
  }
}

export function findRestoreCandidates(
  storyIds: string[],
  cloudSaves: Record<string, PlayerState>
): RestoreCandidate[] {
  const candidates: RestoreCandidate[] = [];

  for (const storyId of storyIds) {
    const cloud = cloudSaves[storyId];
    if (!cloud) continue;
    const local = loadGame(storyId);
    if (shouldRestoreCase(local, cloud)) {
      candidates.push({ storyId, cloud, local });
    }
  }

  return candidates;
}

export function maxCloudUpdatedAt(candidates: RestoreCandidate[]): string {
  let max = 0;
  let iso = "";
  for (const c of candidates) {
    const t = parseUpdatedAt(c.cloud);
    if (t > max) {
      max = t;
      iso = c.cloud.updatedAt;
    }
  }
  return iso;
}

export function wasRestoreOfferDismissed(cloudUpdatedAt: string): boolean {
  if (typeof window === "undefined" || !cloudUpdatedAt) return false;
  return localStorage.getItem(RESTORE_OFFER_KEY) === cloudUpdatedAt;
}

export function markRestoreOfferDismissed(cloudUpdatedAt: string): void {
  if (typeof window === "undefined" || !cloudUpdatedAt) return;
  localStorage.setItem(RESTORE_OFFER_KEY, cloudUpdatedAt);
}

export function applyCloudRestore(candidates: RestoreCandidate[]): number {
  let applied = 0;
  for (const { storyId, cloud } of candidates) {
    saveGame({ ...cloud, storyId });
    applied += 1;
  }
  return applied;
}

export async function checkCloudRestoreOffer(
  storyIds: string[]
): Promise<{ candidates: RestoreCandidate[]; cloudUpdatedAt: string } | null> {
  if (!getLocalPlayerEmail()) return null;

  const cloudSaves = await fetchCloudSaves(storyIds);
  const candidates = findRestoreCandidates(storyIds, cloudSaves);
  if (candidates.length === 0) return null;

  const cloudUpdatedAt = maxCloudUpdatedAt(candidates);
  if (wasRestoreOfferDismissed(cloudUpdatedAt)) return null;

  return { candidates, cloudUpdatedAt };
}
