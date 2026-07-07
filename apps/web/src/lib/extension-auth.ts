import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getSetting, setSetting } from "./db";

const TOKEN_KEY = "extensionToken";

export function getExtensionToken(): string {
  let token = getSetting<string>(TOKEN_KEY);
  if (!token) {
    token = crypto.randomBytes(24).toString("hex");
    setSetting(TOKEN_KEY, token);
  }
  return token;
}

export function regenerateExtensionToken(): string {
  const token = crypto.randomBytes(24).toString("hex");
  setSetting(TOKEN_KEY, token);
  return token;
}

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

export function corsPreflight(): NextResponse {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/** Returns null when authorized, otherwise a ready-to-return 401 response. */
export function requireExtensionAuth(req: Request): NextResponse | null {
  const header = req.headers.get("authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "");
  if (token && token === getExtensionToken()) return null;
  return NextResponse.json(
    { error: "Invalid or missing extension token" },
    { status: 401, headers: CORS_HEADERS },
  );
}
