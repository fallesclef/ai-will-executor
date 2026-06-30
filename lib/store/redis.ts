import { Redis } from "@upstash/redis";
import type { PlayerState } from "@/types/story";
import {
  type StoredProgress,
  toProgressSummary,
} from "@/lib/store/progress-types";

export type { StoredProgress, ProgressSummary } from "@/lib/store/progress-types";
export { toProgressSummary };

export interface StoredPlayer {
  id: string;
  email: string | null;
  executorName: string | null;
  createdAt: string;
  lastSeenAt: string;
}

export interface RegisteredPlayerRow {
  id: string;
  email: string;
  executorName: string | null;
  createdAt: string;
  lastSeenAt: string;
}

export interface AdminStats {
  enabled: boolean;
  players: number;
  activeSessions: number;
  completions: Record<string, number>;
  verdicts: Record<string, number>;
  choices: Record<string, number>;
  registeredPlayers: RegisteredPlayerRow[];
  byStory: Record<
    string,
    {
      players: number;
      completions: number;
      inProgress: number;
    }
  >;
}

let redis: Redis | null = null;

export function isStoreEnabled(): boolean {
  return Boolean(
    process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
  );
}

function getRedis(): Redis {
  if (!redis) {
    redis = Redis.fromEnv();
  }
  return redis;
}

const KEYS = {
  player: (id: string) => `awe:player:${id}`,
  email: (email: string) => `awe:email:${email}`,
  progress: (storyId: string, playerId: string) =>
    `awe:progress:${storyId}:${playerId}`,
  players: "awe:players",
  choice: (storyId: string, choiceId: string) =>
    `awe:stat:choice:${storyId}:${choiceId}`,
  ending: (storyId: string, endingId: string) =>
    `awe:stat:ending:${storyId}:${endingId}`,
  complete: (storyId: string) => `awe:stat:complete:${storyId}`,
  storyPlayers: (storyId: string) => `awe:stat:story:${storyId}:players`,
  choiceIndex: (storyId: string) => `awe:idx:choice:${storyId}`,
  endingIndex: "awe:idx:ending",
};

export async function upsertPlayer(
  playerId: string,
  email?: string | null,
  executorName?: string | null
): Promise<StoredPlayer> {
  const r = getRedis();
  const now = new Date().toISOString();
  const existing = await r.get<StoredPlayer>(KEYS.player(playerId));
  const trimmedName =
    executorName == null ? undefined : executorName.trim();

  const player: StoredPlayer = {
    id: playerId,
    email: email?.trim().toLowerCase() ?? existing?.email ?? null,
    executorName:
      trimmedName === undefined
        ? (existing?.executorName ?? null)
        : trimmedName || null,
    createdAt: existing?.createdAt ?? now,
    lastSeenAt: now,
  };

  await r.set(KEYS.player(playerId), player);
  await r.sadd(KEYS.players, playerId);

  if (player.email) {
    await r.set(KEYS.email(player.email), playerId);
  }

  return player;
}

export async function getPlayer(
  playerId: string
): Promise<StoredPlayer | null> {
  const r = getRedis();
  return r.get<StoredPlayer>(KEYS.player(playerId));
}

export async function getPlayerByEmail(
  email: string
): Promise<string | null> {
  const r = getRedis();
  return r.get<string>(KEYS.email(email.trim().toLowerCase()));
}

export async function getPlayerProgressSummary(
  playerId: string,
  storyIds: string[]
): Promise<Record<string, { completed: boolean; inProgress: boolean }>> {
  const r = getRedis();
  const result: Record<string, { completed: boolean; inProgress: boolean }> =
    {};

  for (const storyId of storyIds) {
    const progress = await r.get<StoredProgress>(
      KEYS.progress(storyId, playerId)
    );

    if (!progress) {
      result[storyId] = { completed: false, inProgress: false };
      continue;
    }

    const completed =
      !!progress.verdictChoiceId || progress.phase === "ending";
    const inProgress =
      !completed &&
      (progress.choiceHistory.length > 0 || progress.phase !== "intro");

    result[storyId] = { completed, inProgress };
  }

  return result;
}

