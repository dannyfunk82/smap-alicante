import { NextResponse } from "next/server";
import { arrivalsForStop, loadNetwork } from "@/lib/network";
import { scheduledDeparturesForStop } from "@/lib/gtfs";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const locale = new URL(request.url).searchParams.get("lang") === "en" ? "en" : "es";
  const network = await loadNetwork(locale);
  const stop = network.lines.flatMap((line) => line.stops).find((item) => item.id === id);
  if (!stop) return NextResponse.json({ error: "Stop not found" }, { status: 404 });
  const lines = network.lines.filter((line) => line.stops.some((item) => item.id === id)).map((line) => ({ id: line.id, code: line.code, name: line.name, color: line.color }));
  const scheduledDepartures = await scheduledDeparturesForStop(id, locale);
  return NextResponse.json({ stop, lines, arrivals: arrivalsForStop(network, id), scheduledDepartures, generatedAt: network.generatedAt });
}
