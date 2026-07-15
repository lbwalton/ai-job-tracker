"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { Cols, Resizer, useColWidths } from "@/lib/col-resize";

/* [received, from, subject, category, application, exclude] — 0 = flexible */
const COL_DEFAULTS = [104, 190, 0, 190, 180, 52];

interface InboxEmail {
  id: number;
  jobId: number | null;
  jobCompany: string | null;
  jobJobTitle: string | null;
  fromAddress: string;
  subject: string;
  receivedAt: string;
  category: string;
  confidence: number;
  summary: string;
  suggestedStatus: string | null;
  statusApplied: number;
}

export default function Inbox() {
  const [emails, setEmails] = useState<InboxEmail[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const { widths, startResize, resetCol } = useColWidths("cols:emails", COL_DEFAULTS);

  const load = useCallback(async () => {
    const data = await api<{ emails: InboxEmail[] }>("/api/emails");
    setEmails(data.emails);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function syncNow() {
    setSyncing(true);
    setNotice(null);
    try {
      const data = await api<{ result: { scanned: number; classified: number } }>(
        "/api/gmail/sync",
        { method: "POST" },
      );
      setNotice({
        kind: "ok",
        text: `Scanned ${data.result.scanned}, classified ${data.result.classified} new email(s).`,
      });
      load();
    } catch (err) {
      setNotice({ kind: "err", text: err instanceof Error ? err.message : "Sync failed" });
    } finally {
      setSyncing(false);
    }
  }

  async function review(emailId: number, action: "accept" | "dismiss" | "exclude") {
    await api("/api/emails", { method: "PATCH", json: { emailId, action } });
    load();
  }

  const pending = emails.filter((e) => e.suggestedStatus && !e.statusApplied);

  return (
    <div>
      <div className="row" style={{ marginBottom: 12 }}>
        <h1 style={{ margin: 0 }}>Email Inbox</h1>
        <div className="spacer" />
        <button className="btn primary" onClick={syncNow} disabled={syncing}>
          {syncing ? "Syncing…" : "Sync Gmail Now"}
        </button>
      </div>
      <p className="muted">
        Hiring-team emails are pulled from Gmail, classified by AI, matched to your applications,
        and confident updates are applied automatically. Anything ambiguous lands here for review.
      </p>

      {notice && <div className={`notice ${notice.kind}`}>{notice.text}</div>}

      {pending.length > 0 && (
        <>
          <h2>Needs review ({pending.length})</h2>
          {pending.map((e) => (
            <div className="mailcard" key={e.id}>
              <div className="top">
                <span className="cls">{e.category.replace(/_/g, " ")}</span>
                <span className="when">{new Date(e.receivedAt).toLocaleDateString()}</span>
              </div>
              <div className="subj">{e.subject || "(no subject)"}</div>
              <div className="from">{e.fromAddress}</div>
              <p className="sum">{e.summary}</p>
              {e.jobId ? (
                <>
                  <div className="suggest">
                    Suggests <span className={`badge ${e.suggestedStatus}`}>{e.suggestedStatus}</span>{" "}
                    for{" "}
                    <Link href={`/jobs/${e.jobId}`}>
                      {e.jobCompany} — {e.jobJobTitle}
                    </Link>
                  </div>
                  <div className="acts">
                    <button className="btn primary" onClick={() => review(e.id, "accept")}>
                      Apply
                    </button>
                    <button className="btn" onClick={() => review(e.id, "dismiss")}>
                      Dismiss
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="suggest muted">Not matched to a tracked application.</div>
                  <div className="acts">
                    <button className="btn" onClick={() => review(e.id, "dismiss")}>
                      Dismiss
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </>
      )}

      <h2>All job-related emails ({emails.length})</h2>
      <div className="table-wrap">
        <table className="fixed">
          <Cols widths={widths} />
          <thead>
            <tr>
              {["Received", "From", "Subject", "Category", "Application"].map((label, i) => (
                <th key={label} style={{ cursor: "default" }}>
                  {label}
                  <Resizer i={i} startResize={startResize} resetCol={resetCol} />
                </th>
              ))}
              <th style={{ cursor: "default" }} aria-label="Remove" />
            </tr>
          </thead>
          <tbody>
            {emails.map((e) => (
              <tr key={e.id}>
                <td className="muted">{new Date(e.receivedAt).toLocaleDateString()}</td>
                <td title={e.fromAddress}>
                  {e.fromAddress.replace(/<.*>/, "").trim() || e.fromAddress}
                </td>
                <td title={e.subject}>{e.subject}</td>
                <td>
                  <span className="badge">{e.category.replace(/_/g, " ")}</span>
                </td>
                <td>
                  {e.jobId ? (
                    <Link href={`/jobs/${e.jobId}`}>{e.jobCompany}</Link>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
                <td>
                  <button
                    className="exclude"
                    title="Not job-related — remove from this list"
                    aria-label={`Mark "${e.subject}" as not job-related`}
                    onClick={() => review(e.id, "exclude")}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
            {!emails.length && (
              <tr>
                <td colSpan={6} className="muted" style={{ textAlign: "center", padding: 30 }}>
                  Nothing yet — connect Gmail in Settings, then sync.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
