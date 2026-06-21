import { NextResponse } from "next/server";
import { answerSchema } from "@/lib/validation";
import { requireCurrentSession } from "@/server/auth/current-session";
import { submitAnswer } from "@/server/quiz-service";
import { errorResponse } from "@/server/http/errors";

export async function POST(request: Request) {
  try {
    const session = await requireCurrentSession();
    const body = answerSchema.parse(await request.json());
    const snapshot = await submitAnswer({ ...body, playerId: session.playerId });
    return NextResponse.json({ snapshot });
  } catch (error) {
    return errorResponse(error, "Unable to submit answer.");
  }
}
