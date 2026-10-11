import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const requestId = request.headers.get("x-request-id") || crypto.randomUUID();
  requestHeaders.set("x-request-id", requestId);
  requestHeaders.set("x-smap-version", "1.0.0");
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("x-request-id", requestId);
  response.headers.set("x-smap-version", "1.0.0");
  response.headers.set("x-smap-deployment-id", process.env.NEXT_DEPLOYMENT_ID || process.env.SMAP_RELEASE || "local-1.0.0");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/).*)"],
};
