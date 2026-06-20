import { NextResponse } from "next/server";
import { requireCurrentSession } from "@/server/auth/current-session";
import { createRoom } from "@/server/quiz-service";

export async function POST() {
  try {
    const session = await requireCurrentSession();
    const snapshot = await createRoom(session.playerId);
    return NextResponse.json({ snapshot });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create room." },
      { status: 400 },
    );
  }
}
