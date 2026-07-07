import { NextResponse } from "next/server";
import { listJobs } from "@/lib/jobs";

/** Export all jobs in the same envelope the v1 app used, so backups stay portable. */
export async function GET() {
  const jobs = listJobs();
  return new NextResponse(
    JSON.stringify(
      {
        jobs,
        exportDate: new Date().toISOString(),
        version: "2.0",
        totalJobs: jobs.length,
      },
      null,
      2,
    ),
    {
      headers: {
        "content-type": "application/json",
        "content-disposition": `attachment; filename="job-tracker-backup-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    },
  );
}
