import { NextRequest, NextResponse } from "next/server";
import { aiAvailable } from "@/lib/ai";
import { getExtensionToken, regenerateExtensionToken } from "@/lib/extension-auth";
import { gmailConfigured, gmailConnected } from "@/lib/gmail";

export async function GET() {
  return NextResponse.json({
    aiConfigured: aiAvailable(),
    gmailConfigured: gmailConfigured(),
    gmailConnected: gmailConnected(),
    extensionToken: getExtensionToken(),
    appUrl: process.env.APP_URL || "http://localhost:3000",
  });
}

export async function POST(req: NextRequest) {
  const { action } = (await req.json()) as { action?: string };
  if (action === "regenerateExtensionToken") {
    return NextResponse.json({ extensionToken: regenerateExtensionToken() });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
