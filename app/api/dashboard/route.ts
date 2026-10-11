import { NextResponse } from "next/server";
import { loadNetwork } from "@/lib/network";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const locale = new URL(request.url).searchParams.get("lang") === "en" ? "en" : "es";
  return NextResponse.json(await loadNetwork(locale));
}
