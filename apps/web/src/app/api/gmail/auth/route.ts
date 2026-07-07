import { NextResponse } from "next/server";
import { buildAuthUrl, gmailConfigured } from "@/lib/gmail";

export async function GET() {
  if (!gmailConfigured()) {
    return NextResponse.json(
      {
        error:
          "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in apps/web/.env.local first (see docs/SETUP.md)",
      },
      { status: 503 },
    );
  }
  return NextResponse.redirect(buildAuthUrl());
}
