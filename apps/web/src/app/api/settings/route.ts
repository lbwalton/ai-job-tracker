import { NextRequest, NextResponse } from "next/server";
import { aiAvailable } from "@/lib/ai";
import { getSetting, setSetting } from "@/lib/db";
import { getExtensionToken, regenerateExtensionToken } from "@/lib/extension-auth";
import { gmailConfigured, gmailConnected } from "@/lib/gmail";

/** Default minutes between scheduled Gmail syncs (external schedulers read this). */
const DEFAULT_SYNC_INTERVAL_MIN = 30;

export async function GET() {
  return NextResponse.json({
    aiConfigured: aiAvailable(),
    gmailConfigured: gmailConfigured(),
    gmailConnected: gmailConnected(),
    extensionToken: getExtensionToken(),
    appUrl: process.env.APP_URL || "http://localhost:3000",
    syncIntervalMinutes:
      getSetting<number>("syncIntervalMinutes") ?? DEFAULT_SYNC_INTERVAL_MIN,
  });
}

export async function POST(req: NextRequest) {
  const { action, minutes } = (await req.json()) as {
    action?: string;
    minutes?: number;
  };
  if (action === "regenerateExtensionToken") {
    return NextResponse.json({ extensionToken: regenerateExtensionToken() });
  }
  if (action === "setSyncInterval") {
    if (typeof minutes !== "number" || !Number.isFinite(minutes)) {
      return NextResponse.json({ error: "minutes must be a number" }, { status: 400 });
    }
    const clamped = Math.min(720, Math.max(5, Math.round(minutes)));
    setSetting("syncIntervalMinutes", clamped);
    return NextResponse.json({ syncIntervalMinutes: clamped });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
