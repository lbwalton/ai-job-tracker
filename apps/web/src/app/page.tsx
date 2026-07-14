"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { JOB_STATUSES, type Job } from "@jobtrackr/core";
import { api } from "@/lib/client";

const COLUMNS: Array<{ key: string; label: string }> = [
  { key: "company", label: "Company" },
  { key: "jobTitle", label: "Position" },
  { key: "location", label: "Location" },
  { key: "salaryRange", label: "Salary" },
  { key: "dateAdded", label: "Added" },
  { key: "status", label: "Status" },
];

function daysSince(date: string | null): string {
  if (!date) return "—";
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  return days < 0 ? "—" : `${days}d`;
}

function monogram(company: string): string {
  const words = company.replace(/\(.*\)/, "").trim().split(/\s+/);
  return words.length > 1
    ? (words[0][0] + words[1][0]).toUpperCase()
    : company.slice(0, 2).replace(/^(.)(.)/, (_, a, b) => a.toUpperCase() + b.toLowerCase());
}

const RAIL_STAGES = [
  { key: "Saved", label: "SAVED" },
  { key: "Applied", label: "APPLIED" },
  { key: "Assessment", label: "ASSESS" },
  { key: "Interview", label: "INTVW" },
  { key: "Offer", label: "OFFER" },
] as const;

