import { NextResponse } from "next/server";
import { gameRoomSchema } from "@/lib/validation";
import { requireCurrentSession } from "@/server/auth/current-session";
import { startGame } from "@/server/quiz-service";

export async function POST(request: Request) {
  try {
    const session = await requireCurrentSession();
    const body = gameRoomSchema.parse(await request.json());
    const snapshot = await startGame(body.roomCode, session.playerId);
    return NextResponse.json({ snapshot });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to start game." },
      { status: 400 },
    );
  }
}
