"use client";

import { useEffect, useRef, useState } from "react";
import { EMPTY_PROFILE, type Profile } from "@jobtrackr/core";
import { api } from "@/lib/client";

const FIELDS: Array<{ key: keyof Profile; label: string; hint?: string }> = [
  { key: "firstName", label: "First Name" },
  { key: "lastName", label: "Last Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "location", label: "Location (City, State)" },
  { key: "linkedin", label: "LinkedIn URL" },
  { key: "github", label: "GitHub URL" },
  { key: "portfolio", label: "Portfolio / Website" },
  { key: "currentCompany", label: "Current Company" },
  { key: "currentTitle", label: "Current Title" },
  { key: "yearsOfExperience", label: "Years of Experience" },
  { key: "workAuthorization", label: "Work Authorization", hint: "e.g. US Citizen" },
  { key: "requiresSponsorship", label: "Requires Sponsorship?", hint: "Yes / No" },
  { key: "desiredSalary", label: "Desired Salary" },
  { key: "noticePeriod", label: "Notice Period", hint: "e.g. 2 weeks" },
];

/** Questions that show up on almost every application. Answers stay yours. */
const COMMON_QUESTIONS = [
  "Why do you want to work here?",
  "What are your current role responsibilities?",
  "How much revenue or budget have you managed?",
  "What is your proudest professional achievement?",
  "Why are you leaving your current role?",
  "How do you use AI in your work?",
  "Are you willing to relocate?",
];

interface ResumeMeta {
  name: string;
  size: number;
  uploadedAt: string;
}

function prettySize(bytes: number): string {
  return bytes > 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.round(bytes / 1024)} KB`;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [resume, setResume] = useState<ResumeMeta | null>(null);
  const [saved, setSaved] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [drafting, setDrafting] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api<{ profile: Profile }>("/api/profile").then((d) => setProfile(d.profile));
    api<{ resume: ResumeMeta | null }>("/api/profile/resume").then((d) => setResume(d.resume));
  }, []);

  function set<K extends keyof Profile>(key: K, value: Profile[K]) {
    setProfile((p) => ({ ...p, [key]: value }));
    setSaved(false);
  }

  async function save() {
    await api("/api/profile", { method: "PUT", json: profile });
    setSaved(true);
  }

  async function uploadResume(file: File) {
    setNotice(null);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/profile/resume", { method: "POST", body: form });
      const data = (await res.json()) as { resume?: ResumeMeta; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setResume(data.resume ?? null);
      setNotice({ kind: "ok", text: `Resume saved: ${data.resume?.name}` });
    } catch (err) {
      setNotice({ kind: "err", text: err instanceof Error ? err.message : "Upload failed" });
    }
  }

  async function removeResume() {
    if (!confirm("Remove the stored resume?")) return;
    await api("/api/profile/resume", { method: "DELETE" });
    setResume(null);
  }

  function addCommonQuestions() {
    const existing = new Set(
      profile.customAnswers.map((qa) => qa.question.trim().toLowerCase()),
    );
    const additions = COMMON_QUESTIONS.filter((q) => !existing.has(q.toLowerCase())).map(
      (q) => ({ question: q, answer: "" }),
    );
    if (additions.length) set("customAnswers", [...profile.customAnswers, ...additions]);
  }

  async function draft(i: number) {
    const question = profile.customAnswers[i]?.question.trim();
    if (!question) return;
    setDrafting(i);
    setNotice(null);
    try {
      const { answer } = await api<{ answer: string }>("/api/draft", {
        method: "POST",
        json: { question },
      });
      const next = [...profile.customAnswers];
      next[i] = { ...next[i], answer };
      set("customAnswers", next);
    } catch (err) {
      setNotice({ kind: "err", text: err instanceof Error ? err.message : "Draft failed" });
    } finally {
      setDrafting(null);
    }
  }

  return (
    <div>
      <h1>Autofill Profile</h1>
      <p className="muted">
        The Chrome extension uses this profile to fill application forms (Greenhouse, Lever, and
        similar) — you always review before hitting Submit. Stored locally in your database.
      </p>

      {saved && <div className="notice ok">Profile saved.</div>}
      {notice && <div className={`notice ${notice.kind}`}>{notice.text}</div>}

      <h2>Resume</h2>
      <div className="card">
        {resume ? (
          <div className="row">
            <div>
              <strong>{resume.name}</strong>
              <div className="muted mono" style={{ fontSize: 12, marginTop: 3 }}>
                {prettySize(resume.size)} · uploaded{" "}
                {new Date(resume.uploadedAt).toLocaleDateString()}
              </div>
            </div>
            <div className="spacer" />
            <a className="btn" href="/api/profile/resume?download">
              Download
            </a>
            <button className="btn" onClick={() => fileRef.current?.click()}>
              Replace
            </button>
            <button className="btn danger" onClick={removeResume}>
              Remove
            </button>
          </div>
        ) : (
          <div className="row">
            <span className="muted">
              No resume stored. Upload one and the extension attaches it to application forms
              automatically.
            </span>
            <div className="spacer" />
            <button className="btn primary" onClick={() => fileRef.current?.click()}>
              Upload Resume
            </button>
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.doc,.docx"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadResume(f);
            e.target.value = "";
          }}
        />
      </div>

      <h2>Basics</h2>
      <div className="card">
        <div className="form-grid">
          {FIELDS.map((f) => (
            <div className="field" key={f.key}>
              <label>{f.label}</label>
              <input
                type="text"
                placeholder={f.hint ?? ""}
                value={(profile[f.key] as string) ?? ""}
                onChange={(e) => set(f.key, e.target.value as never)}
              />
            </div>
          ))}
        </div>
        <div className="field" style={{ marginTop: 12 }}>
          <label>Background / About Me</label>
          <textarea
            rows={8}
            placeholder="Paste your resume text plus career facts the AI should know: revenue and budgets managed, team size, key wins, tools you use. This is the source material for drafted answers — it is never sent anywhere except your own Claude API calls."
            value={profile.background}
            onChange={(e) => set("background", e.target.value)}
          />
        </div>
        <div className="field" style={{ marginTop: 12 }}>
          <label>Cover Letter Template</label>
          <textarea
            rows={5}
            placeholder="Optional — used as the starting point when a form asks for a cover letter."
            value={profile.coverLetterTemplate}
            onChange={(e) => set("coverLetterTemplate", e.target.value)}
          />
        </div>
      </div>

      <h2>Standard Question Answers</h2>
      <p className="muted">
        Recurring application questions and your stock answers — the extension matches these
        against form questions. “Draft” writes an answer from your Background with AI; edit it
        into your own words.
      </p>
      <div className="card">
        {profile.customAnswers.map((qa, i) => (
          <div className="row" key={i} style={{ marginBottom: 8, alignItems: "flex-start" }}>
            <input
              type="text"
              placeholder="Question"
              style={{ flex: 1 }}
              value={qa.question}
              onChange={(e) => {
                const next = [...profile.customAnswers];
                next[i] = { ...next[i], question: e.target.value };
                set("customAnswers", next);
              }}
            />
            <textarea
              rows={1}
              placeholder="Answer"
              style={{ flex: 2 }}
              value={qa.answer}
              onChange={(e) => {
                const next = [...profile.customAnswers];
                next[i] = { ...next[i], answer: e.target.value };
                set("customAnswers", next);
              }}
            />
            <button
              className="btn small"
              disabled={drafting !== null || !qa.question.trim()}
              onClick={() => draft(i)}
              title="Draft an answer from your Background with AI"
            >
              {drafting === i ? "Drafting…" : "Draft"}
            </button>
            <button
              className="btn small danger"
              onClick={() =>
                set(
                  "customAnswers",
                  profile.customAnswers.filter((_, idx) => idx !== i),
                )
              }
            >
              ✕
            </button>
          </div>
        ))}
        <div className="row">
          <button
            className="btn"
            onClick={() =>
              set("customAnswers", [...profile.customAnswers, { question: "", answer: "" }])
            }
          >
            + Add Q&amp;A
          </button>
          <button className="btn" onClick={addCommonQuestions}>
            + Add common questions
          </button>
        </div>
      </div>

      <button className="btn primary" onClick={save}>
        Save Profile
      </button>
    </div>
  );
}
