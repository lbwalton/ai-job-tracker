import { NextResponse } from "next/server";
import { EMPTY_PROFILE } from "@jobtrackr/core";
import { getSetting } from "@/lib/db";
import { CORS_HEADERS, corsPreflight, requireExtensionAuth } from "@/lib/extension-auth";

export function OPTIONS() {
  return corsPreflight();
}

export async function GET(req: Request) {
  const unauthorized = requireExtensionAuth(req);
  if (unauthorized) return unauthorized;
  const profile = getSetting("profile") ?? EMPTY_PROFILE;
  return NextResponse.json({ profile }, { headers: CORS_HEADERS });
}
