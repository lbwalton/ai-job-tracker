import { NextRequest, NextResponse } from "next/server";
import { disconnectGmail, gmailConnected, syncGmail } from "@/lib/gmail";

export const maxDuration = 300;

async function runSync() {
  if (!gmailConnected()) {
    return NextResponse.json({ error: "Gmail is not connected" }, { status: 409 });
  }
  try {
    const result = await syncGmail();
    return NextResponse.json({ result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 502 },
    );
  }
}

/** Manual sync from the UI. */
export async function POST() {
  return runSync();
}

/** Scheduled sync (Vercel Cron calls GET with Authorization: Bearer CRON_SECRET). */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runSync();
}

/** Disconnect Gmail. */
export async function DELETE() {
  disconnectGmail();
  return NextResponse.json({ ok: true });
}
