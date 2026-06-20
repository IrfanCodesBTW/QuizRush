import { NextResponse } from "next/server";
import { registerSchema } from "@/lib/validation";
import { attachSessionCookie } from "@/server/auth/session";
import { registerPlayer } from "@/server/quiz-service";

export async function POST(request: Request) {
  try {
    const body = registerSchema.parse(await request.json());
    const player = await registerPlayer(body);
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
      { error: error instanceof Error ? error.message : "Unable to register." },
      { status: 400 },
    );
  }
}
