import { cookies } from "next/headers";
import { sessionCookieName, verifySession } from "@/server/auth/session";

export async function getCurrentSession() {
  const cookieStore = await cookies();
  return verifySession(cookieStore.get(sessionCookieName)?.value);
}

export async function requireCurrentSession() {
  const session = await getCurrentSession();
  if (!session) {
    throw new Error("Sign in or continue as guest first.");
  }
  return session;
}
