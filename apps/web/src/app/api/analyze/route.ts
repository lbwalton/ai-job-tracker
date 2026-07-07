import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { aiAvailable, parseJobPosting } from "@/lib/ai";
import { fetchUrlContent } from "@/lib/fetch-job";

const inputSchema = z.object({
  url: z.string().url().optional(),
  text: z.string().optional(),
});

export async function POST(req: NextRequest) {
  if (!aiAvailable()) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured — add it to apps/web/.env.local" },
      { status: 503 },
    );
  }
  const parsed = inputSchema.safeParse(await req.json());
  if (!parsed.success || (!parsed.data.url && !parsed.data.text)) {
    return NextResponse.json(
      { error: "Provide a job posting 'url' or pasted 'text'" },
      { status: 400 },
    );
  }
  try {
    const content = parsed.data.text ?? (await fetchUrlContent(parsed.data.url!));
    const job = await parseJobPosting(content);
    return NextResponse.json({
      parsed: { ...job, sourceUrl: parsed.data.url ?? null },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Analysis failed" },
      { status: 502 },
    );
  }
}
