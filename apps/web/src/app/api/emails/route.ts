import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { updateJob } from "@/lib/jobs";

export async function GET() {
  const emails = getDb()
    .prepare(
      `SELECT e.*, j.company AS jobCompany, j.jobTitle AS jobJobTitle, j.status AS jobStatus
       FROM emails e LEFT JOIN jobs j ON j.id = e.jobId
       WHERE e.category != 'not_job_related'
       ORDER BY e.receivedAt DESC LIMIT 200`,
    )
    .all();
  return NextResponse.json({ emails });
}

/** Accept/dismiss a suggested status change, or exclude a misclassified email. */
export async function PATCH(req: NextRequest) {
  const { emailId, action } = (await req.json()) as {
    emailId: number;
    action: "accept" | "dismiss" | "exclude";
  };
  const db = getDb();
  const email = db.prepare("SELECT * FROM emails WHERE id = ?").get(emailId) as
    | { id: number; jobId: number | null; suggestedStatus: string | null }
    | undefined;
  if (!email) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (action === "exclude") {
    // False positive: hide it everywhere and unlink from any application.
    // Sync remembers the gmailId, so it will not be re-imported.
    db.prepare(
      "UPDATE emails SET category = 'not_job_related', suggestedStatus = NULL, jobId = NULL WHERE id = ?",
    ).run(emailId);
  } else if (action === "accept" && email.jobId && email.suggestedStatus) {
    updateJob(email.jobId, { status: email.suggestedStatus }, "gmail-review");
    db.prepare("UPDATE emails SET statusApplied = 1 WHERE id = ?").run(emailId);
  } else {
    db.prepare("UPDATE emails SET suggestedStatus = NULL WHERE id = ?").run(emailId);
  }
  return NextResponse.json({ ok: true });
}
