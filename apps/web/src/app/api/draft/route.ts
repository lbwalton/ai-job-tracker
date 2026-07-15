import { NextRequest, NextResponse } from "next/server";
import { EMPTY_PROFILE, profileSchema, type Profile } from "@jobtrackr/core";
import { aiAvailable, draftAnswer } from "@/lib/ai";
import { getDb, getSetting } from "@/lib/db";

export const maxDuration = 60;

/** Draft an application answer from the profile (+ a specific job's context). */
export async function POST(req: NextRequest) {
  if (!aiAvailable()) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured" },
      { status: 503 },
    );
  }
  const { question, jobId } = (await req.json()) as { question?: string; jobId?: number };
  if (!question?.trim()) {
    return NextResponse.json({ error: "question is required" }, { status: 400 });
  }

  const profile: Profile = profileSchema.parse(getSetting("profile") ?? EMPTY_PROFILE);
  const job = jobId
    ? (getDb()
        .prepare("SELECT company, jobTitle, description, skills FROM jobs WHERE id = ?")
        .get(jobId) as {
        company: string;
        jobTitle: string;
        description: string | null;
        skills: string | null;
      } | undefined)
    : undefined;

  try {
    const answer = await draftAnswer({ question: question.trim(), profile, job });
    return NextResponse.json({ answer });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Draft failed" },
      { status: 502 },
    );
  }
}
