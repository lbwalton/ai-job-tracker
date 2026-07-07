import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { deleteJobs, getJob, updateJob } from "@/lib/jobs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const job = getJob(Number(id));
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const emails = getDb()
    .prepare("SELECT * FROM emails WHERE jobId = ? ORDER BY receivedAt DESC")
    .all(job.id);
  const history = getDb()
    .prepare("SELECT * FROM status_history WHERE jobId = ? ORDER BY createdAt DESC")
    .all(job.id);
  return NextResponse.json({ job, emails, history });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const patch = await req.json();
  const job = updateJob(Number(id), patch);
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ job });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const n = deleteJobs([Number(id)]);
  if (!n) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ deleted: n });
}
