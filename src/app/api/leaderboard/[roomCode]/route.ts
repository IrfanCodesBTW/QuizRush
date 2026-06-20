import { NextResponse } from "next/server";
import { getRoomSnapshot } from "@/server/quiz-service";

import { requireCurrentSession } from "@/server/auth/current-session";

export async function GET(
  _request: Request,
  context: { params: Promise<{ roomCode: string }> },
) {
  try {
    const session = await requireCurrentSession();
    const { roomCode } = await context.params;
    const snapshot = await getRoomSnapshot(roomCode.toUpperCase());

    const isMember = snapshot.players.some((p) => p.id === session.playerId);
    if (!isMember) {
      throw new Error("Not authorized to view this room.");
    }

    return NextResponse.json({ leaderboard: snapshot.leaderboard });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load leaderboard." },
      { status: 404 },
    );
  }
}
