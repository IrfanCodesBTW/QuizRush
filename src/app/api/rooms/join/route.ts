import { NextResponse } from "next/server";
import { joinRoomSchema } from "@/lib/validation";
import { requireCurrentSession } from "@/server/auth/current-session";
import { joinRoom } from "@/server/quiz-service";
import { z } from "zod";
import { errorResponse } from "@/server/http/errors";

export async function POST(request: Request) {
  try {
    const session = await requireCurrentSession();
    const body = joinRoomSchema.parse(await request.json());
    const snapshot = await joinRoom(body.roomCode, session.playerId);
    return NextResponse.json({ snapshot });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const roomCodeIssue = error.issues.find((issue) => issue.path.includes("roomCode"));
      if (roomCodeIssue) {
        return NextResponse.json(
          { error: "Room codes look like QR-7421 — check the code and try again." },
          { status: 400 },
        );
      }
    }
    return errorResponse(error, "Unable to join room.");
  }
}
