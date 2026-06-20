import { jwtVerify, SignJWT } from "jose";
import type { NextResponse } from "next/server";

export const sessionCookieName = "quizrush_session";

export interface SessionUser {
  playerId: string;
  username: string;
  email?: string;
  isGuest: boolean;
}

let fallbackSecret: Uint8Array | null = null;

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      if (!fallbackSecret) {
        // Fallback to a cryptographically secure random secret so the app doesn't crash.
        // Note: Sessions will invalidate on server restarts/cold starts.
        const bytes = new Uint8Array(32);
        if (typeof crypto !== "undefined" && crypto.getRandomValues) {
          crypto.getRandomValues(bytes);
        } else {
          // Edge case fallback
          for (let i = 0; i < 32; i++) {
            bytes[i] = Math.floor(Math.random() * 256);
          }
        }
        fallbackSecret = bytes;
        console.warn("[QuizRush] SESSION_SECRET is missing in production! Using an ephemeral random secret. Sessions will reset on cold starts.");
      }
      return fallbackSecret;
    }
    return new TextEncoder().encode("dev_secret_key_12345");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(session: SessionUser) {
  return new SignJWT({ ...session })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifySession(token?: string): Promise<SessionUser | null> {
  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!payload.playerId || !payload.username) {
      return null;
    }

    try {
      if (!payload.isGuest) {
        const { getSessionUserId } = await import("@/server/db/postgres");
        const dbUserId = await getSessionUserId(token);
        if (dbUserId === null) {
          return null;
        }
        if (dbUserId !== undefined && dbUserId !== String(payload.playerId)) {
          return null;
        }
      }
    } catch (err) {
      console.warn("[Postgres] Offline. Validating session via JWT fallback.");
    }

    return {
      playerId: String(payload.playerId),
      username: String(payload.username),
      email: payload.email ? String(payload.email) : undefined,
      isGuest: Boolean(payload.isGuest),
    };
  } catch {
    return null;
  }
}

export async function attachSessionCookie(response: NextResponse, session: SessionUser) {
  const token = await signSession(session);
  const expiresAt = new Date(Date.now() + 60 * 60 * 24 * 7 * 1000); // 7 days

  if (!session.isGuest) {
    try {
      const { createSession } = await import("@/server/db/postgres");
      await createSession(token, session.playerId, expiresAt);
    } catch (err) {
      console.warn("[Postgres] Failed to write session to DB:", err);
    }
  }

  response.cookies.set(sessionCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function clearSessionCookie(response: NextResponse, token?: string) {
  if (token) {
    import("@/server/db/postgres").then(({ deleteSession }) => {
      deleteSession(token).catch(() => undefined);
    }).catch(() => undefined);
  }

  response.cookies.set(sessionCookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
