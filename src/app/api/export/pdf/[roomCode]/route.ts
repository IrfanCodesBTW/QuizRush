import { NextResponse } from "next/server";
import { renderResultsPdf } from "@/server/pdf/report";
import { getRoomSnapshot } from "@/server/quiz-service";

import { requireCurrentSession } from "@/server/auth/current-session";
import { errorResponse, ForbiddenError } from "@/server/http/errors";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ roomCode: string }> },
) {
  try {
    const session = await requireCurrentSession();
    const { roomCode } = await context.params;
    const snapshot = await getRoomSnapshot(roomCode.toUpperCase());

    const isMember = snapshot.players.some((p) => p.id === session.playerId);
    if (!isMember) {
      throw new ForbiddenError("Not authorized to view this room.");
    }

    const pdf = await renderResultsPdf(snapshot);

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="quizrush-${snapshot.room.code}.pdf"`,
      },
    });
  } catch (error) {
    return errorResponse(error, "Unable to export PDF.");
  }
}
