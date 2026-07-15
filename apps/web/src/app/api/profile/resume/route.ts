import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import { RESUME_MIME, deleteResume, getResume, resumeExt, saveResume } from "@/lib/resume";

const MAX_BYTES = 10 * 1024 * 1024; // 10MB

/** Resume metadata (or the file itself with ?download). */
export async function GET(req: NextRequest) {
  const resume = getResume();
  if (!resume) return NextResponse.json({ resume: null });

  if (req.nextUrl.searchParams.has("download")) {
    const data = fs.readFileSync(resume.filePath);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "content-type": resume.mime,
        "content-disposition": `attachment; filename="${resume.name}"`,
      },
    });
  }
  const { name, size, uploadedAt } = resume;
  return NextResponse.json({ resume: { name, size, uploadedAt } });
}

/** Upload (replaces the current resume). */
export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Send a multipart form with a 'file' field" }, { status: 400 });
  }
  if (!RESUME_MIME[resumeExt(file.name)]) {
    return NextResponse.json({ error: "Use a .pdf, .doc, or .docx file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File is larger than 10MB" }, { status: 400 });
  }
  const meta = saveResume(file.name, Buffer.from(await file.arrayBuffer()));
  return NextResponse.json({ resume: meta }, { status: 201 });
}

export async function DELETE() {
  deleteResume();
  return NextResponse.json({ ok: true });
}
