import { cookies } from "next/headers";
import { sessionCookieName, verifySession } from "@/server/auth/session";
import { getValkeyStore } from "@/server/valkey/store";
import { playerKey } from "@/server/valkey/keys";

export async function getCurrentSession() {
  const cookieStore = await cookies();
  return verifySession(cookieStore.get(sessionCookieName)?.value);
}

export async function requireCurrentSession() {
  const session = await getCurrentSession();
  if (!session) {
    throw new Error("Sign in or continue as guest first.");
  }

  // Ensure player exists in Valkey to prevent redirect loops and missing host controls
  try {
    const valkey = getValkeyStore();
    const hash = await valkey.hgetall(playerKey(session.playerId));
    if (!hash.id) {
      await valkey.hset(playerKey(session.playerId), {
        id: session.playerId,
        username: session.username,
        avatar: "QR",
        score: 0,
        streak: 0,
        isGuest: session.isGuest,
        joinedAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.warn("Failed to sync session to Valkey:", err);
  }

  return session;
}
