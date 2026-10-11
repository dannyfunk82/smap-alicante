import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { APP_VERSION, DEPLOYMENT_ID } from "@/lib/system";

export const dynamic = "force-dynamic";

export async function GET() {
  const started = performance.now();
  try {
    await db.query("SELECT 1 FROM runtime_settings WHERE id=1");
    await db.query("SELECT 1 FROM integration_settings WHERE id=1");
    return NextResponse.json({
      status: "ready", service: "smap-web", version: APP_VERSION, deploymentId: DEPLOYMENT_ID,
      database: "connected", latencyMs: Math.round(performance.now() - started), timestamp: new Date().toISOString(),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({
      status: "not_ready", service: "smap-web", version: APP_VERSION,
      database: "unavailable", error: error instanceof Error ? error.message : "Readiness check failed", timestamp: new Date().toISOString(),
    }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
