import type { Job, JobStatus, NewJob } from "@jobtrackr/core";
import { STATUS_RANK, TERMINAL_STATUSES } from "@jobtrackr/core";
import { getDb } from "./db";

export interface JobFilters {
  search?: string;
  status?: string;
  from?: string;
  to?: string;
  sort?: string;
  dir?: "asc" | "desc";
}

const SORTABLE = new Set([
  "company",
  "jobTitle",
  "location",
  "status",
  "dateAdded",
  "dateApplied",
  "updatedAt",
  "id",
]);

export function listJobs(filters: JobFilters = {}): Job[] {
  const where: string[] = [];
  const params: Record<string, unknown> = {};

  if (filters.search) {
    where.push(
      "(company LIKE :q OR jobTitle LIKE :q OR location LIKE :q OR skills LIKE :q OR notes LIKE :q)",
    );
    params.q = `%${filters.search}%`;
  }
  if (filters.status) {
    where.push("status = :status");
    params.status = filters.status;
  }
  if (filters.from) {
    where.push("dateAdded >= :from");
    params.from = filters.from;
  }
  if (filters.to) {
    where.push("dateAdded <= :to");
    params.to = filters.to;
  }

  const sort = SORTABLE.has(filters.sort ?? "") ? filters.sort : "dateAdded";
  const dir = filters.dir === "asc" ? "ASC" : "DESC";
  const sql = `SELECT * FROM jobs ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY ${sort} ${dir}, id DESC`;
  return getDb().prepare(sql).all(params) as Job[];
}

export function getJob(id: number): Job | null {
  return (getDb().prepare("SELECT * FROM jobs WHERE id = ?").get(id) as Job) ?? null;
}

export function createJob(input: NewJob, source = "manual"): Job {
  const db = getDb();
  const now = new Date().toISOString();
  const today = now.slice(0, 10);
  const status = input.status ?? "Applied";
  const res = db
    .prepare(
      `INSERT INTO jobs (company, jobTitle, location, sourceUrl, salaryRange, jobType,
        experience, skills, emailDomain, description, notes, status, dateAdded, dateApplied, createdAt, updatedAt)
       VALUES (@company, @jobTitle, @location, @sourceUrl, @salaryRange, @jobType,
        @experience, @skills, @emailDomain, @description, @notes, @status, @dateAdded, @dateApplied, @now, @now)`,
    )
    .run({
      company: input.company,
      jobTitle: input.jobTitle,
      location: input.location ?? null,
      sourceUrl: input.sourceUrl ?? null,
      salaryRange: input.salaryRange ?? null,
      jobType: input.jobType ?? null,
      experience: input.experience ?? null,
      skills: input.skills ?? null,
      emailDomain: input.emailDomain ?? null,
      description: input.description ?? null,
      notes: input.notes ?? null,
      status,
      dateAdded: input.dateAdded ?? today,
      dateApplied: input.dateApplied ?? (status === "Applied" ? today : null),
      now,
    });
  const id = Number(res.lastInsertRowid);
  db.prepare(
    "INSERT INTO status_history (jobId, toStatus, source) VALUES (?, ?, ?)",
  ).run(id, status, source);
  return getJob(id)!;
}

const UPDATABLE_FIELDS = [
  "company",
  "jobTitle",
  "location",
  "sourceUrl",
  "salaryRange",
  "jobType",
  "experience",
  "skills",
  "emailDomain",
  "description",
  "notes",
  "dateAdded",
  "dateApplied",
] as const;

export function updateJob(
  id: number,
  patch: Partial<Job> & { status?: string },
  source = "manual",
): Job | null {
  const db = getDb();
  const existing = getJob(id);
  if (!existing) return null;

  const sets: string[] = [];
  const params: Record<string, unknown> = { id };
  for (const f of UPDATABLE_FIELDS) {
    if (f in patch) {
      sets.push(`${f} = @${f}`);
      params[f] = (patch as Record<string, unknown>)[f] ?? null;
    }
  }
  if (patch.status && patch.status !== existing.status) {
    sets.push("status = @status");
    params.status = patch.status;
    if (patch.status === "Applied" && !existing.dateApplied && !("dateApplied" in patch)) {
      sets.push("dateApplied = @autoDateApplied");
      params.autoDateApplied = new Date().toISOString().slice(0, 10);
    }
    db.prepare(
      "INSERT INTO status_history (jobId, fromStatus, toStatus, source) VALUES (?, ?, ?, ?)",
    ).run(id, existing.status, patch.status, source);
  }
  if (!sets.length) return existing;
  sets.push("updatedAt = @updatedAt");
  params.updatedAt = new Date().toISOString();
  db.prepare(`UPDATE jobs SET ${sets.join(", ")} WHERE id = @id`).run(params);
  return getJob(id);
}

export function deleteJobs(ids: number[]): number {
  if (!ids.length) return 0;
  const stmt = getDb().prepare("DELETE FROM jobs WHERE id = ?");
  let n = 0;
  for (const id of ids) n += stmt.run(id).changes;
  return n;
}

export function findDuplicate(company: string, jobTitle: string): Job | null {
  return (
    (getDb()
      .prepare(
        "SELECT * FROM jobs WHERE lower(company) = lower(?) AND lower(jobTitle) = lower(?) LIMIT 1",
      )
      .get(company, jobTitle) as Job) ?? null
  );
}

/**
 * Match an inbound email to a tracked application.
 * Priority: sender domain match -> company name match (AI guess), preferring
 * applications that are still in play, then the most recently updated.
 */
export function matchJobForEmail(
  senderDomain: string | null,
  companyGuess: string | null,
): Job | null {
  const jobs = listJobs();
  const active = (j: Job) => !TERMINAL_STATUSES.includes(j.status as JobStatus);
  const rank = (matches: Job[]) =>
    matches.sort((a, b) => {
      const act = Number(active(b)) - Number(active(a));
      if (act !== 0) return act;
      return b.updatedAt.localeCompare(a.updatedAt);
    })[0] ?? null;

  if (senderDomain) {
    const d = senderDomain.toLowerCase();
    const byDomain = jobs.filter((j) => {
      const jd = j.emailDomain?.toLowerCase().replace(/^@/, "");
      return jd && (d === jd || d.endsWith("." + jd) || jd.endsWith("." + d));
    });
    const hit = rank(byDomain);
    if (hit) return hit;
  }

  if (companyGuess) {
    const g = normalizeCompany(companyGuess);
    if (g.length >= 3) {
      const byName = jobs.filter((j) => {
        const c = normalizeCompany(j.company);
        return c === g || c.includes(g) || g.includes(c);
      });
      const hit = rank(byName);
      if (hit) return hit;
    }
  }
  return null;
}

function normalizeCompany(name: string): string {
  return name
    .toLowerCase()
    .replace(/,?\s+(inc|llc|ltd|corp|corporation|co|gmbh)\.?$/i, "")
    .replace(/[^a-z0-9]/g, "");
}

/** Auto-apply a status suggestion only when it moves the application forward. */
export function shouldAutoApply(current: string, suggested: JobStatus): boolean {
  const cur = STATUS_RANK[current as JobStatus];
  if (cur === undefined) return false; // custom status — never auto-change
  return STATUS_RANK[suggested] > cur;
}
