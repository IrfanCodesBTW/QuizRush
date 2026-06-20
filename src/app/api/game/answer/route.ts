import { NextResponse } from "next/server";
import { answerSchema } from "@/lib/validation";
import { requireCurrentSession } from "@/server/auth/current-session";
import { submitAnswer } from "@/server/quiz-service";

export async function POST(request: Request) {
  try {
    const session = await requireCurrentSession();
    const body = answerSchema.parse(await request.json());
    const snapshot = await submitAnswer({ ...body, playerId: session.playerId });
    return NextResponse.json({ snapshot });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to submit answer." },
      { status: 400 },
    );
  }
}
