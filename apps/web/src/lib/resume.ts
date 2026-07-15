import fs from "node:fs";
import path from "node:path";

/**
 * Resume vault: one primary resume file stored on disk next to the SQLite db
 * (data/ is gitignored). Metadata lives in the settings table.
 */

const RESUME_DIR = path.join(process.cwd(), "data", "files");

export const RESUME_MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export interface ResumeMeta {
  name: string;
  size: number;
  uploadedAt: string;
}

function safeName(name: string): string {
  return name.replace(/[/\\:*?"<>|]/g, "_").slice(0, 120);
}

export function resumeExt(name: string): string {
  return path.extname(name).toLowerCase();
}

export function getResume(): (ResumeMeta & { filePath: string; mime: string }) | null {
  if (!fs.existsSync(RESUME_DIR)) return null;
  const files = fs.readdirSync(RESUME_DIR).filter((f) => RESUME_MIME[resumeExt(f)]);
  if (!files.length) return null;
  const name = files[0];
  const filePath = path.join(RESUME_DIR, name);
  const stat = fs.statSync(filePath);
  return {
    name,
    size: stat.size,
    uploadedAt: stat.mtime.toISOString(),
    filePath,
    mime: RESUME_MIME[resumeExt(name)],
  };
}

export function saveResume(originalName: string, data: Buffer): ResumeMeta {
  deleteResume(); // single primary resume — replace whatever was there
  fs.mkdirSync(RESUME_DIR, { recursive: true });
  const name = safeName(originalName);
  const filePath = path.join(RESUME_DIR, name);
  fs.writeFileSync(filePath, data);
  const stat = fs.statSync(filePath);
  return { name, size: stat.size, uploadedAt: stat.mtime.toISOString() };
}

export function deleteResume(): void {
  if (!fs.existsSync(RESUME_DIR)) return;
  for (const f of fs.readdirSync(RESUME_DIR)) {
    if (RESUME_MIME[resumeExt(f)]) fs.unlinkSync(path.join(RESUME_DIR, f));
  }
}
