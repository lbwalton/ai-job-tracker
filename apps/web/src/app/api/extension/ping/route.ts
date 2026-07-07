import { NextResponse } from "next/server";
import { CORS_HEADERS, corsPreflight, requireExtensionAuth } from "@/lib/extension-auth";

export function OPTIONS() {
  return corsPreflight();
}

export async function GET(req: Request) {
  const unauthorized = requireExtensionAuth(req);
  if (unauthorized) return unauthorized;
  return NextResponse.json({ ok: true, app: "jobtrackr", version: 2 }, { headers: CORS_HEADERS });
}
