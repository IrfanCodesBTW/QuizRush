import { NextResponse } from "next/server";
import { renderResultsPdf } from "@/server/pdf/report";
import { getRoomSnapshot } from "@/server/quiz-service";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ roomCode: string }> },
) {
  try {
    const { roomCode } = await context.params;
    const snapshot = await getRoomSnapshot(roomCode.toUpperCase());
    const pdf = await renderResultsPdf(snapshot);

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="quizrush-${snapshot.room.code}.pdf"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to export PDF." },
      { status: 404 },
    );
  }
}
