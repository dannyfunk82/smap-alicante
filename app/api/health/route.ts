import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { APP_VERSION, DEPLOYMENT_ID, APP_ENVIRONMENT } from "@/lib/system";

export const dynamic = "force-dynamic";

export async function GET() {
  const started = performance.now();
  try {
    await db.query("SELECT 1");
    return NextResponse.json({
      status: "ok", service: "smap-web", version: APP_VERSION, deploymentId: DEPLOYMENT_ID,
      environment: APP_ENVIRONMENT, database: "connected", databaseLatencyMs: Math.round(performance.now() - started), timestamp: new Date().toISOString(),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({
      status: "error", service: "smap-web", version: APP_VERSION, deploymentId: DEPLOYMENT_ID,
      environment: APP_ENVIRONMENT, database: "unavailable", timestamp: new Date().toISOString(),
    }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
