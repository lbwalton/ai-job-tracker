import { NextRequest, NextResponse } from "next/server";
import { legacyBackupSchema } from "@jobtrackr/core";
import { createJob, findDuplicate } from "@/lib/jobs";

/** Import a v1 (single-file app) JSON backup: { jobs: [...], version, exportDate }. */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = legacyBackupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Not a recognized backup file (expected { jobs: [...] })" },
      { status: 400 },
    );
  }
  let imported = 0;
  let skipped = 0;
  for (const legacy of parsed.data.jobs) {
    const company = legacy.company?.trim();
    const jobTitle = legacy.jobTitle?.trim();
    if (!company || !jobTitle) {
      skipped++;
      continue;
    }
    if (findDuplicate(company, jobTitle)) {
      skipped++;
      continue;
    }
    createJob(
      {
        company,
        jobTitle,
        location: legacy.location ?? null,
        sourceUrl:
          legacy.sourceUrl && legacy.sourceUrl !== "Manual Entry"
            ? legacy.sourceUrl
            : null,
        salaryRange: legacy.salaryRange ?? null,
        jobType: legacy.jobType ?? null,
        experience: legacy.experience ?? null,
        skills: legacy.skills ?? null,
        emailDomain: legacy.emailDomain ?? null,
        description: legacy.description ?? null,
        status: legacy.status ?? "Applied",
        dateAdded: legacy.dateAdded ?? new Date().toISOString().slice(0, 10),
        dateApplied: legacy.dateAdded ?? null,
      },
      "import",
    );
    imported++;
  }
  return NextResponse.json({ imported, skipped });
}
