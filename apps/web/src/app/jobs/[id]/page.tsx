"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { JOB_STATUSES, type EmailRecord, type Job } from "@jobtrackr/core";
import { api } from "@/lib/client";

interface HistoryRow {
  id: number;
  fromStatus: string | null;
  toStatus: string;
  source: string;
  createdAt: string;
}

const EDITABLE: Array<{ key: keyof Job; label: string }> = [
  { key: "company", label: "Company" },
  { key: "jobTitle", label: "Position" },
  { key: "location", label: "Location" },
  { key: "salaryRange", label: "Salary Range" },
  { key: "jobType", label: "Job Type" },
  { key: "experience", label: "Experience" },
  { key: "skills", label: "Skills" },
  { key: "emailDomain", label: "Email Domain" },
  { key: "sourceUrl", label: "Source URL" },
  { key: "dateAdded", label: "Date Added" },
  { key: "dateApplied", label: "Date Applied" },
];

export default function JobDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [draftQ, setDraftQ] = useState("Why do you want to work here?");
  const [draftA, setDraftA] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [draftErr, setDraftErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const data = await api<{ job: Job; emails: EmailRecord[]; history: HistoryRow[] }>(
      `/api/jobs/${id}`,
    );
    setJob(data.job);
    setEmails(data.emails);
    setHistory(data.history);
    const f: Record<string, string> = {};
    for (const { key } of EDITABLE) f[key] = (data.job[key] as string) ?? "";
    f.status = data.job.status;
    f.description = data.job.description ?? "";
    f.notes = data.job.notes ?? "";
    setForm(f);
  }, [id]);

  useEffect(() => {
    load().catch(() => router.push("/"));
  }, [load, router]);

  async function save() {
    await api(`/api/jobs/${id}`, { method: "PATCH", json: form });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    load();
  }

  async function remove() {
    if (!confirm("Delete this application?")) return;
    await api(`/api/jobs/${id}`, { method: "DELETE" });
    router.push("/");
  }

  async function draft() {
    if (!draftQ.trim()) return;
    setDrafting(true);
    setDraftErr(null);
    try {
      const { answer } = await api<{ answer: string }>("/api/draft", {
        method: "POST",
        json: { question: draftQ, jobId: Number(id) },
      });
      setDraftA(answer);
    } catch (err) {
      setDraftErr(err instanceof Error ? err.message : "Draft failed");
    } finally {
      setDrafting(false);
    }
  }

  async function copyDraft() {
    await navigator.clipboard.writeText(draftA);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (!job) return <p className="muted">Loading…</p>;

  return (
    <div>
      <div className="row" style={{ marginBottom: 12 }}>
        <h1 style={{ margin: 0 }}>
          {job.company} — {job.jobTitle}
        </h1>
        <span className={`stamp ${job.status}`}>{job.status}</span>
        <div className="spacer" />
        <button className="btn danger" onClick={remove}>
          Delete
        </button>
      </div>

      {saved && <div className="notice ok">Saved.</div>}

      <div className="card">
        <div className="form-grid">
          {EDITABLE.map(({ key, label }) => (
            <div className="field" key={key}>
              <label>{label}</label>
              <input
                type={key.startsWith("date") ? "date" : "text"}
                value={form[key] ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              />
            </div>
          ))}
          <div className="field">
            <label>Status</label>
            <select
              value={form.status ?? job.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            >
              {JOB_STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="field" style={{ marginTop: 12 }}>
          <label>Description</label>
          <textarea
            rows={3}
            value={form.description ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>
        <div className="field" style={{ marginTop: 12 }}>
          <label>Notes</label>
          <textarea
            rows={3}
            value={form.notes ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
        </div>
        <div className="row" style={{ marginTop: 14 }}>
          <button className="btn primary" onClick={save}>
            Save Changes
          </button>
          {job.sourceUrl && (
            <a className="btn" href={job.sourceUrl} target="_blank" rel="noreferrer">
              Open Posting ↗
            </a>
          )}
        </div>
      </div>

      <h2>Draft an Answer</h2>
      <p className="muted">
        Writes a first-draft answer for this specific application, from your Background (Autofill
        Profile) plus this job&apos;s description. Edit it into your own words before using it.
      </p>
      <div className="card">
        {draftErr && <div className="notice err">{draftErr}</div>}
        <div className="row">
          <input
            type="text"
            placeholder={`e.g. Why do you want to work at ${job.company}?`}
            style={{ flex: 1, minWidth: 200 }}
            value={draftQ}
            onChange={(e) => setDraftQ(e.target.value)}
          />
          <button className="btn primary" onClick={draft} disabled={drafting || !draftQ.trim()}>
            {drafting ? "Drafting…" : "Draft with AI"}
          </button>
        </div>
        {draftA && (
          <>
            <textarea
              rows={6}
              style={{ marginTop: 12 }}
              value={draftA}
              onChange={(e) => setDraftA(e.target.value)}
            />
            <div className="row" style={{ marginTop: 10 }}>
              <button className="btn" onClick={copyDraft}>
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </>
        )}
      </div>

      <h2>Emails ({emails.length})</h2>
      <div className="card">
        {emails.length ? (
          emails.map((e) => (
            <div key={e.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
              <div className="row">
                <strong>{e.subject || "(no subject)"}</strong>
                <span className="badge">{e.category.replace(/_/g, " ")}</span>
                <div className="spacer" />
                <span className="muted">{new Date(e.receivedAt).toLocaleString()}</span>
              </div>
              <div className="muted">{e.fromAddress}</div>
              <div>{e.summary}</div>
            </div>
          ))
        ) : (
          <p className="muted" style={{ margin: 0 }}>
            No emails linked yet. Connect Gmail in Settings and sync.
          </p>
        )}
      </div>

      <h2>Status History</h2>
      <div className="card">
        {history.map((h) => (
          <div key={h.id} className="row" style={{ padding: "4px 0" }}>
            <span>
              {h.fromStatus ? `${h.fromStatus} → ` : ""}
              <strong>{h.toStatus}</strong>
            </span>
            <span className="badge">{h.source}</span>
            <div className="spacer" />
            <span className="muted">{new Date(h.createdAt + "Z").toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
