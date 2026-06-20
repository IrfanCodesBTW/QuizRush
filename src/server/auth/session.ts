import { jwtVerify, SignJWT } from "jose";
import type { NextResponse } from "next/server";

export const sessionCookieName = "quizrush_session";

export interface SessionUser {
  playerId: string;
  username: string;
  email?: string;
  isGuest: boolean;
}

function getSecret() {
  const secret =
    process.env.SESSION_SECRET ??
    "quizrush-local-development-secret-change-before-production";
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
  response.cookies.set(sessionCookieName, await signSession(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(sessionCookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
