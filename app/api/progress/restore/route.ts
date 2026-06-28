import { NextResponse } from "next/server";
import {
  getPlayerByEmail,
  getPlayerFullSaves,
  isStoreEnabled,
} from "@/lib/store/redis";
import { normalizeCloudSave } from "@/lib/progress/normalize";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      playerId?: string;
      email?: string;
      storyIds?: string[];
    };

    if (!body.playerId || !body.storyIds?.length) {
      return NextResponse.json({ error: "invalid request" }, { status: 400 });
    }

    if (!isStoreEnabled()) {
      return NextResponse.json({ storeEnabled: false, saves: {} });
    }

    let playerId = body.playerId;

    if (body.email) {
      const linked = await getPlayerByEmail(body.email);
      if (linked) playerId = linked;
    }

    const raw = await getPlayerFullSaves(playerId, body.storyIds);
    const saves: Record<string, ReturnType<typeof normalizeCloudSave>> = {};

    for (const storyId of body.storyIds) {
      const normalized = raw[storyId]
        ? normalizeCloudSave(storyId, raw[storyId]!)
        : null;
      if (normalized) saves[storyId] = normalized;
    }

    return NextResponse.json({
      storeEnabled: true,
      playerId,
      saves,
    });
  } catch (error) {
    console.error("[api/progress/restore]", error);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
