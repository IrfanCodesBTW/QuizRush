import { NextResponse } from "next/server";
import { getRuntimeStatus } from "@/server/quiz-service";

export async function GET() {
  return NextResponse.json(await getRuntimeStatus());
}
