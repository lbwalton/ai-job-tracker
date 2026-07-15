import { NextResponse } from "next/server";
import fs from "node:fs";
import { CORS_HEADERS, corsPreflight, requireExtensionAuth } from "@/lib/extension-auth";
import { getResume } from "@/lib/resume";

export function OPTIONS() {
  return corsPreflight();
}

/** The stored resume, for the extension's auto-attach during autofill. */
export async function GET(req: Request) {
  const unauthorized = requireExtensionAuth(req);
  if (unauthorized) return unauthorized;

  const resume = getResume();
  if (!resume) {
    return NextResponse.json(
      { error: "No resume uploaded — add one in the web app (Autofill Profile)" },
      { status: 404, headers: CORS_HEADERS },
    );
  }
  const data = fs.readFileSync(resume.filePath);
  return new NextResponse(new Uint8Array(data), {
    headers: {
      ...CORS_HEADERS,
      "content-type": resume.mime,
      "x-resume-name": encodeURIComponent(resume.name),
      "access-control-expose-headers": "x-resume-name, content-type",
    },
  });
}
