import { SignJWT, jwtVerify } from "jose";
import type { UserRole } from "@/lib/types";

export const SESSION_COOKIE = "smap_session";

export type SessionPayload = {
  sub: string;
  email: string;
  name: string;
  language: "es" | "en";
  role: UserRole;
  sessionVersion: number;
};

function secret(): Uint8Array {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) throw new Error("AUTH_SECRET must contain at least 32 characters");
  return new TextEncoder().encode(value);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({
    email: payload.email,
    name: payload.name,
    language: payload.language,
    role: payload.role,
    sv: payload.sessionVersion,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub || typeof payload.email !== "string" || typeof payload.name !== "string") return null;
    return {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      language: payload.language === "en" ? "en" : "es",
      role: payload.role === "admin" ? "admin" : "citizen",
      sessionVersion: typeof payload.sv === "number" ? payload.sv : 1,
    };
  } catch {
    return null;
  }
}
