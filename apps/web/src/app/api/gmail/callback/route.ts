import { NextRequest, NextResponse } from "next/server";
import { exchangeCode } from "@/lib/gmail";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const base = process.env.APP_URL || "http://localhost:3000";
  if (!code) {
    return NextResponse.redirect(`${base}/settings?gmail=denied`);
  }
  try {
    await exchangeCode(code);
    return NextResponse.redirect(`${base}/settings?gmail=connected`);
  } catch (err) {
    console.error("Gmail OAuth callback failed:", err);
    return NextResponse.redirect(`${base}/settings?gmail=error`);
  }
}
