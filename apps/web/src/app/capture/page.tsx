"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ParsedJob } from "@jobtrackr/core";
import { api } from "@/lib/client";

/**
 * Mobile share-target landing page. Android's share sheet (via the PWA
 * manifest) opens /capture?url=…&text=…&title=… — LinkedIn and some apps put
 * the link inside `text` rather than `url`, so check both.
 */

function firstUrl(...candidates: Array<string | null>): string | null {
  for (const c of candidates) {
    const m = c?.match(/https?:\/\/\S+/);
    if (m) return m[0].replace(/[),.]+$/, "");
  }
  return null;
}

const FIELDS: Array<{ key: string; label: string }> = [
  { key: "company", label: "Company" },
  { key: "jobTitle", label: "Position" },
  { key: "location", label: "Location" },
  { key: "salaryRange", label: "Salary" },
];

function CaptureInner() {
  const params = useSearchParams();
  const router = useRouter();
  const [url, setUrl] = useState<string | null>(null);
  const [state, setState] = useState<"analyzing" | "review" | "error" | "manual">("analyzing");
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const analyze = useCallback(async (target: string) => {
    setState("analyzing");
    setError(null);
    try {
      const data = await api<{ parsed: ParsedJob }>("/api/analyze", {
        method: "POST",
        json: { url: target },
      });
      const next: Record<string, string> = {};
      for (const [k, v] of Object.entries(data.parsed)) {
        if (typeof v === "string" && v) next[k] = v;
      }
      setForm(next);
      setState("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
      setState("error");
    }
  }, []);

  useEffect(() => {
    const shared = firstUrl(params.get("url"), params.get("text"), params.get("title"));
    setUrl(shared);
    if (shared) analyze(shared);
    else setState("manual");
  }, [params, analyze]);

  async function save(status: "Saved" | "Applied", allowDuplicate = false) {
    setSaving(true);
    try {
      await api("/api/jobs", {
        method: "POST",
        json: { ...form, sourceUrl: url, status, allowDuplicate },
      });
      router.push("/?captured=1");
    } catch (err) {
      const e = err as Error & { status?: number };
      if (e.status === 409 && confirm("Already tracked. Save anyway?")) {
        await save(status, true);
        return;
      }
      setError(e.message);
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: "0 auto" }}>
      <h1>Capture Job</h1>

      {state === "manual" && (
        <div className="card">
          <p className="muted">Paste a job posting link:</p>
          <div className="row">
            <input
              type="text"
              placeholder="https://…"
              style={{ flex: 1 }}
              onChange={(e) => setUrl(firstUrl(e.target.value))}
            />
            <button className="btn primary" disabled={!url} onClick={() => url && analyze(url)}>
              Analyze
            </button>
          </div>
        </div>
      )}

      {state === "analyzing" && (
        <div className="card">
          <p style={{ margin: 0 }}>
            Analyzing <span className="mono">{url}</span>…
          </p>
        </div>
      )}

      {state === "error" && (
        <div>
          <div className="notice err">{error}</div>
          <div className="card">
            <p className="muted">You can still save it with the details you know:</p>
            <button className="btn" onClick={() => setState("review")}>
              Fill in manually
            </button>
          </div>
        </div>
      )}

      {state === "review" && (
        <div className="card">
          {FIELDS.map((f) => (
            <div className="field" key={f.key} style={{ marginBottom: 10 }}>
              <label>{f.label}</label>
              <input
                type="text"
                value={form[f.key] ?? ""}
                onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
              />
            </div>
          ))}
          {error && <div className="notice err">{error}</div>}
          <div className="row" style={{ marginTop: 12 }}>
            <button
              className="btn primary"
              disabled={saving || !form.company || !form.jobTitle}
              onClick={() => save("Saved")}
              style={{ flex: 1 }}
            >
              Save for later
            </button>
            <button
              className="btn"
              disabled={saving || !form.company || !form.jobTitle}
              onClick={() => save("Applied")}
              style={{ flex: 1 }}
            >
              I applied already
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CapturePage() {
  return (
    <Suspense fallback={<p className="muted">Loading…</p>}>
      <CaptureInner />
    </Suspense>
  );
}
