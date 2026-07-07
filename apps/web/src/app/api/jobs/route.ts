import { NextRequest, NextResponse } from "next/server";
import { newJobSchema } from "@jobtrackr/core";
import { createJob, findDuplicate, listJobs } from "@/lib/jobs";

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const jobs = listJobs({
    search: p.get("search") ?? undefined,
    status: p.get("status") ?? undefined,
    from: p.get("from") ?? undefined,
    to: p.get("to") ?? undefined,
    sort: p.get("sort") ?? undefined,
    dir: (p.get("dir") as "asc" | "desc") ?? undefined,
  });
  return NextResponse.json({ jobs });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = newJobSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  if (!body.allowDuplicate) {
    const dup = findDuplicate(parsed.data.company, parsed.data.jobTitle);
    if (dup) {
      return NextResponse.json({ duplicate: dup }, { status: 409 });
    }
  }
  const job = createJob(parsed.data);
  return NextResponse.json({ job }, { status: 201 });
}
