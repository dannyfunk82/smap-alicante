import { NextResponse } from "next/server";
import { currentAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { requestIp } from "@/lib/request";
import type { IntegrationMode } from "@/lib/types";

export async function PATCH(request: Request) {
  const session = await currentAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json().catch(() => null) as { mode?: IntegrationMode; fallbackEnabled?: boolean; maxAgeSeconds?: number; activeSourceId?: string | null } | null;
  if (!body || !["demo","hybrid","external"].includes(String(body.mode))) return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  const maxAgeSeconds = Math.round(Number(body.maxAgeSeconds ?? 45));
  if (maxAgeSeconds < 10 || maxAgeSeconds > 600) return NextResponse.json({ error: "Invalid max age" }, { status: 400 });
  if (body.activeSourceId) {
    const source = await db.query("SELECT 1 FROM integration_sources WHERE id=$1", [body.activeSourceId]);
    if (!source.rowCount) return NextResponse.json({ error: "Source not found" }, { status: 404 });
  }
  await db.query(
    `INSERT INTO integration_settings(id,mode,fallback_enabled,max_age_seconds,active_source_id,updated_at)
     VALUES(1,$1,$2,$3,$4,NOW())
     ON CONFLICT(id) DO UPDATE SET mode=EXCLUDED.mode,fallback_enabled=EXCLUDED.fallback_enabled,max_age_seconds=EXCLUDED.max_age_seconds,active_source_id=EXCLUDED.active_source_id,updated_at=NOW()`,
    [body.mode, Boolean(body.fallbackEnabled), maxAgeSeconds, body.activeSourceId ?? null],
  );
  await recordAudit({ actorUserId: session.sub, actorEmail: session.email, action: "admin.integration_settings_changed", entityType: "integration", ipAddress: requestIp(request), details: body });
  return NextResponse.json({ ok: true });
}
