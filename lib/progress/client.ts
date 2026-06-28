"use client";

import { getLocalPlayerEmail, getLocalPlayerId } from "@/lib/player/client";
import {
  getLocalLobbyStatuses,
  mergeLobbyStatuses,
  type CaseLobbyStatus,
} from "@/lib/progress/lobby-status";

export async function fetchLobbyCaseStatuses(
  caseIds: string[]
): Promise<Record<string, CaseLobbyStatus>> {
  const local = getLocalLobbyStatuses(caseIds);

  try {
    const res = await fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerId: getLocalPlayerId(),
        email: getLocalPlayerEmail() ?? undefined,
        storyIds: caseIds,
      }),
    });

    if (!res.ok) return local;

    const data = (await res.json()) as {
      storeEnabled?: boolean;
      cases?: Record<string, { completed: boolean; inProgress: boolean }>;
    };

    if (!data.storeEnabled || !data.cases) return local;

    return mergeLobbyStatuses(local, data.cases, caseIds);
  } catch {
    return local;
  }
}
