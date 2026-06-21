import { NextResponse } from "next/server";
import { gameRoomSchema } from "@/lib/validation";
import { requireCurrentSession } from "@/server/auth/current-session";
import { revealQuestion } from "@/server/quiz-service";
import { errorResponse } from "@/server/http/errors";

export async function POST(request: Request) {
  try {
    const session = await requireCurrentSession();
    const body = gameRoomSchema.parse(await request.json());
    const snapshot = await revealQuestion(body.roomCode, session.playerId);
    return NextResponse.json({ snapshot });
  } catch (error) {
    return errorResponse(error, "Unable to reveal question.");
  }
}
