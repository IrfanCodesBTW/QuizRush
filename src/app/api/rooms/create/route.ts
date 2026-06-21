import { NextResponse } from "next/server";
import { requireCurrentSession } from "@/server/auth/current-session";
import { createRoom } from "@/server/quiz-service";
import { errorResponse } from "@/server/http/errors";

export async function POST() {
  try {
    const session = await requireCurrentSession();
    const snapshot = await createRoom(session.playerId);
    return NextResponse.json({ snapshot });
  } catch (error) {
    return errorResponse(error, "Unable to create room.");
  }
}
