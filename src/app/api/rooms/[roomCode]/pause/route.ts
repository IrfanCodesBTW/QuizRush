import { requireCurrentSession } from "@/server/auth/current-session";
import { pauseGame } from "@/server/quiz-service";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  try {
    const session = await requireCurrentSession();
    if (!session?.playerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { roomCode } = await params;

    await pauseGame(roomCode, session.playerId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