export default function Dashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("dateAdded");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [notice, setNotice] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    params.set("sort", sort);
    params.set("dir", dir);
    const data = await api<{ jobs: Job[] }>(`/api/jobs?${params}`);
    setJobs(data.jobs);
  }, [search, status, sort, dir]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  const stats = useMemo(() => {
    const by = (s: string) => jobs.filter((j) => j.status === s).length;
    const counts = Object.fromEntries(RAIL_STAGES.map((s) => [s.key, by(s.key)]));
    const closed = by("Rejected") + by("Withdrawn");
    return { counts, closed, inPlay: jobs.length - closed };
  }, [jobs]);

  function toggleSort(key: string) {
    if (sort === key) setDir(dir === "asc" ? "desc" : "asc");
    else {
      setSort(key);
      setDir("desc");
    }
  }

  function toggleSelect(id: number) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  async function setJobStatus(id: number, newStatus: string) {
    await api(`/api/jobs/${id}`, { method: "PATCH", json: { status: newStatus } });
    load();
  }

  async function bulk(action: string, extra: Record<string, string> = {}) {
    if (!selected.size) return;
    if (action === "delete" && !confirm(`Delete ${selected.size} job(s)?`)) return;
    await api("/api/jobs/bulk", {
      method: "POST",
      json: { ids: [...selected], action, ...extra },
    });
    setSelected(new Set());
    load();
  }

  async function syncNow() {
    setSyncing(true);
    setNotice(null);
    try {
      const data = await api<{
        result: { classified: number; statusUpdates: Array<{ company: string; toStatus: string }> };
      }>("/api/gmail/sync", { method: "POST" });
      const updates = data.result.statusUpdates;
      setNotice(
        updates.length
          ? `Sync done — ${updates.map((u) => `${u.company} → ${u.toStatus}`).join(", ")}`
          : `Sync done — ${data.result.classified} email(s) classified, no status changes`,
      );
      load();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div>
      <div className="row" style={{ marginBottom: 4 }}>
        <div className="hero">
          <div className="eyebrow">Pipeline</div>
          <div className="big">
            {stats.inPlay} in play
          </div>
        </div>
        <div className="spacer" />
        <button className="btn" onClick={syncNow} disabled={syncing}>
          {syncing ? "Syncing…" : "Sync Gmail"}
        </button>
        <Link href="/add" className="btn primary hide-sm" style={{ display: "inline-block" }}>
          + Add Job
        </Link>
      </div>

      {notice && <div className="notice ok">{notice}</div>}

      <div className="rail">
        <div className="track">
          {RAIL_STAGES.map((s, i) => (
            <span key={s.key} style={{ display: "contents" }}>
              {i > 0 && <span className="seg" />}
              <span
                className={`node ${
                  stats.counts[s.key] > 0 ? "lit" : "zero"
                }`}
              >
                <span className="ct">{stats.counts[s.key]}</span>
                <span className="pip" />
                <span className="nm">{s.label}</span>
              </span>
            </span>
          ))}
        </div>
        {stats.closed > 0 && <div className="closed">+{stats.closed} CLOSED</div>}
      </div>

      <div className="toolbar">
        <input
          type="text"
          placeholder="Search company, title, location…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 150 }}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {JOB_STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        {selected.size > 0 && (
          <>
            <span className="muted">{selected.size} selected</span>
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) bulk("updateStatus", { status: e.target.value });
                e.target.value = "";
              }}
            >
              <option value="" disabled>
                Set status…
              </option>
              {JOB_STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <button className="btn danger" onClick={() => bulk("delete")}>
              Delete
            </button>
          </>
        )}
      </div>

      <div className="jobcards">
        {jobs.map((j) => (
          <div className="jobcard" key={j.id}>
            <Link href={`/jobs/${j.id}`} className="mono-tile">
              {monogram(j.company)}
            </Link>
            <Link href={`/jobs/${j.id}`} style={{ minWidth: 0 }}>
              <div className="co">{j.company}</div>
              <div className="role">{j.jobTitle}</div>
              <div className="meta">
                {(j.location ?? "—").toUpperCase()}
                {j.salaryRange ? (
                  <>
                    {" "}
                    · <b>{j.salaryRange.replace(/\(.*\)/, "").trim()}</b>
                  </>
                ) : null}{" "}
                · {daysSince(j.dateApplied ?? j.dateAdded)}
              </div>
            </Link>
            <select
              value={j.status}
              onChange={(e) => setJobStatus(j.id, e.target.value)}
              className={`stamp ${j.status}`}
              aria-label={`Status for ${j.company}`}
            >
              {JOB_STATUSES.includes(j.status as (typeof JOB_STATUSES)[number]) ? null : (
                <option>{j.status}</option>
              )}
              {JOB_STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        ))}
        {!jobs.length && (
          <div className="card muted" style={{ textAlign: "center" }}>
            No applications yet — tap + to add your first one.
          </div>
        )}
      </div>

      <div className="table-wrap jobs-table">
        <table>
          <thead>
            <tr>
              <th style={{ cursor: "default" }}>
                <input
                  type="checkbox"
                  checked={selected.size > 0 && selected.size === jobs.length}
                  onChange={(e) =>
                    setSelected(e.target.checked ? new Set(jobs.map((j) => j.id)) : new Set())
                  }
                />
              </th>
              {COLUMNS.map((c) => (
                <th key={c.key} onClick={() => toggleSort(c.key)}>
                  {c.label} {sort === c.key ? (dir === "asc" ? "↑" : "↓") : ""}
                </th>
              ))}
              <th style={{ cursor: "default" }}>Days</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selected.has(j.id)}
                    onChange={() => toggleSelect(j.id)}
                  />
                </td>
                <td>
                  <Link href={`/jobs/${j.id}`}>{j.company}</Link>
                </td>
                <td className="wrap">{j.jobTitle}</td>
                <td className="wrap">{j.location ?? "—"}</td>
                <td>{j.salaryRange ?? "—"}</td>
                <td>{j.dateAdded}</td>
                <td>
                  <select
                    value={j.status}
                    onChange={(e) => setJobStatus(j.id, e.target.value)}
                    className={`badge ${j.status}`}
                    style={{ border: "none", padding: "2px 8px" }}
                  >
                    {JOB_STATUSES.includes(j.status as (typeof JOB_STATUSES)[number]) ? null : (
                      <option>{j.status}</option>
                    )}
                    {JOB_STATUSES.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </td>
                <td className="muted">{daysSince(j.dateApplied ?? j.dateAdded)}</td>
              </tr>
            ))}
            {!jobs.length && (
              <tr>
                <td colSpan={8} className="muted" style={{ textAlign: "center", padding: 30 }}>
                  No applications yet — add one, capture from the extension, or import your v1 backup in Settings.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
