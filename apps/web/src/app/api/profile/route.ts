import { NextRequest, NextResponse } from "next/server";
import { EMPTY_PROFILE, profileSchema } from "@jobtrackr/core";
import { getSetting, setSetting } from "@/lib/db";

export async function GET() {
  const profile = getSetting("profile") ?? EMPTY_PROFILE;
  return NextResponse.json({ profile });
}

export async function PUT(req: NextRequest) {
  const parsed = profileSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  setSetting("profile", parsed.data);
  return NextResponse.json({ profile: parsed.data });
}
