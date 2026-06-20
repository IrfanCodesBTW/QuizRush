import { NextResponse } from "next/server";
import { guestSchema } from "@/lib/validation";
import { attachSessionCookie } from "@/server/auth/session";
import { createGuestPlayer } from "@/server/quiz-service";

export async function POST(request: Request) {
  try {
    const body = guestSchema.parse(await request.json().catch(() => ({})));
    const player = await createGuestPlayer(body.username);
    try {
      const { createUser } = await import("@/server/db/postgres");
      await createUser(player.id, `guest_${player.id}@local`, player.username, "guest");
    } catch (err) {
      console.warn("Failed to create guest user in postgres", err);
    }
    const response = NextResponse.json({ player });
    await attachSessionCookie(response, {
      playerId: player.id,
      username: player.username,
      isGuest: true,
    });
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create guest." },
      { status: 400 },
    );
  }
}
