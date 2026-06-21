import { NextResponse } from "next/server";
import { getRoomSnapshot } from "@/server/quiz-service";

import { requireCurrentSession } from "@/server/auth/current-session";
import { errorResponse, ForbiddenError } from "@/server/http/errors";

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
      throw new ForbiddenError("Not authorized to view this room.");
    }

    return NextResponse.json({ leaderboard: snapshot.leaderboard });
  } catch (error) {
    return errorResponse(error, "Unable to load leaderboard.");
  }
}
