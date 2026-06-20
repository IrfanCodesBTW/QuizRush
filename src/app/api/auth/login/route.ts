import { NextResponse } from "next/server";
import { loginSchema } from "@/lib/validation";
import { attachSessionCookie } from "@/server/auth/session";
import { loginPlayer } from "@/server/quiz-service";

export async function POST(request: Request) {
  try {
    const body = loginSchema.parse(await request.json());
    const player = await loginPlayer(body);
    const response = NextResponse.json({ player });
    await attachSessionCookie(response, {
      playerId: player.id,
      username: player.username,
      email: body.email,
      isGuest: false,
    });
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to login." },
      { status: 401 },
    );
  }
}
