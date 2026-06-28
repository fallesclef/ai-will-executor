import type { PlayerState } from "@/types/story";

/** Anonymous analytics sync — no full save fields. */
export interface ProgressSummary {
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

export type StoredProgress = ProgressSummary | PlayerState;

export function toProgressSummary(state: PlayerState): ProgressSummary {
  return {
    storyId: state.storyId,
    playerId: state.playerId,
    phase: state.phase,
    currentNodeId: state.currentNodeId,
    stats: {
      legal: state.stats.legal,
      empathy: state.stats.empathy,
      suspicion: state.stats.suspicion,
    },
    choiceHistory: state.choiceHistory,
    flags: state.flags,
    endingId: state.endingId,
    verdictChoiceId: state.verdictChoiceId,
    startedAt: state.startedAt,
    completedAt: state.completedAt,
    updatedAt: state.updatedAt,
  };
}
