import { Redis } from "@upstash/redis";

export interface StoredPlayer {
  id: string;
  email: string | null;
  executorName: string | null;
  createdAt: string;
  lastSeenAt: string;
}

export interface StoredProgress {
  storyId: string;
  playerId: string;
  phase: string;
  currentNodeId: string;
  stats: { legal: number; empathy: number; suspicion: number };
  choiceHistory: string[];
  flags: string[];
  endingId: string | null;
  verdictChoiceId: string | null;
  startedAt: string;
  completedAt: string | null;
  updatedAt: string;
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
  }

  if (event?.type === "complete" && progress.endingId) {
    await r.incr(KEYS.complete(storyId));
    await r.incr(KEYS.ending(storyId, progress.endingId));
    if (progress.verdictChoiceId) {
      await r.incr(KEYS.choice(storyId, progress.verdictChoiceId));
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
    let completeCount = 0;
    let inProgress = 0;

    for (const pid of storyPlayerIds) {
      const p = await r.get<StoredProgress>(KEYS.progress(storyId, pid));
      if (!p) continue;
      if (p.phase === "ending" && p.completedAt) completeCount++;
      else inProgress++;
    }

    const completeKey = await r.get<number>(KEYS.complete(storyId));
    completeCount = Math.max(completeCount, completeKey ?? 0);

    byStory[storyId] = {
      players: storyPlayerIds.length,
      completions: completeCount,
      inProgress,
    };
  }

  const keys = await r.keys("awe:stat:choice:*");
  for (const key of keys) {
    const val = await r.get<number>(key);
    const parts = key.split(":");
    const choiceId = parts.slice(4).join(":");
    const storyId = parts[3];
    choices[`${storyId}/${choiceId}`] = val ?? 0;
  }

  const endingKeys = await r.keys("awe:stat:ending:*");
  for (const key of endingKeys) {
    const val = await r.get<number>(key);
    const parts = key.split(":");
    const endingId = parts.slice(4).join(":");
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
