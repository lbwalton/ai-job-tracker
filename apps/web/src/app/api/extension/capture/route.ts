import { NextResponse } from "next/server";
import { z } from "zod";
import type { ParsedJob } from "@jobtrackr/core";
import { aiAvailable, parseJobPosting } from "@/lib/ai";
import { fetchUrlContent } from "@/lib/fetch-job";
import { CORS_HEADERS, corsPreflight, requireExtensionAuth } from "@/lib/extension-auth";
import { createJob, findDuplicate } from "@/lib/jobs";

export const maxDuration = 60;

const captureSchema = z.object({
  url: z.string(),
  title: z.string().default(""),
  jsonLd: z.record(z.unknown()).nullable().default(null),
  pageText: z.string().default(""),
  allowDuplicate: z.boolean().default(false),
});

function get(obj: Record<string, unknown> | null, ...path: string[]): string | null {
  let cur: unknown = obj;
  for (const key of path) {
    if (!cur || typeof cur !== "object") return null;
    cur = (cur as Record<string, unknown>)[key];
  }
  return typeof cur === "string" && cur.trim() ? cur.trim() : null;
}

/** Build job fields straight from a JSON-LD JobPosting when possible. */
function fromJsonLd(jsonLd: Record<string, unknown>): ParsedJob | null {
  const company = get(jsonLd, "hiringOrganization", "name");
  const jobTitle = get(jsonLd, "title");
  if (!company || !jobTitle) return null;
  const locality = get(jsonLd, "jobLocation", "address", "addressLocality");
  const region = get(jsonLd, "jobLocation", "address", "addressRegion");
  const website = get(jsonLd, "hiringOrganization", "sameAs");
  const description = get(jsonLd, "description");
  return {
    company,
    jobTitle,
    location: [locality, region].filter(Boolean).join(", ") || null,
    salaryRange: null,
    jobType: get(jsonLd, "employmentType"),
    experience: null,
    skills: null,
    emailDomain: website ? new URL(website).hostname.replace(/^www\./, "") : null,
    description: description
      ? description.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 400)
      : null,
  };
}

export function OPTIONS() {
  return corsPreflight();
}

export async function POST(req: Request) {
  const unauthorized = requireExtensionAuth(req);
  if (unauthorized) return unauthorized;

  const parsed = captureSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400, headers: CORS_HEADERS },
    );
  }
  const { url, title, jsonLd, pageText, allowDuplicate } = parsed.data;

  try {
    let fields = jsonLd ? fromJsonLd(jsonLd) : null;
    if (!fields) {
      if (!aiAvailable()) {
        return NextResponse.json(
          { error: "No structured data on this page and ANTHROPIC_API_KEY is not set" },
          { status: 503, headers: CORS_HEADERS },
        );
      }
      // URL-only captures (e.g. the iOS Shortcut) send no page content —
      // fetch the posting server-side instead.
      const content = jsonLd
        ? `URL: ${url}\nJSON-LD:\n${JSON.stringify(jsonLd)}`
        : pageText.trim()
          ? `URL: ${url}\nTitle: ${title}\nPage text:\n${pageText}`
          : await fetchUrlContent(url);
      fields = await parseJobPosting(content);
    }

    if (!allowDuplicate) {
      const dup = findDuplicate(fields.company, fields.jobTitle);
      if (dup) {
        return NextResponse.json({ duplicate: dup }, { status: 409, headers: CORS_HEADERS });
      }
    }
    const job = createJob({ ...fields, sourceUrl: url, status: "Saved" }, "extension");
    return NextResponse.json({ job }, { status: 201, headers: CORS_HEADERS });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Capture failed" },
      { status: 502, headers: CORS_HEADERS },
    );
  }
}
