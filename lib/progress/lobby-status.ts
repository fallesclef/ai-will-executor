import { loadGame } from "@/lib/engine";

export type CaseProgressStatus = "none" | "in_progress" | "completed";

export interface CaseLobbyStatus {
  status: CaseProgressStatus;
  /** True when status comes from Redis and this browser has no local save */
  fromCloud?: boolean;
}

export function getLocalCaseLobbyStatus(caseId: string): CaseLobbyStatus {
  const save = loadGame(caseId);
  if (!save) return { status: "none" };

  if (save.verdictChoiceId || save.phase === "ending") {
    return { status: "completed" };
  }

  const inProgress =
    save.choiceHistory.length > 0 ||
    save.viewedNodes.length > 1 ||
    save.phase !== "intro";

  return { status: inProgress ? "in_progress" : "none" };
}

export function getLocalLobbyStatuses(
  caseIds: string[]
): Record<string, CaseLobbyStatus> {
  const out: Record<string, CaseLobbyStatus> = {};
  for (const id of caseIds) {
    out[id] = getLocalCaseLobbyStatus(id);
  }
  return out;
}

function rankStatus(status: CaseProgressStatus): number {
  if (status === "completed") return 2;
  if (status === "in_progress") return 1;
  return 0;
}

export function mergeLobbyStatus(
  local: CaseLobbyStatus,
  remote: { completed: boolean; inProgress: boolean } | undefined,
  hasLocalSave: boolean
): CaseLobbyStatus {
  if (!remote) return local;

  const remoteStatus: CaseProgressStatus = remote.completed
    ? "completed"
    : remote.inProgress
      ? "in_progress"
      : "none";

  const merged =
    rankStatus(local.status) >= rankStatus(remoteStatus)
      ? local.status
      : remoteStatus;

  const fromCloud =
    !hasLocalSave &&
    rankStatus(remoteStatus) > 0 &&
    rankStatus(local.status) < rankStatus(remoteStatus);

  return { status: merged, fromCloud: fromCloud || undefined };
}

export function mergeLobbyStatuses(
  local: Record<string, CaseLobbyStatus>,
  remote: Record<string, { completed: boolean; inProgress: boolean }>,
  caseIds: string[]
): Record<string, CaseLobbyStatus> {
  const out: Record<string, CaseLobbyStatus> = {};
  for (const id of caseIds) {
    const hasLocalSave = local[id]?.status !== "none" || loadGame(id) !== null;
    out[id] = mergeLobbyStatus(
      local[id] ?? { status: "none" },
      remote[id],
      !!loadGame(id)
    );
  }
  return out;
}

export function isCaseLobbyCompleted(status: CaseLobbyStatus | undefined): boolean {
  return status?.status === "completed";
}

export function isCaseLobbyInProgress(status: CaseLobbyStatus | undefined): boolean {
  return status?.status === "in_progress";
}
