import {
  CATEGORY_TO_STATUS,
  TERMINAL_STATUSES,
  type JobStatus,
} from "@jobtrackr/core";
import { classifyEmail, aiAvailable } from "./ai";
import { getDb, getSetting, setSetting, deleteSetting } from "./db";
import { listJobs, matchJobForEmail, shouldAutoApply, updateJob } from "./jobs";

const SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";

/** Well-known ATS sender domains — emails from these are almost always hiring-related. */
const ATS_DOMAINS = [
  "greenhouse.io",
  "greenhouse-mail.io",
  "lever.co",
  "hire.lever.co",
  "ashbyhq.com",
  "myworkday.com",
  "myworkdayjobs.com",
  "icims.com",
  "smartrecruiters.com",
  "jobvite.com",
  "bamboohr.com",
  "workablemail.com",
  "recruitee.com",
  "breezy.hr",
  "rippling.com",
];

interface GmailTokens {
  access_token: string;
  refresh_token?: string;
  expires_at: number; // epoch ms
}

function creds() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

function redirectUri(): string {
  const base = process.env.APP_URL || "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/api/gmail/callback`;
}

export function gmailConfigured(): boolean {
  return creds() !== null;
}

export function gmailConnected(): boolean {
  return getSetting<GmailTokens>("gmailTokens") !== null;
}

export function disconnectGmail(): void {
  deleteSetting("gmailTokens");
  deleteSetting("gmailLastSyncAt");
}

