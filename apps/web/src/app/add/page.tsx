"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { JOB_STATUSES, type ParsedJob } from "@jobtrackr/core";
import { api } from "@/lib/client";

type Mode = "url" | "paste" | "describe" | "manual";

const FIELDS: Array<{ key: keyof ParsedJob; label: string; required?: boolean }> = [
  { key: "company", label: "Company", required: true },
  { key: "jobTitle", label: "Position", required: true },
  { key: "location", label: "Location" },
  { key: "salaryRange", label: "Salary Range" },
  { key: "jobType", label: "Job Type" },
  { key: "experience", label: "Experience" },
  { key: "skills", label: "Skills" },
  { key: "emailDomain", label: "Company Email Domain" },
];

export default function AddJob() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("url");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({ status: "Applied" });
  const [showForm, setShowForm] = useState(false);

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function analyze() {
    setBusy(true);
    setError(null);
    try {
      const payload = mode === "url" ? { url: input.trim() } : { text: input };
      const data = await api<{ parsed: ParsedJob & { sourceUrl: string | null } }>(
        "/api/analyze",
        { method: "POST", json: payload },
      );
      const next: Record<string, string> = { status: "Applied" };
      for (const [k, v] of Object.entries(data.parsed)) {
        if (typeof v === "string" && v) next[k] = v;
      }
      setForm(next);
      setShowForm(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setBusy(false);
    }
  }

  async function save(allowDuplicate = false) {
    setBusy(true);
    setError(null);
    try {
      await api("/api/jobs", { method: "POST", json: { ...form, allowDuplicate } });
      router.push("/");
    } catch (err) {
      const e = err as Error & { status?: number };
      if (e.status === 409) {
        if (confirm("You already track this company + position. Add anyway?")) {
          await save(true);
          return;
        }
      } else {
        setError(e.message);
      }
    } finally {
      setBusy(false);
    }
  }

  const placeholders: Record<Mode, string> = {
    url: "https://boards.greenhouse.io/…",
    paste: "Paste the full job posting text here…",
    describe:
      "e.g. \"I applied to Google for a Software Engineer position in Mountain View, full-time, around $150k\"",
    manual: "",
  };

  return (
    <div>
      <h1>Add Job Application</h1>

      <div className="tabs">
        {(
          [
            ["url", "Job URL"],
            ["paste", "Copy & Paste"],
            ["describe", "Describe It"],
            ["manual", "Manual Entry"],
          ] as Array<[Mode, string]>
        ).map(([m, label]) => (
          <button
            key={m}
            className={mode === m ? "active" : ""}
            onClick={() => {
              setMode(m);
              setShowForm(m === "manual");
              setError(null);
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {mode !== "manual" && (
        <div className="card">
          {mode === "url" ? (
            <input
              type="text"
              style={{ width: "100%" }}
              placeholder={placeholders.url}
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
          ) : (
            <textarea
              rows={mode === "paste" ? 10 : 4}
              placeholder={placeholders[mode]}
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
          )}
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn primary" onClick={analyze} disabled={busy || !input.trim()}>
              {busy ? "Analyzing…" : "Analyze with AI"}
            </button>
            <span className="muted">
              Tip: the Chrome extension captures postings in one click — see Settings.
            </span>
          </div>
        </div>
      )}

      {error && <div className="notice err">{error}</div>}

      {showForm && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Review &amp; Save</h2>
          <div className="form-grid">
            {FIELDS.map((f) => (
              <div className="field" key={f.key}>
                <label>
                  {f.label}
                  {f.required ? " *" : ""}
                </label>
                <input
                  type="text"
                  value={form[f.key] ?? ""}
                  onChange={(e) => set(f.key, e.target.value)}
                />
              </div>
            ))}
            <div className="field">
              <label>Source URL</label>
              <input
                type="text"
                value={form.sourceUrl ?? ""}
                onChange={(e) => set("sourceUrl", e.target.value)}
              />
            </div>
            <div className="field">
              <label>Status</label>
              <select value={form.status} onChange={(e) => set("status", e.target.value)}>
                {JOB_STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Date Applied</label>
              <input
                type="date"
                value={form.dateApplied ?? ""}
                onChange={(e) => set("dateApplied", e.target.value)}
              />
            </div>
          </div>
          <div className="field" style={{ marginTop: 12 }}>
            <label>Description / Notes</label>
            <textarea
              rows={3}
              value={form.description ?? ""}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>
          <div className="row" style={{ marginTop: 14 }}>
            <button
              className="btn primary"
              onClick={() => save()}
              disabled={busy || !form.company || !form.jobTitle}
            >
              Save to Tracker
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
