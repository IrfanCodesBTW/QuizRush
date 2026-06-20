import { NextResponse } from "next/server";
import { requireCurrentSession } from "@/server/auth/current-session";
import { getActiveRooms, getGlobalEvents } from "@/server/quiz-service";

export async function GET() {
  try {
    await requireCurrentSession();
    const rooms = await getActiveRooms();
    const globalEvents = await getGlobalEvents();
    return NextResponse.json({ rooms, globalEvents });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to fetch active rooms." },
      { status: 400 },
    );
  }
}
