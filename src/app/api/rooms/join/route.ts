import { NextResponse } from "next/server";
import { joinRoomSchema } from "@/lib/validation";
import { requireCurrentSession } from "@/server/auth/current-session";
import { joinRoom } from "@/server/quiz-service";

export async function POST(request: Request) {
  try {
    const session = await requireCurrentSession();
    const body = joinRoomSchema.parse(await request.json());
    const snapshot = await joinRoom(body.roomCode, session.playerId);
    return NextResponse.json({ snapshot });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to join room." },
      { status: 400 },
    );
  }
}
