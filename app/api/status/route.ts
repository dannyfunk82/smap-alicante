import { NextResponse } from "next/server";
import { publicSystemStatus } from "@/lib/system";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const locale = new URL(request.url).searchParams.get("lang") === "en" ? "en" : "es";
  const status = await publicSystemStatus(locale);
  return NextResponse.json(status, {
    status: status.database === "connected" ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
