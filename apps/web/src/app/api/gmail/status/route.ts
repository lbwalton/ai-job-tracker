import { NextResponse } from "next/server";
import { getSetting } from "@/lib/db";
import { gmailConfigured, gmailConnected } from "@/lib/gmail";

export async function GET() {
  return NextResponse.json({
    configured: gmailConfigured(),
    connected: gmailConnected(),
    lastSync: getSetting("gmailLastSyncResult"),
  });
}
