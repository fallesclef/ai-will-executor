import { NextResponse } from "next/server";
import {
  getPlayerByEmail,
  getPlayerProgressSummary,
  isStoreEnabled,
} from "@/lib/store/redis";

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
      return NextResponse.json({ storeEnabled: false, cases: {} });
    }

    let playerId = body.playerId;

    if (body.email) {
      const linked = await getPlayerByEmail(body.email);
      if (linked) playerId = linked;
    }

    const cases = await getPlayerProgressSummary(playerId, body.storyIds);

    return NextResponse.json({
      storeEnabled: true,
      playerId,
      cases,
    });
  } catch (error) {
    console.error("[api/progress]", error);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