export function buildAuthUrl(): string {
  const c = creds();
  if (!c) throw new Error("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set");
  const params = new URLSearchParams({
    client_id: c.clientId,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeCode(code: string): Promise<void> {
  const c = creds();
  if (!c) throw new Error("Google OAuth credentials not configured");
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: c.clientId,
      client_secret: c.clientSecret,
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${await res.text()}`);
  const data = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };
  setSetting("gmailTokens", {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
  } satisfies GmailTokens);
}

async function getAccessToken(): Promise<string> {
  const tokens = getSetting<GmailTokens>("gmailTokens");
  if (!tokens) throw new Error("Gmail is not connected");
  if (Date.now() < tokens.expires_at - 60_000) return tokens.access_token;

  const c = creds();
  if (!c || !tokens.refresh_token) {
    throw new Error("Gmail token expired and cannot be refreshed — reconnect Gmail");
  }
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: c.clientId,
      client_secret: c.clientSecret,
      refresh_token: tokens.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${await res.text()}`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  const updated: GmailTokens = {
    ...tokens,
    access_token: data.access_token,
    expires_at: Date.now() + data.expires_in * 1000,
  };
  setSetting("gmailTokens", updated);
  return updated.access_token;
}

async function gmailGet(pathAndQuery: string): Promise<Record<string, unknown>> {
  const token = await getAccessToken();
  const res = await fetch(`${GMAIL_API}${pathAndQuery}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Gmail API ${res.status}: ${await res.text()}`);
  return (await res.json()) as Record<string, unknown>;
}

function buildQuery(lastSyncEpochSec: number | null): string {
  const jobs = listJobs();
  const domains = new Set<string>(ATS_DOMAINS);
  for (const j of jobs) {
    const d = j.emailDomain?.replace(/^@/, "").trim();
    if (d && d.includes(".")) domains.add(d.toLowerCase());
  }
  const fromClause = `from:(${[...domains].join(" OR ")})`;
  const subjectClause =
    'subject:("application" OR "interview" OR "your candidacy" OR "assessment" OR "offer" OR "position" OR "next steps")';
  const timeClause = lastSyncEpochSec
    ? `after:${lastSyncEpochSec}`
    : "newer_than:14d";
  return `(${fromClause} OR ${subjectClause}) ${timeClause} -in:chats -in:spam -in:trash`;
}

function headerValue(headers: Array<{ name: string; value: string }>, name: string): string {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}

function decodeBase64Url(data: string): string {
  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

interface GmailPart {
  mimeType?: string;
  body?: { data?: string };
  parts?: GmailPart[];
}

function extractBody(payload: GmailPart): string {
  if (payload.mimeType === "text/plain" && payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }
  if (payload.parts) {
    for (const p of payload.parts) {
      const plain = extractBody(p);
      if (plain) return plain;
    }
  }
  if (payload.mimeType === "text/html" && payload.body?.data) {
    return decodeBase64Url(payload.body.data)
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ");
  }
  return "";
}

export interface SyncResult {
  scanned: number;
  classified: number;
  linked: number;
  statusUpdates: Array<{ jobId: number; company: string; toStatus: string }>;
  errors: string[];
}

export async function syncGmail(): Promise<SyncResult> {
  if (!aiAvailable()) {
    throw new Error("ANTHROPIC_API_KEY is not set — email classification needs it");
  }
  const db = getDb();
  const result: SyncResult = {
    scanned: 0,
    classified: 0,
    linked: 0,
    statusUpdates: [],
    errors: [],
  };

  const lastSync = getSetting<number>("gmailLastSyncAt");
  const syncStartedAt = Math.floor(Date.now() / 1000);
  const q = encodeURIComponent(buildQuery(lastSync));

  const list = (await gmailGet(`/messages?q=${q}&maxResults=50`)) as {
    messages?: Array<{ id: string; threadId: string }>;
  };
  const messages = list.messages ?? [];
  result.scanned = messages.length;

  const seen = db.prepare("SELECT 1 FROM emails WHERE gmailId = ?");
  const trackedCompanies = listJobs()
    .filter((j) => !TERMINAL_STATUSES.includes(j.status as JobStatus))
    .map((j) => j.company);

  for (const m of messages) {
    if (seen.get(m.id)) continue;
    try {
      const full = (await gmailGet(`/messages/${m.id}?format=full`)) as {
        snippet?: string;
        internalDate?: string;
        payload?: GmailPart & { headers?: Array<{ name: string; value: string }> };
      };
      const headers = full.payload?.headers ?? [];
      const from = headerValue(headers, "From");
      const subject = headerValue(headers, "Subject");
      const body = full.payload ? extractBody(full.payload) : "";
      const receivedAt = full.internalDate
        ? new Date(Number(full.internalDate)).toISOString()
        : new Date().toISOString();

      const classification = await classifyEmail({
        from,
        subject,
        body: body || full.snippet || "",
        trackedCompanies,
      });
      result.classified++;

      if (classification.category === "not_job_related") continue;

      const senderDomain = from.match(/@([\w.-]+)/)?.[1] ?? null;
      const job = matchJobForEmail(senderDomain, classification.company);
      if (job) result.linked++;

      const suggested = CATEGORY_TO_STATUS[classification.category] ?? null;
      let applied = 0;
      if (
        job &&
        suggested &&
        classification.confidence >= 0.75 &&
        shouldAutoApply(job.status, suggested)
      ) {
        updateJob(job.id, { status: suggested }, "gmail");
        applied = 1;
        result.statusUpdates.push({
          jobId: job.id,
          company: job.company,
          toStatus: suggested,
        });
      }

      db.prepare(
        `INSERT INTO emails (gmailId, threadId, jobId, fromAddress, subject, snippet,
          receivedAt, category, confidence, summary, suggestedStatus, statusApplied)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        m.id,
        m.threadId ?? null,
        job?.id ?? null,
        from,
        subject,
        (full.snippet ?? "").slice(0, 500),
        receivedAt,
        classification.category,
        classification.confidence,
        classification.summary,
        suggested,
        applied,
      );
    } catch (err) {
      result.errors.push(`${m.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  setSetting("gmailLastSyncAt", syncStartedAt);
  setSetting("gmailLastSyncResult", { at: new Date().toISOString(), ...result });
  return result;
}
