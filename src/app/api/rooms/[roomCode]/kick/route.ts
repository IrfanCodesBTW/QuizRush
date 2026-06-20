import { requireCurrentSession } from "@/server/auth/current-session";
import { kickPlayer } from "@/server/quiz-service";
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
    const { playerId } = await request.json();

    if (!playerId) {
      return NextResponse.json({ error: "playerId is required" }, { status: 400 });
    }

    await kickPlayer(roomCode, playerId, session.playerId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
