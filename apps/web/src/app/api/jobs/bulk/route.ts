import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { deleteJobs, updateJob } from "@/lib/jobs";

const bulkSchema = z.object({
  ids: z.array(z.number()).min(1),
  action: z.enum(["delete", "updateStatus", "updateDate"]),
  status: z.string().optional(),
  dateApplied: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const parsed = bulkSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { ids, action, status, dateApplied } = parsed.data;

  if (action === "delete") {
    return NextResponse.json({ deleted: deleteJobs(ids) });
  }
  let updated = 0;
  for (const id of ids) {
    if (action === "updateStatus" && status) {
      if (updateJob(id, { status })) updated++;
    } else if (action === "updateDate" && dateApplied) {
      if (updateJob(id, { dateApplied })) updated++;
    }
  }
  return NextResponse.json({ updated });
}
