import { NextResponse } from "next/server";
import { getRoomSnapshot } from "@/server/quiz-service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ roomCode: string }> },
) {
  try {
    const { roomCode } = await context.params;
    const snapshot = await getRoomSnapshot(roomCode.toUpperCase());
    return NextResponse.json({ events: snapshot.events });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load events." },
      { status: 404 },
    );
  }
}
