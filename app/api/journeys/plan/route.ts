import { NextResponse } from "next/server";
import { loadNetwork, planDirectJourneys } from "@/lib/network";
import { currentApiSession } from "@/lib/api-session";
import { trackAnalyticsEvent } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { originStopId?: string; destinationStopId?: string; lang?: "es" | "en" } | null;
  if (!body?.originStopId || !body.destinationStopId || body.originStopId === body.destinationStopId) {
    return NextResponse.json({ error: "Choose two different stops" }, { status: 400 });
  }
  const locale = body.lang === "en" ? "en" : "es";
  const network = await loadNetwork(locale);
  const journeys = planDirectJourneys(network, body.originStopId, body.destinationStopId);
  const session = await currentApiSession();
  if (session) await trackAnalyticsEvent({ userId: session.sub, eventName: "journey_planned", section: "planner", properties: { resultCount: journeys.length } });
  return NextResponse.json({ journeys, generatedAt: network.generatedAt });
}
