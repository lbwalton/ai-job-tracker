"use client";

import { useEffect, useState } from "react";
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

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api<{ profile: Profile }>("/api/profile").then((d) => setProfile(d.profile));
  }, []);

  function set<K extends keyof Profile>(key: K, value: Profile[K]) {
    setProfile((p) => ({ ...p, [key]: value }));
    setSaved(false);
  }

  async function save() {
    await api("/api/profile", { method: "PUT", json: profile });
    setSaved(true);
  }

  return (
    <div>
      <h1>Autofill Profile</h1>
      <p className="muted">
        The Chrome extension uses this profile to fill application forms (Greenhouse, Lever, and
        similar) — you always review before hitting Submit. Stored locally in your database.
      </p>

      {saved && <div className="notice ok">Profile saved.</div>}

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
        Recurring application questions (e.g. “Why do you want to work here?”, “Are you willing to
        relocate?”) and your stock answers.
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
        <button
          className="btn"
          onClick={() =>
            set("customAnswers", [...profile.customAnswers, { question: "", answer: "" }])
          }
        >
          + Add Q&amp;A
        </button>
      </div>

      <button className="btn primary" onClick={save}>
        Save Profile
      </button>
    </div>
  );
}
