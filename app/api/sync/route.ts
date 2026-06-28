import { NextResponse } from "next/server";
import type { PlayerState } from "@/types/story";
import {
  getPlayer,
  getPlayerByEmail,
  isStoreEnabled,
  saveProgress,
  toProgressSummary,
} from "@/lib/store/redis";

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
    const player = await getPlayer(state.playerId);
    const payload = player?.email ? state : toProgressSummary(state);

    await saveProgress(
      payload,
      event
        ? {
            type: event.type,
            choiceId: event.choiceId,
            endingId: event.endingId,
          }
        : undefined
    );

    return NextResponse.json({
      ok: true,
      storeEnabled: true,
      fullSave: !!player?.email,
    });
  } catch (error) {
    console.error("[api/sync]", error);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
