import { NextResponse } from "next/server";
import {
  getPlayerByEmail,
  isStoreEnabled,
  upsertPlayer,
} from "@/lib/store/redis";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      playerId?: string;
      email?: string;
      executorName?: string;
    };

    if (!body.playerId) {
      return NextResponse.json({ error: "playerId required" }, { status: 400 });
    }

    if (!isStoreEnabled()) {
      return NextResponse.json({
        playerId: body.playerId,
        email: body.email ?? null,
        storeEnabled: false,
      });
    }

    let playerId = body.playerId;

    if (body.email) {
      const existing = await getPlayerByEmail(body.email);
      if (existing) {
        playerId = existing;
      }
    }

    const player = await upsertPlayer(
      playerId,
      body.email ?? null,
      body.executorName
    );

    return NextResponse.json({
      playerId: player.id,
      email: player.email,
      executorName: player.executorName,
      storeEnabled: true,
    });
  } catch (error) {
    console.error("[api/player]", error);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
