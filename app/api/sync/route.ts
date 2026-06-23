import { NextResponse } from "next/server";
import type { PlayerState } from "@/types/story";
import { isStoreEnabled, saveProgress } from "@/lib/store/redis";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      state: PlayerState;
      event?: {
        type: string;
        nodeId?: string;
        choiceId?: string;
        endingId?: string;
        timestamp: string;
      };
    };

    if (!body.state?.storyId || !body.state?.playerId) {
      return NextResponse.json({ error: "invalid state" }, { status: 400 });
    }

    if (!isStoreEnabled()) {
      return NextResponse.json({ ok: true, storeEnabled: false });
    }

    const { state, event } = body;

    await saveProgress(
      {
        storyId: state.storyId,
        playerId: state.playerId,
        phase: state.phase,
        currentNodeId: state.currentNodeId,
        stats: state.stats,
        choiceHistory: state.choiceHistory,
        flags: state.flags,
        endingId: state.endingId,
        verdictChoiceId: state.verdictChoiceId,
        startedAt: state.startedAt,
        completedAt: state.completedAt,
        updatedAt: state.updatedAt,
      },
      event
        ? {
            type: event.type,
            choiceId: event.choiceId,
            endingId: event.endingId,
          }
        : undefined
    );

    return NextResponse.json({ ok: true, storeEnabled: true });
  } catch (error) {
    console.error("[api/sync]", error);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