export async function getPlayerFullSaves(
  playerId: string,
  storyIds: string[]
): Promise<Record<string, PlayerState | null>> {
  const r = getRedis();
  const result: Record<string, PlayerState | null> = {};

  for (const storyId of storyIds) {
    const raw = await r.get<StoredProgress>(KEYS.progress(storyId, playerId));
    if (
      raw &&
      Array.isArray((raw as PlayerState).viewedNodes) &&
      typeof (raw as PlayerState).nodeChoices === "object"
    ) {
      result[storyId] = raw as PlayerState;
    } else {
      result[storyId] = null;
    }
  }

  return result;
}

export async function saveProgress(
  progress: StoredProgress,
  event?: {
    type: string;
    choiceId?: string;
    endingId?: string;
  }
): Promise<void> {
  const r = getRedis();
  const { storyId, playerId } = progress;

  await r.set(KEYS.progress(storyId, playerId), progress);
  await r.sadd(KEYS.storyPlayers(storyId), playerId);

  if (event?.choiceId) {
    await r.incr(KEYS.choice(storyId, event.choiceId));
    await r.sadd(KEYS.choiceIndex(storyId), event.choiceId);
  }

  if (event?.type === "complete" && progress.endingId) {
    await r.incr(KEYS.complete(storyId));
    await r.incr(KEYS.ending(storyId, progress.endingId));
    await r.sadd(KEYS.endingIndex, `${storyId}:${progress.endingId}`);
    if (progress.verdictChoiceId) {
      await r.incr(KEYS.choice(storyId, progress.verdictChoiceId));
      await r.sadd(KEYS.choiceIndex(storyId), progress.verdictChoiceId);
    }
  }
}

import { listCases } from "@/data/cases";

export async function getAdminStats(): Promise<AdminStats> {
  if (!isStoreEnabled()) {
    return {
      enabled: false,
      players: 0,
      activeSessions: 0,
      completions: {},
      verdicts: {},
      choices: {},
      registeredPlayers: [],
      byStory: {},
    };
  }

  const r = getRedis();
  const playerIds = (await r.smembers(KEYS.players)) as string[];
  const registeredPlayers: RegisteredPlayerRow[] = [];

  for (const playerId of playerIds) {
    const player = await r.get<StoredPlayer>(KEYS.player(playerId));
    if (!player?.email) continue;
    registeredPlayers.push({
      id: player.id,
      email: player.email,
      executorName: player.executorName ?? null,
      createdAt: player.createdAt,
      lastSeenAt: player.lastSeenAt,
    });
  }

  registeredPlayers.sort(
    (a, b) =>
      new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime()
  );

  const completions: Record<string, number> = {};
  const verdicts: Record<string, number> = {};
  const choices: Record<string, number> = {};
  const byStory: AdminStats["byStory"] = {};

  const storyIds = listCases()
    .filter((c) => c.status === "available")
    .map((c) => c.id);

  for (const storyId of storyIds) {
    const storyPlayerIds = (await r.smembers(
      KEYS.storyPlayers(storyId)
    )) as string[];
    const completeKey = await r.get<number>(KEYS.complete(storyId));
    const completeCount = completeKey ?? 0;

    byStory[storyId] = {
      players: storyPlayerIds.length,
      completions: completeCount,
      inProgress: Math.max(0, storyPlayerIds.length - completeCount),
    };

    const choiceIds = (await r.smembers(
      KEYS.choiceIndex(storyId)
    )) as string[];
    for (const choiceId of choiceIds) {
      const val = await r.get<number>(KEYS.choice(storyId, choiceId));
      choices[`${storyId}/${choiceId}`] = val ?? 0;
    }
  }

  const endingRefs = (await r.smembers(KEYS.endingIndex)) as string[];
  for (const ref of endingRefs) {
    const sep = ref.indexOf(":");
    if (sep < 0) continue;
    const storyId = ref.slice(0, sep);
    const endingId = ref.slice(sep + 1);
    const val = await r.get<number>(KEYS.ending(storyId, endingId));
    verdicts[endingId] = val ?? 0;
  }

  for (const storyId of storyIds) {
    const c = await r.get<number>(KEYS.complete(storyId));
    if (c) completions[storyId] = c;
  }

  return {
    enabled: true,
    players: playerIds.length,
    activeSessions: playerIds.length,
    completions,
    verdicts,
    choices,
    registeredPlayers,
    byStory,
  };
}
