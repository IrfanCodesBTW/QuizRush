import { NextResponse } from "next/server";
import { getCurrentSession } from "@/server/auth/current-session";

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session || session.isGuest) {
      return NextResponse.json({ history: [] });
    }

    const { getUserHistory } = await import("@/server/db/postgres");
    const historyData = await getUserHistory(session.playerId);
    return NextResponse.json({ history: historyData });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to retrieve history." },
      { status: 500 }
    );
  }
}
