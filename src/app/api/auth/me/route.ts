import { NextResponse } from "next/server";
import { getCurrentSession } from "@/server/auth/current-session";

export async function GET() {
  const session = await getCurrentSession();
  return NextResponse.json({ session });
}
