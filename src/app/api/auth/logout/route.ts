import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { clearSessionCookie, sessionCookieName } from "@/server/auth/session";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;
  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response, token);
  return response;
}
